let mangaPage = document.getElementById('mangaPage');
let cleanPage = document.getElementById('cleanPage');
let canvas = document.getElementById('canvas-container');
let pageInfo = document.getElementById('pageInfo');

let images = [];
let currentIndex = 0;

const TORI_API_KEY = "BURAYA_KENDİ_API_KEYİNİ_YAZ";

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

    try {
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
                    "font": "wildwords",
                    "text_align": "auto",
                    "stroke_disabled": "false",
                    "min_font_size": "12"
                },
                body: formData
            }
        );

        const result = await apiRes.json();
        console.log("Gelen Veri:", result);

        // Temiz görsel
        if (result.inpainted) {
            cleanPage.src = result.inpainted;
            cleanPage.style.display = "block";
            cleanPage.style.opacity = "1";
        }

        // Eski kutuları temizle
        document.querySelectorAll('.text-overlay').forEach(el => el.remove());

        // SADECE ÇEVRİLMİŞ METNİ KULLAN
        if (result.text) {
            result.text.forEach(obj => {
                createOverlay(
                    obj.text,
                    obj.x,
                    obj.y,
                    obj.width,
                    obj.height
                );
            });
        }

    } catch (err) {
        alert("API Hatası");
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

window.addText = function () {

    if (!mangaPage.complete) {
        alert("Resim henüz tam yüklenmedi.");
        return;
    }

    const rect = mangaPage.getBoundingClientRect();

    let div = document.createElement("div");
    div.className = "text-overlay";
    div.contentEditable = true;
    div.innerText = "Yeni Metin";

    div.style.left = (rect.width / 2 - 100) + "px";
    div.style.top = (rect.height / 2 - 25) + "px";
    div.style.width = "200px";

    setupDraggable(div);
    canvas.appendChild(div);
};

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
    cleanPage.style.opacity =
        cleanPage.style.opacity === "0" ? "1" : "0";
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
    let link = document.createElement("a");
    link.href = cleanPage.src || mangaPage.src;
    link.download = "page.jpg";
    link.click();
}


window.downloadJPG = function () {

    let source = cleanPage.style.display !== "none" && cleanPage.src
        ? cleanPage.src
        : mangaPage.src;

    if (!source) {
        alert("İndirilecek görsel yok.");
        return;
    }

    let link = document.createElement("a");
    link.href = source;
    link.download = "manga_page.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

