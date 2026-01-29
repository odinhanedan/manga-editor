let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
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

async function runOCR() {
    if (!mangaPage.src) { alert("Önce resim yükleyin!"); return; }
    pageInfo.innerText = "🌀 Tori AI Analiz Ediyor...";
    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        const apiResponse = await fetch('https://api.toriitranslate.com/api/v2/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORI_API_KEY}`, 'target_lang': 'en', 'translator': 'gemini-2.5-flash' },
            body: formData
        });
        const result = await apiResponse.json();
        if (result.text) {
            result.text.forEach(obj => {
                createToriOverlay(obj.text, [obj.x - obj.width/2, obj.y - obj.height/2, obj.x + obj.width/2, obj.y + obj.height/2]);
            });
            alert("Başarılı!");
        }
    } catch (error) { alert("Bağlantı hatası!"); }
    finally { pageInfo.innerText = `${currentIndex + 1} / ${images.length}`; }
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

// 🎯 EKRANIN ORTASINA EKLEME VE ŞEFFAFLIK
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'New Text';
    const rect = canvas.getBoundingClientRect();
    let finalX = (window.innerWidth / 2) - rect.left - 75;
    let finalY = (window.innerHeight / 2) - rect.top - 20;
    div.style.left = finalX + 'px';
    div.style.top = finalY + 'px';
    div.style.backgroundColor = 'transparent'; // ŞEFFAF
    div.style.border = '1px dashed #007bff'; // Yerini gör diye ince çizgi
    div.style.width = '150px';
    div.style.minHeight = '40px';
    div.style.zIndex = '9999';
    setupDraggable(div);
    canvas.appendChild(div);
}

// 🎯 JSON ÇIKTISI ALMA
function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    if (overlays.length === 0) { alert("Metin yok!"); return; }
    let data = { 
        imageName: images[currentIndex] ? images[currentIndex].name : "page", 
        translations: [] 
    };
    overlays.forEach(el => {
        data.translations.push({ text: el.innerText, x: el.style.left, y: el.style.top });
    });
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cevirisayfa_${currentIndex + 1}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
