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
    
    // Sayfanın ortasına yerleştir
    div.style.left = '50%';
    div.style.top = '20%';

    setupDraggable(div);
    canvas.appendChild(div);
}

// 🚀 AI İLE TARAMA (İNGİLİZCE VE GELİŞMİŞ KOORDİNAT)
async function runOCR() {
    if (!mangaPage.src) { alert("Önce bir resim yüklemelisin!"); return; }
    
    let oldText = pageInfo.innerText;
    pageInfo.innerText = "🤖 AI Analiz Ediyor (Satır Satır)...";

    try {
        const worker = await Tesseract.createWorker('eng');
        const { data } = await worker.recognize(mangaPage.src);
        
        // 'lines' kullanarak metinleri ayrı ayrı kutulara bölüyoruz
        data.lines.forEach(line => {
            if (line.text.trim().length > 1) {
                createAutoOverlay(line.text, line.bbox);
            }
        });

        await worker.terminate();
        pageInfo.innerText = oldText;
        alert("Tarama Tamamlandı!");
    } catch (error) {
        console.error("AI Hatası:", error);
        pageInfo.innerText = "Hata!";
        alert("AI şu an çalışamıyor.");
    }
}

// AI KUTULARINI RESİM ÜZERİNE OTURTMA
function createAutoOverlay(text, bbox) {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = text;

    // Ölçeklendirme hesabı: Resim ekranda küçültülmüş olsa bile doğru yeri bulur
    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;

    div.style.left = (bbox.x0 * scaleX) + 'px';
    div.style.top = (bbox.y0 * scaleY) + 'px';
    div.style.minWidth = ((bbox.x1 - bbox.x0) * scaleX) + 'px';

    setupDraggable(div);
    canvas.appendChild(div);
}

// JSON ÇIKTISI ALMA (GELİŞMİŞ)
function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    if (overlays.length === 0) { alert("Dışa aktarılacak metin yok!"); return; }

    let currentFileName = images[currentIndex] ? images[currentIndex].name : "manga_sayfa";
    let data = {
        imageName: currentFileName,
        translations: []
    };

    overlays.forEach(el => {
        // WordPress'e aktarırken sorun çıkmaması için yüzdelik (%) olarak kaydeder
        let xPercent = (parseFloat(el.style.left) / mangaPage.clientWidth) * 100;
        let yPercent = (parseFloat(el.style.top) / mangaPage.clientHeight) * 100;

        data.translations.push({
            text: el.innerText,
            x: xPercent.toFixed(2) + "%",
            y: yPercent.toFixed(2) + "%"
        });
    });

    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentFileName.split('.')[0]}_data.json`;
    link.click();
}
