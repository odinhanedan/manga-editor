let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let cleanPage = document.getElementById('cleanPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
const TORI_API_KEY = "sk_torii_6DIEdOZ5FrET6NCTLktqqOuLcZER9NKeo2NNsOwDhME"; 

imageLoader.addEventListener('change', function(e) {
    images = Array.from(e.target.files);
    if (images.length > 0) { currentIndex = 0; loadPage(currentIndex); }
});

function loadPage(index) {
    // Sayfa değişince her şeyi sıfırla
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());
    cleanPage.style.display = 'none';
    cleanPage.src = "";
    cleanPage.style.opacity = '1';
    
    let reader = new FileReader();
    reader.onload = (e) => { 
        mangaPage.src = e.target.result; 
        mangaPage.style.display = 'block'; 
    };
    reader.readAsDataURL(images[index]);
    pageInfo.innerText = `${index + 1} / ${images.length}`;
}

async function runOCR() {
    if (!mangaPage.src) return;
    pageInfo.innerText = "🌀 Tori AI Temizliyor...";
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());

    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        
        const apiResponse = await fetch('https://api.toriitranslate.com/api/v2/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORI_API_KEY}`, 'target_lang': 'tr' },
            body: formData
        });

        const result = await apiResponse.json();
        console.log("Tori Yanıtı Analiz Edildi:", result);

        // 🎯 KRİTİK DÜZELTME: Senin logundaki isme (inpainted) göre eşitledik
        if (result.inpainted) {
            cleanPage.src = result.inpainted;
            cleanPage.style.display = 'block';
            cleanPage.style.zIndex = "1"; // Resim arka planda kalsın
            console.log("Temiz resim katmana yerleşti.");
        }

        // Metinleri ekle
        if (result.text) {
            result.text.forEach(obj => {
                // Sadece çeviriyi bas (Çift metin sorununu çözer)
                createToriOverlay(obj.text, [
                    obj.x - obj.width/2, 
                    obj.y - obj.height/2, 
                    obj.x + obj.width/2, 
                    obj.y + obj.height/2
                ]);
            });
        }
    } catch (error) { 
        console.error("Hata:", error);
        alert("API Hatası!"); 
    } finally { 
        pageInfo.innerText = `${currentIndex + 1} / ${images.length}`; 
    }
}

function createToriOverlay(text, box) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;
    
    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;
    
    div.style.left = (box[0] * scaleX) + 'px';
    div.style.top = (box[1] * scaleY) + 'px';
    div.style.width = ((box[2] - box[0]) * scaleX) + 'px';
    div.style.zIndex = "100"; // Metin kutuları her zaman en üstte
    
    setupDraggable(div);
    canvas.appendChild(div);
}

// 🎯 METİN EKLEME BUTONU TAMİRİ
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Yeni Metin';
    
    // Resmin görünür alanına ekle
    div.style.left = '50px';
    div.style.top = '50px';
    div.style.zIndex = "101"; // Temiz resmin (1) ve diğer metinlerin (100) üstünde
    div.style.border = "1px dashed red"; // Nerede olduğunu gör diye
    
    setupDraggable(div);
    canvas.appendChild(div);
    console.log("Yeni metin kutusu eklendi.");
}

function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; }
        let cRect = canvas.getBoundingClientRect();
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;
        
        document.onmousemove = function(e) {
            div.style.left = (e.clientX - cRect.left - shiftX) + 'px';
            div.style.top = (e.clientY - cRect.top - shiftY) + 'px';
        };
        
        document.onmouseup = function() {
            document.onmousemove = null;
        };
    };
}

function toggleCleanView() {
    // Görünürlüğü (opacity) 0 ile 1 arasında değiştir
    cleanPage.style.opacity = (cleanPage.style.opacity === '0') ? '1' : '0';
    console.log("Katman değiştirildi.");
}

function downloadJPG() {
    if (!cleanPage.src) { alert("Önce temiz resim lazım!"); return; }
    let a = document.createElement('a');
    a.href = cleanPage.src;
    a.download = "temizlenmis_manga.jpg";
    a.click();
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    const cRect = canvas.getBoundingClientRect();
    let data = { translations: [] };
    
    overlays.forEach(el => {
        data.translations.push({
            text: el.innerText,
            x: ((parseFloat(el.style.left) / cRect.width) * 100).toFixed(2) + "%",
            y: ((parseFloat(el.style.top) / cRect.height) * 100).toFixed(2) + "%"
        });
    });
    
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "madara_uyumlu.json";
    link.click();
}
