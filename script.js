// ======================
// TORII API KEY
// ======================
const TORI_API_KEY = "sk_torii_6DIEdOZ5FrET6NCTLktqqOuLcZER9NKeo2NNsOwDhME".trim();

// ======================
// ELEMENTLER
// ======================
let mangaPage = document.getElementById("mangaPage");
let cleanPage = document.getElementById("cleanPage");
let canvas = document.getElementById("canvas-container");
let pageInfo = document.getElementById("pageInfo");

let images = [];
let currentIndex = 0;

// ======================
// RESIM YUKLEME
// ======================
document.getElementById("imageLoader").addEventListener("change", function (e) {
    images = Array.from(e.target.files);
    if (images.length > 0) loadPage(0);
});

function loadPage(index) {

    currentIndex = index;

    document.querySelectorAll(".text-overlay").forEach(el => el.remove());

    cleanPage.style.display = "none";
    cleanPage.src = "";

    let reader = new FileReader();
    reader.onload = function (e) {
        mangaPage.src = e.target.result;
    };
    reader.readAsDataURL(images[index]);

    pageInfo.innerText = (index + 1) + " / " + images.length;
}

// ======================
// TORII OCR + TRANSLATE
// ======================
async function runOCR() {

    if (!mangaPage.src) {
        alert("Resim yukle");
        return;
    }

    pageInfo.innerText = "Tori isliyor...";

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
                    Authorization: "Bearer " + TORI_API_KEY,
                    target_lang: "tr",
                    translator: "gemini-2.5-flash",
                    font: "wildwords"
                },
                body: formData
            }
        );

        if (!apiRes.ok) {
            const text = await apiRes.text();
            alert("API HATASI: " + text);
            pageInfo.innerText = "Hata";
            return;
        }

        const result = await apiRes.json();
        console.log("Gelen Veri:", result);

        // CLEAN IMAGE
        if (result.inpainted) {
            cleanPage.src = result.inpainted;
            cleanPage.style.display = "block";
        }

        // eski yazıları temizle
        document.querySelectorAll(".text-overlay").forEach(el => el.remove());

        // ÇEVRİLMİŞ METİNLERİ EKLE
        if (result.text) {
    result.text.forEach(obj => {
        createOverlayScaled(
            obj.originalText,   // BURAYI DEGISTIRDIK
            obj.x,
            obj.y,
            obj.width,
            obj.height
        );
    });
}


        pageInfo.innerText = "Tamamlandi";

    } catch (error) {
        console.error("HATA:", error);
        alert("Baglanti hatasi");
        pageInfo.innerText = "Hata";
    }
}

// ======================
// TORII SCALE HESAPLI OVERLAY
// ======================
function createOverlayScaled(text, x, y, w, h) {

    let div = document.createElement("div");
    div.className = "text-overlay";
    div.contentEditable = true;
    div.innerText = text;

    const rect = mangaPage.getBoundingClientRect();
    const scaleX = rect.width / mangaPage.naturalWidth;
    const scaleY = rect.height / mangaPage.naturalHeight;

    div.style.position = "absolute";
    div.style.left = ((x - w / 2) * scaleX) + "px";
    div.style.top = ((y - h / 2) * scaleY) + "px";
    div.style.width = (w * scaleX) + "px";
    div.style.minHeight = "30px";
    div.style.zIndex = "1000";

    setupDraggable(div);
    canvas.appendChild(div);
}

// ======================
// MANUEL METIN EKLE (CALISAN)
// ======================
function addText() {

    let div = document.createElement("div");
    div.className = "text-overlay";
    div.contentEditable = true;
    div.innerText = "New Text";

    const rect = canvas.getBoundingClientRect();

    let finalX = (window.innerWidth / 2) - rect.left - 75;
    let finalY = (window.innerHeight / 2) - rect.top - 20;

    div.style.position = "absolute";
    div.style.left = finalX + "px";
    div.style.top = finalY + "px";
    div.style.width = "150px";
    div.style.minHeight = "40px";
    div.style.zIndex = "9999";

    setupDraggable(div);
    canvas.appendChild(div);
}

// ======================
// DRAG SISTEMI
// ======================
function setupDraggable(div) {

    div.onmousedown = function (e) {

        if (e.ctrlKey) {
            div.remove();
            return;
        }

        let cRect = canvas.getBoundingClientRect();
        let shiftX = e.clientX - div.getBoundingClientRect().left;
        let shiftY = e.clientY - div.getBoundingClientRect().top;

        document.onmousemove = function (ev) {
            div.style.left = (ev.clientX - cRect.left - shiftX) + "px";
            div.style.top = (ev.clientY - cRect.top - shiftY) + "px";
        };

        document.onmouseup = function () {
            document.onmousemove = null;
        };
    };
}

// ======================
// CLEAN GORUNTU GOSTER/GIZLE
// ======================
function toggleCleanView() {
    cleanPage.style.display =
        cleanPage.style.display === "none" ? "block" : "none";
}

// ======================
// JPG INDIR
// ======================
function downloadJPG() {

    let source = cleanPage.src || mangaPage.src;

    if (!source) {
        alert("Indirilecek gorsel yok");
        return;
    }

    let link = document.createElement("a");
    link.href = source;
    link.download = "manga_page.jpg";
    link.click();
}

window.exportJSON = function () {

    let overlays = document.querySelectorAll(".text-overlay");
    let cRect = canvas.getBoundingClientRect();

    let data = {
        translations: []
    };

    overlays.forEach(el => {

        data.translations.push({
            text: el.innerText,
            x: ((parseFloat(el.style.left) / cRect.width) * 100).toFixed(2) + "%",
            y: ((parseFloat(el.style.top) / cRect.height) * 100).toFixed(2) + "%",
            width: ((parseFloat(el.style.width) / cRect.width) * 100).toFixed(2) + "%"
        });

    });

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "madara_export.json";
    link.click();
};






