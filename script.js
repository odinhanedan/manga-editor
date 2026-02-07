let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let cleanPage = document.getElementById('cleanPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;

// GÜNCEL API ANAHTARIN VE URL
const TORI_API_KEY = "sk_torii_6DIEdOZ5FrET6NCTLktqqOuLcZER9NKeo2NNsOwDhME";
const TORI_URL = 'https://api.toriitranslate.com/api/v2/upload';

// 1. Resimleri Yükleme ve Sayfalama
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

// 2. ANA AI İŞLEMİ (OCR + ÇEVİRİ + TEMİZLEME)
async function runOCR() {
    if (!mangaPage.src) { alert("Önce resim yükleyin!"); return; }
    pageInfo.innerText = "🌀 Tori AI Analiz Ediyor...";
    
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());

    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        
        const apiResponse = await fetch(TORI_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${TORI_API_KEY}`,
                'target_lang': 'tr' // Türkçeye çevirir
            },
            body: formData
        });

        const result = await apiResponse.json();
        console.log("Tori'den Gelen Yanıt:", result);

        // --- TEMİZ RESİM (INPAINTING) KATMANI ---
        // Tori bazen 'inpainted_image' bazen 'res_image' olarak gönderir
        let cleanUrl = result.inpainted_image || result.res_image;
        if (cleanUrl) {
            cleanPage.src = cleanUrl;
            cleanPage.style.display = 'block';
        }

        // --- METİN VE BALON İŞLEME ---
        // Tori dökümandaki gibi 'paragraphs' veya 'text' gönderebilir
        const texts = result.text || result.paragraphs;

        if (texts && Array.isArray(texts)) {
            texts.forEach(obj => {
                let x, y, w, h;

                // Koordinat yapısını dökümana göre kontrol et
                if (obj.boundingBox && Array.isArray(obj.boundingBox)) {
                    // [x1, y1, x2, y2, x3, y3, x4, y4] formatı
                    x = obj.boundingBox[0];
                    y = obj.boundingBox[1];
                    w = obj.boundingBox[2] - obj.boundingBox[0];
                    h = obj.boundingBox[5] - obj.boundingBox[1];
                } else {
                    // {x, y, width, height} merkezi koordinat formatı
                    x = obj.x - (obj.width / 2);
                    y = obj.y - (obj.height / 2);
                    w = obj.width;
                    h = obj.height;
                }

                createToriOverlay(obj.text, [x, y, x + w, y + h]);
            });
            alert("Tebrikler! Çeviri ve Temizleme Başarılı.");
        }
    } catch (error) { 
        console.error("Sistemsel Hata:", error);
        alert("Bağlantı kurulamadı, API anahtarını veya interneti kontrol et!"); 
    } finally { 
        pageInfo.innerText = `${currentIndex + 1} / ${images.length}`; 
    }
}

// 3. Katman Geçişi (Göz Butonu)
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

// 4. Balon Oluşturma
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
    div.style.zIndex = "10";
    
    setupDraggable(div);
    canvas.appendChild(div);
}

// 5. Sürükle Bırak
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
        document.onmouseup = function() { 
            document.removeEventListener('mousemove', onMouseMove); 
            document.onmouseup = null; 
        };
    };
    div.ondragstart = () => false;
}

// 6. JPG İndirme
function downloadJPG() {
    if (!cleanPage.src) { alert("Önce temizlenmiş resmi almalısın!"); return; }
    const link = document.createElement('a');
    link.href = cleanPage.src;
    link.download = `temiz_${images[currentIndex].name.split('.')[0]}.jpg`;
    link.click();
}

// 7. Manuel Metin Ekleme
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Metin...';
    div.style.left = '50%';
    div.style.top = '50%';
    div.style.zIndex = "10";
    setupDraggable(div);
    canvas.appendChild(div);
}

// 8. JSON ÇIKTISI (MADARA UYUMLU %)
function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    const containerRect = canvas.getBoundingClientRect();
    
    let data = { 
        imageName: images[currentIndex] ? images[currentIndex].name : "page", 
        translations: [] 
    };

    overlays.forEach(el => {
        let pxX = parseFloat(el.style.left);
        let pxY = parseFloat(el.style.top);

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
    link.download = `cevirisayfa_${currentIndex + 1}.json`;
    link.click();
}
