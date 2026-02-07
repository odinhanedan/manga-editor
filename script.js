let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let cleanPage = document.getElementById('cleanPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
// YENİ API ANAHTARI
const TORI_API_KEY = "sk_torii_6DIEdOZ5FrET6NCTLktqqOuLcZER9NKeo2NNsOwDhME"; 

imageLoader.addEventListener('change', function(e) {
    images = Array.from(e.target.files);
    if (images.length > 0) {
        currentIndex = 0;
        loadPage(currentIndex);
    }
});

function loadPage(index) {
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());
    cleanPage.style.display = 'none';
    cleanPage.src = "";
    
    let reader = new FileReader();
    reader.onload = function(event) {
        mangaPage.src = event.target.result;
        mangaPage.style.display = 'block';
        pageInfo.innerText = `${index + 1} / ${images.length}`;
    }
    reader.readAsDataURL(images[index]);
}

function nextPage() { if (currentIndex < images.length - 1) { currentIndex++; loadPage(currentIndex); } }
function prevPage() { if (currentIndex > 0) { currentIndex--; loadPage(currentIndex); } }

async function runOCR() {
    if (!mangaPage.src) { alert("Önce resim yükleyin!"); return; }
    pageInfo.innerText = "🌀 Tori AI Temizliyor ve Çeviriyor...";
    
    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        
        const apiResponse = await fetch('https://api.toriitranslate.com/api/v2/upload', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${TORI_API_KEY}`,
                'target_lang': 'tr' // Türkçeye çevirir
            },
            body: formData
        });

        const result = await apiResponse.json();

        // 🎯 TEMİZ RESMİ AL VE ÜSTE KOY
        if (result.inpainted_image) {
            cleanPage.src = result.inpainted_image;
            cleanPage.style.display = 'block';
        }

        if (result.text) {
            result.text.forEach(obj => {
                createToriOverlay(obj.text, [obj.x - obj.width/2, obj.y - obj.height/2, obj.x + obj.width/2, obj.y + obj.height/2]);
            });
            alert("İşlem Tamamlandı!");
        }
    } catch (error) { alert("Bağlantı hatası veya API limiti!"); }
    finally { pageInfo.innerText = `${currentIndex + 1} / ${images.length}`; }
}

// 👁️ GÖZ BUTONU: TEMİZ RESMİ AÇ/KAPAT
function toggleCleanView() {
    const btn = document.getElementById('toggleBtn');
    if (cleanPage.style.opacity === '0') {
        cleanPage.style.opacity = '1';
        btn.innerText = "👁️ Orijinali Gör";
    } else {
        cleanPage.style.opacity = '0';
        btn.innerText = "👁️ Temizlenmişi Gör";
    }
}

// 📥 JPG OLARAK İNDİR
function downloadJPG() {
    if (!cleanPage.src) { alert("Önce AI ile tarama yapmalısın!"); return; }
    const link = document.createElement('a');
    link.href = cleanPage.src;
    link.download = `temiz_${images[currentIndex].name.split('.')[0]}.jpg`;
    link.click();
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
    div.style.zIndex = "10"; // Metinler temiz resmin üstünde kalmalı
    
    setupDraggable(div);
    canvas.appendChild(div);
}

function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; }
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;
        function moveAt(clientX, clientY) {
            let cRect = canvas.getBoundingClientRect();
            div.style.left = (clientX - cRect.left - shiftX) + 'px';
            div.style.top = (clientY - cRect.top - shiftY) + 'px';
        }
        function onMouseMove(e) { moveAt(e.clientX, e.clientY); }
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = function() { document.removeEventListener('mousemove', onMouseMove); document.onmouseup = null; };
    };
    div.ondragstart = () => false;
}

function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Yeni Metin';
    div.style.left = '50%';
    div.style.top = '50%';
    div.style.backgroundColor = 'transparent';
    div.style.border = '1px dashed #007bff';
    div.style.zIndex = "10";
    setupDraggable(div);
    canvas.appendChild(div);
}

// 🎯 JSON ÇIKTISI - MADARA UYUMLU % HESAPLAMA
function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    const containerRect = canvas.getBoundingClientRect();
    
    let data = { 
        imageName: images[currentIndex] ? images[currentIndex].name : "page", 
        translations: [] 
    };

    overlays.forEach(el => {
        // Piksel değerlerini sayıya çevir
        let pxX = parseFloat(el.style.left);
        let pxY = parseFloat(el.style.top);

        // Yüzde hesapla (%)
        let percentX = (pxX / containerRect.width) * 100;
        let percentY = (pxY / containerRect.height) * 100;

        data.translations.push({ 
            text: el.innerText, 
            x: percentX.toFixed(2) + "%", 
            y: percentY.toFixed(2) + "%" 
        });
    });

    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `madara_cevirisayfa_${currentIndex + 1}.json`;
    link.click();
}
