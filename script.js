let mangaPage = document.getElementById('mangaPage');
let cleanPage = document.getElementById('cleanPage');
let canvas = document.getElementById('canvas-container');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;

const TORI_API_KEY = "BURAYA_API_KEYİNİ_YAZ";

document.getElementById('imageLoader').addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    if (images.length > 0) loadPage(0);
});

function loadPage(index) {
    currentIndex = index;
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());
    cleanPage.style.display = "none";
    cleanPage.src = "";

    let reader = new FileReader();
    reader.onload = (e) => { mangaPage.src = e.target.result; };
    reader.readAsDataURL(images[index]);

    pageInfo.innerText = `${index + 1} / ${images.length}`;
}

async function runOCR() {

    if (!mangaPage.src) return alert("Resim yükle!");

    pageInfo.innerText = "🌀 Tori İşliyor...";

    const response = await fetch(mangaPage.src);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("file", blob);

    const apiRes = await fetch(
        "https://api.toriitranslate.com/api/v2/upload",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TORI_API_KEY}`,
                "target_lang": "tr",
                "translator": "gemini-2.5-flash",
                "font": "wildwords"
            },
            body: formData
        }
    );

    const result = await apiRes.json();
    console.log("Gelen Veri:", result);

    // temiz görsel
    if (result.inpainted) {
        cleanPage.src = result.inpainted;
        cleanPage.style.display = "block";
    }

    // eski overlay temizle
    document.querySelectorAll('.text-overlay').forEach(el => el.remove());

    // SADECE ÇEVİRİYİ KULLAN
    if (result.text) {
        result.text.forEach(obj => {
            createOverlay(obj.text, obj.x, obj.y, obj.width, obj.height);
        });
    }

    pageInfo.innerText = `${currentIndex + 1} / ${images.length}`;
}

function createOverlay(text, x, y, w, h) {

    let div = document.createElement("div");
    div.className = "text-overlay";
    div.contentEditable = true;
    div.innerText = text;

    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;

    div.style.left = ((x - w/2) * scaleX) + "px";
    div.style.top = ((y - h/2) * scaleY) + "px";
    div.style.width = (w * scaleX) + "px";

    setupDraggable(div);
    canvas.appendChild(div);
}

/* ✅ SENİN ORİJİNAL ÇALIŞAN METİN EKLE */
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
    div.style.width = '150px';
    div.style.minHeight = '40px';
    div.style.zIndex = '9999';

    setupDraggable(div);
    canvas.appendChild(div);
}

function setupDraggable(div) {

    div.onmousedown = (e) => {

        if (e.ctrlKey) {
            div.remove();
            return;
        }

        let cRect = canvas.getBoundingClientRect();
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        document.onmousemove = (ev) => {
            div.style.left = (ev.clientX - cRect.left - shiftX) + "px";
            div.style.top = (ev.clientY - cRect.top - shiftY) + "px";
        };

        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };
}

function toggleCleanView() {
    cleanPage.style.display =
        cleanPage.style.display === "none" ? "block" : "none";
}

function exportJSON() {

    let overlays = document.querySelectorAll(".text-overlay");
    let cRect = canvas.getBoundingClientRect();

    let data = { translations: [] };

    overlays.forEach(el => {
        data.translations.push({
            text: el.innerText,
            x: ((parseFloat(el.style.left) / cRect.width) * 100).toFixed(2) + "%",
            y: ((parseFloat(el.style.top) / cRect.height) * 100).toFixed(2) + "%",
            width: ((parseFloat(el.style.width) / cRect.width) * 100).toFixed(2) + "%"
        });
    });

    let blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "madara.json";
    a.click();
}

function downloadJPG() {

    let source = cleanPage.src || mangaPage.src;

    if (!source) {
        alert("İndirilecek görsel yok");
        return;
    }

    let link = document.createElement("a");
    link.href = source;
    link.download = "manga_page.jpg";
    link.click();
}
