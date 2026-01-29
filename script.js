let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
// Yeni API Anahtarın güncellendi
const TORI_API_KEY = "sk_torii_oBDbX2U7t4kIU-ol7ZgSZfxRNuoqUokCc87fNS1qoTo"; 

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

// 🚀 TORI AI İLE TARAMA FONKSİYONU (V2 - İngilizce Ayarlı)
async function runOCR() {
    if (!mangaPage.src) { alert("Önce resim yükle!"); return; }
    
    pageInfo.innerText = "🧠 Tori AI Analiz Ediyor...";

    const response = await fetch(mangaPage.src);
    const imageBlob = await response.blob();
    
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');

    // Dokümantasyondaki gibi V2 Translate Endpoint'ini kullanıyoruz
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${TORI_API_KEY}`);
    headers.append('target_lang', 'en'); // İngilizce çıktı
    headers.append('translator', 'gemini-2.5-flash');
    headers.append('font', 'wildwords');

    try {
        const apiResponse = await fetch('https://api.toriitranslate.com/api/v2/upload', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const result = await apiResponse.json();
        
        if (result.text) {
            result.text.forEach(obj => {
                createToriOverlay(obj.text, [obj.x - obj.width/2, obj.y - obj.height/2, obj.x + obj.width/2, obj.y + obj.height/2]);
            });
            alert("Tori AI taramayı başarıyla bitirdi!");
        } else {
            alert("Sonuç alınamadı. Anahtarını veya kredini kontrol et.");
        }
    } catch (error) {
        console.error("Tori Hatası:", error);
        alert("Bağlantı hatası.");
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
    div.style.minHeight = '20px';

    setupDraggable(div);
    canvas.appendChild(div);
}

// 🛠️ DÜZELTİLMİŞ SÜRÜKLEME VE SİLME
function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; }
        
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        function moveAt(clientX, clientY) {
            let canvasRect = canvas.getBoundingClientRect();
            let newX = clientX - canvasRect.left - shiftX;
            let newY = clientY - canvasRect.top - shiftY;
            div.style.left = newX + 'px';
            div.style.top = newY + 'px';
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

// 🛠️ DÜZELTİLMİŞ METİN EKLEME
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'New Text';
    
    // Görünür olması için varsayılan boyutlar ekledik
    div.style.left = '50px';
    div.style.top = '50px';
    div.style.width = '150px';
    div.style.minHeight = '40px';
    div.style.padding = '5px';
    div.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    div.style.border = '1px dashed #000';

    setupDraggable(div);
    canvas.appendChild(div);
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    let data = { 
        imageName: images[currentIndex].name, 
        originalWidth: mangaPage.naturalWidth,
        translations: [] 
    };
    overlays.forEach(el => {
        data.translations.push({ 
            text: el.innerText, 
            x: el.style.left, 
            y: el.style.top,
            w: el.style.width
        });
    });
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `translated_${currentIndex + 1}.json`;
    link.click();
}
