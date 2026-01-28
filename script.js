let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;

// DOSYA YÜKLEME SİSTEMİ
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

// ORTAK SÜRÜKLEME SİSTEMİ
function setupDraggable(div) {
    div.onmousedown = function(e) {
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        function moveAt(clientX, clientY) {
            let canvasRect = canvas.getBoundingClientRect();
            div.style.left = (clientX - canvasRect.left - shiftX) + 'px';
            div.style.top = (clientY - canvasRect.top - shiftY) + 'px';
        }

        function onMouseMove(e) { moveAt(e.clientX, e.clientY); }
        document.addEventListener('mousemove', onMouseMove);

        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
    };
    div.ondragstart = function() { return false; };
}

// MANUEL METİN EKLEME
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Yazı Yazın';
    
    // Ekranın ortasına yerleştir
    div.style.left = '50%';
    div.style.top = '50%';

    setupDraggable(div);
    canvas.appendChild(div);
}

// 🚀 AI İLE TARAMA (İNGİLİZCE)
async function runOCR() {
    if (!mangaPage.src) { alert("Önce bir resim yüklemelisin!"); return; }
    
    let oldText = pageInfo.innerText;
    pageInfo.innerText = "🤖 AI Tarıyor...";

    try {
        // İngilizce (eng) için worker oluşturuluyor
        const { createWorker } = Tesseract;
        const worker = await createWorker('eng');
        const { data: { blocks } } = await worker.recognize(mangaPage.src);
        
        blocks.forEach(block => {
            if (block.text.trim().length > 1) {
                createAutoOverlay(block.text, block.bbox);
            }
        });

        await worker.terminate();
        pageInfo.innerText = oldText;
        alert("İngilizce metinler başarıyla yakalandı!");
    } catch (error) {
        console.error("AI Hatası:", error);
        pageInfo.innerText = "Hata!";
        alert("Yapay zeka şu an çalışamıyor. Konsolu (F12) kontrol et.");
    }
}

function createAutoOverlay(text, bbox) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;

    // AI'dan gelen koordinatları ayarla
    div.style.left = bbox.x0 + 'px';
    div.style.top = bbox.y0 + 'px';
    div.style.minWidth = (bbox.x1 - bbox.x0) + 'px';

    setupDraggable(div);
    canvas.appendChild(div);
}

// JSON ÇIKTISI ALMA
function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    if (overlays.length === 0) { alert("Metin yok!"); return; }

    let data = {
        imageName: images[currentIndex].name,
        translations: []
    };

    overlays.forEach(el => {
        data.translations.push({
            text: el.innerText,
            x: el.style.left,
            y: el.style.top
        });
    });

    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `data_sayfa_${currentIndex + 1}.json`;
    link.click();
}
