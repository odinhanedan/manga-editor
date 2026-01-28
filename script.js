let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
const TORI_API_KEY = "sk_torii_S92NwQQBuoBt-3oJBrukiuPX3w7YmH5LbGSa-jbecA4"; // Senin anahtarın

imageLoader.addEventListener('change', function(e) {
    images = Array.from(e.target.files);
    if (images.length > 0) {
        currentIndex = 0;
        loadPage(currentIndex);
    }
});

function loadPage(index) {
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());
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

// 🚀 TORI AI İLE TARAMA FONKSİYONU
async function runOCR() {
    if (!mangaPage.src) { alert("Önce resim yükle!"); return; }
    
    pageInfo.innerText = "🧠 Tori AI Analiz Ediyor...";

    // Resmi API'nin anlayacağı formata (Blob) çeviriyoruz
    const response = await fetch(mangaPage.src);
    const imageBlob = await response.blob();
    
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');

    try {
        // Tori API Endpoint'ine istek atıyoruz
        const apiResponse = await fetch('https://api.torii-translate.com/v1/ocr', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TORI_API_KEY}`
            },
            body: formData
        });

        const result = await apiResponse.json();
        
        if (result.blocks) {
            result.blocks.forEach(block => {
                // Tori her balonu ayrı bir blok olarak gönderir
                createToriOverlay(block.text, block.box);
            });
            alert("Tori AI taramayı başarıyla bitirdi!");
        } else {
            alert("Tori'den sonuç alınamadı. API limitini veya bağlantıyı kontrol et.");
        }
    } catch (error) {
        console.error("Tori Hatası:", error);
        alert("Bağlantı hatası oluştu.");
    } finally {
        pageInfo.innerText = `${currentIndex + 1} / ${images.length}`;
    }
}

// TORI'DEN GELEN VERİYİ EKRANA DİZME
function createToriOverlay(text, box) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;

    // Resmin ekrandaki gerçek boyutuna göre oranlama
    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;

    // box: [x_min, y_min, x_max, y_max] formatındadır
    div.style.left = (box[0] * scaleX) + 'px';
    div.style.top = (box[1] * scaleY) + 'px';
    div.style.width = ((box[2] - box[0]) * scaleX) + 'px';

    setupDraggable(div);
    canvas.appendChild(div);
}

// Ortak Sürükleme ve Silme Özelliği
function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; } // CTRL + Tık yaparsan hatalı kutuyu siler
        
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        function moveAt(clientX, clientY) {
            let canvasRect = canvas.getBoundingClientRect();
            div.style.left = (clientX - canvasRect.left - shiftX) + 'px';
            div.style.top = (clientY - canvasRect.top - shiftY) + 'px';
        }

        document.addEventListener('mousemove', onMouseMove);
        function onMouseMove(e) { moveAt(e.clientX, e.clientY); }

        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    };
    div.ondragstart = function() { return false; };
}

// Manuel Metin Ekleme
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Çeviri Buraya';
    div.style.left = '50%';
    div.style.top = '50%';
    setupDraggable(div);
    canvas.appendChild(div);
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    let data = { imageName: images[currentIndex].name, translations: [] };
    overlays.forEach(el => {
        data.translations.push({ text: el.innerText, x: el.style.left, y: el.style.top });
    });
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cevirisayfa_${currentIndex + 1}.json`;
    link.click();
}
