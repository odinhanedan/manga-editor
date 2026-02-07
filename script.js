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
    if (images.length > 0) {
        currentIndex = 0;
        loadPage(currentIndex);
    }
});

function loadPage(index) {
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());
    cleanPage.style.display = 'none';
    cleanPage.src = "";
    cleanPage.style.opacity = '1';
    
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
    pageInfo.innerText = "🌀 Tori AI Analiz Ediyor...";
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());

    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        
        // Tori Translate API (Temiz resim için v2/upload şart)
        const apiResponse = await fetch('https://api.toriitranslate.com/api/v2/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORI_API_KEY}`, 'target_lang': 'tr' },
            body: formData
        });

        const result = await apiResponse.json();
        console.log("Tori Yanıtı:", result);

        // 1. TEMİZ RESİM (Eğer Tori gönderirse)
        if (result.inpainted_image || result.res_image) {
            cleanPage.src = result.inpainted_image || result.res_image;
            cleanPage.style.display = 'block';
        }

        // 2. METİN İŞLEME (paragraphs veya text)
        const items = result.text || result.paragraphs || [];
        items.forEach(obj => {
            let x, y, w, h;
            if (obj.boundingBox) { // Dökümandaki [x1,y1,x2,y2,x3,y3,x4,y4]
                x = obj.boundingBox[0];
                y = obj.boundingBox[1];
                w = obj.boundingBox[2] - obj.boundingBox[0];
                h = obj.boundingBox[5] - obj.boundingBox[1];
            } else { // Normal x,y,w,h
                x = obj.x - (obj.width / 2);
                y = obj.y - (obj.height / 2);
                w = obj.width; h = obj.height;
            }
            createToriOverlay(obj.text, [x, y, x + w, y + h]);
        });
        alert("İşlem tamam!");
    } catch (error) { console.error(error); alert("Bağlantı hatası!"); }
    finally { pageInfo.innerText = `${currentIndex + 1} / ${images.length}`; }
}

function createToriOverlay(text, box) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;
    
    // Resim ölçeklendirme hesabı
    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;
    
    div.style.left = (box[0] * scaleX) + 'px';
    div.style.top = (box[1] * scaleY) + 'px';
    div.style.width = ((box[2] - box[0]) * scaleX) + 'px';
    div.style.zIndex = "100"; // Metinleri en üste çektik
    
    setupDraggable(div);
    canvas.appendChild(div);
}

function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Yeni Metin';
    // Ekranın ortasına düzgünce koy
    div.style.left = '50%';
    div.style.top = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.zIndex = "100";
    div.style.border = "1px dashed #007bff";
    setupDraggable(div);
    canvas.appendChild(div);
}

function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; }
        let cRect = canvas.getBoundingClientRect();
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        function moveAt(clientX, clientY) {
            div.style.left = (clientX - cRect.left - shiftX) + 'px';
            div.style.top = (clientY - cRect.top - shiftY) + 'px';
            div.style.transform = 'none'; // Manuel taşımada orta hizalamayı boz
        }

        function onMouseMove(e) { moveAt(e.clientX, e.clientY); }
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    };
    div.ondragstart = () => false;
}

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

function downloadJPG() {
    if (!cleanPage.src) { alert("Önce AI ile tarama yapmalısın!"); return; }
    const link = document.createElement('a');
    link.href = cleanPage.src;
    link.download = `temiz_${Date.now()}.jpg`;
    link.click();
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    const containerRect = canvas.getBoundingClientRect();
    let data = { imageName: images[currentIndex]?.name || "page", translations: [] };

    overlays.forEach(el => {
        let pxX = parseFloat(el.style.left);
        let pxY = parseFloat(el.style.top);
        data.translations.push({ 
            text: el.innerText, 
            x: ((pxX / containerRect.width) * 100).toFixed(2) + "%", 
            y: ((pxY / containerRect.height) * 100).toFixed(2) + "%" 
        });
    });

    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `madara_cevirisayfa.json`;
    link.click();
}
