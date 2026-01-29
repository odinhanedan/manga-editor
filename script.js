let imageLoader = document.getElementById('imageLoader');
let canvas = document.getElementById('canvas-container');
let mangaPage = document.getElementById('mangaPage');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;
// GÜNCEL API ANAHTARIN
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

// 🚀 GÜNCELLENMİŞ TORI V2 FONKSİYONU
async function runOCR() {
    if (!mangaPage.src) { alert("Please upload an image first!"); return; }
    
    pageInfo.innerText = "🌀 Connecting to Tori AI...";

    try {
        const response = await fetch(mangaPage.src);
        const imageBlob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');

        // URL'yi dokümantasyondaki V2 adresine güncelledik
        const apiURL = 'https://api.toriitranslate.com/api/v2/upload';

        const apiResponse = await fetch(apiURL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TORI_API_KEY}`,
                'target_lang': 'en',
                'translator': 'gemini-2.5-flash',
                'font': 'wildwords'
            },
            body: formData
        });

        // Hata durumunu kontrol et
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`API Error: ${apiResponse.status} - ${errorText}`);
        }

        const result = await apiResponse.json();
        
        if (result.text && result.text.length > 0) {
            result.text.forEach(obj => {
                // Koordinat hesaplama (Merkezden köşeye)
                const x_min = obj.x - (obj.width / 2);
                const y_min = obj.y - (obj.height / 2);
                createToriOverlay(obj.text, [x_min, y_min, x_min + obj.width, y_min + obj.height]);
            });
            alert("Success!");
        } else {
            alert("No text detected. Check your credits on Tori dashboard.");
        }
    } catch (error) {
        console.error("Connection Error:", error);
        alert("Bağlantı Hatası: " + error.message);
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

function setupDraggable(div) {
    div.onmousedown = function(e) {
        if (e.ctrlKey) { div.remove(); return; }
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;
        function moveAt(clientX, clientY) {
            let canvasRect = canvas.getBoundingClientRect();
            div.style.left = (clientX - canvasRect.left - shiftX) + 'px';
            div.style.top = (clientY - canvasRect.top - shiftY) + 'px';
        }
        document.onmousemove = (e) => moveAt(e.clientX, e.clientY);
        document.onmouseup = () => { document.onmousemove = null; };
    };
    div.ondragstart = () => false;
}

function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'New Text';
    
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();

    // 🎯 EKRANIN TAM ORTASI HESABI
    let finalX = (window.innerWidth / 2) - rect.left - 75; 
    let finalY = (window.innerHeight / 2) - rect.top - 20;

    div.style.left = finalX + 'px';
    div.style.top = finalY + 'px';
    
    // ✨ ŞEFFAFLIK AYARLARI
    div.style.backgroundColor = 'transparent'; // Beyaz kareyi kaldırdık
    div.style.border = '1px dashed #ccc';      // Yerini görmen için çok ince kesikli çizgi
    div.style.boxShadow = 'none';               // Varsa gölgeyi kaldırır
    
    // Yazı ayarları (CSS'indekileri destekler)
    div.style.width = '150px';
    div.style.minHeight = '40px';
    div.style.zIndex = '9999';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';

    setupDraggable(div);
    container.appendChild(div);
}

function exportJSON() {
    let overlays = document.querySelectorAll('.text-overlay');
    if (overlays.length === 0) { alert("Önce metin eklemelisin!"); return; }

    let currentFileName = images[currentIndex].name; // RESİM ADINI ALDIK
    let data = {
        imageName: currentFileName, // Hangi resim olduğu artık içinde yazıyor!
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
