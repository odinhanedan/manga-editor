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

// METİN EKLEME VE YENİ SÜRÜKLEME SİSTEMİ
function addText() {
    let div = document.createElement('div');
    div.className = 'text-overlay';
    div.contentEditable = true;
    div.innerText = 'Yazı Yazın';

    let rect = canvas.getBoundingClientRect();
    // Ekranın ortasını, sayfa kaydırmasını (scroll) hesaba katarak bul
    let spawnX = (window.innerWidth / 2) - rect.left;
    let spawnY = (window.innerHeight / 2) - rect.top;

    div.style.left = spawnX + 'px';
    div.style.top = spawnY + 'px';

    // Yeni ve sağlam sürükleme mantığı
    div.onmousedown = function(e) {
        // Tıklanan noktanın kutu içindeki farkını al
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

    div.ondragstart = function() { return false; }; // Tarayıcının kendi sürüklemesini engelle
    canvas.appendChild(div);
}

// JSON ÇIKTISI (RESİM ADI EKLENMİŞ HALİ)
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