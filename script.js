let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;

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

// ORTAK SÜRÜKLEME FONKSİYONU
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

    let rect = canvas.getBoundingClientRect();
    let spawnX = (window.innerWidth / 2) - rect.left;
    let spawnY = (window.innerHeight / 2) - rect.top;

    div.style.left = spawnX + 'px';
    div.style.top = spawnY + 'px';

    setupDraggable(div);
    canvas.appendChild(div);
}

// AI İLE TARAMA FONKSİYONU
async function runOCR() {
    if (!mangaPage.src) { alert("Önce bir resim yüklemelisin!"); return; }
    
    const statusLabel = document.getElementById('pageInfo');
    const originalText = statusLabel.innerText;
    statusLabel.innerText = "Yapay Zeka Tarıyor... Lütfen Bekleyin...";

    try {
        // 'jpn' olan yeri 'eng' (English) olarak güncelledik
        const worker = await Tesseract.createWorker('eng'); 
        const { data: { blocks } } = await worker.recognize(mangaPage.src);
        
        blocks.forEach(block => {
            // Sadece anlamlı metinleri (boşluk olmayanları) ekle
            if (block.text.trim().length > 0) {
                createAutoOverlay(block.text, block.bbox);
            }
        });

        await worker.terminate();
        statusLabel.innerText = originalText;
        alert("İngilizce tarama bitti! Balonlar bulundu.");
    } catch (error) {
        console.error("OCR Hatası:", error);
        statusLabel.innerText = "Hata oluştu!";
    }
}

// AI'DAN GELEN VERİLERİ EKRANA DİZME
function createAutoOverlay(text, bbox) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;

    // AI'nın bulduğu yerlere yerleştir
    div.style.left = bbox.x0 + 'px';
    div.style.top = bbox.y0 + 'px';
    
    // Genişlik ve yükseklik ayarı (AI'nın bulduğu balon boyutuna göre)
    div.style.minWidth = (bbox.x1 - bbox.x0) + 'px';

    setupDraggable(div);
    canvas.appendChild(div);
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    if (overlays.length === 0) { alert("Önce metin eklemelisin!"); return; }

    let currentFileName = images[currentIndex].name;
    let data = {
        imageName: currentFileName,
        pageNumber: currentIndex + 1,
        translations: []
    };

    overlays.forEach(el => {
        let x = (parseFloat(el.style.left) / mangaPage.clientWidth) * 100;
        let y = (parseFloat(el.style.top) / mangaPage.clientHeight) * 100;
        data.translations.push({
            text: el.innerText,
            x: x.toFixed(2) + "%",
            y: y.toFixed(2) + "%"
        });
    });

    let jsonContent = JSON.stringify(data, null, 2);
    let blob = new Blob([jsonContent], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.download = `${currentFileName.split('.')[0]}_data.json`;
    link.href = url;
    link.click();
}


