const WORKER_URL = "https://throbbing-pine-e30f.rachitmehra.workers.dev/";
const API_URL    = WORKER_URL;

let loads       = [];
let currentLoad = null;

// ── DisplayID is now the single identifier ────────────────────
// Reads directly from load.displayLoadId (col A of Sheet)
function getDisplayLoadId(load) {
    return load.displayLoadId || load.trailerNumber || "";
}

// ── Rebuild displayLoadId if trailerNumber was edited ─────────
// Keeps the original date part, replaces the trailer prefix
function rebuildDisplayLoadId(originalDisplayLoadId, newTrailerNumber) {
    const datePart = originalDisplayLoadId.split("-").pop(); // e.g. "160626"
    return newTrailerNumber.toUpperCase() + "-" + datePart;
}

// ── Initial data load ─────────────────────────────────────────
fetch(API_URL)
    .then(response => response.json())
    .then(data => {
        loads       = data;
        currentLoad = loads[0];
        renderLoadList();
        loadData();
        updateDashboard();
    })
    .catch(err => {
        console.error("Failed to load data:", err);
        alert("Failed to load loads. Please refresh.");
    });

// ── Select load from sidebar ──────────────────────────────────
function selectLoad(index) {
    currentLoad = loads[index];
    loadData();
}

// ── Search / filter ───────────────────────────────────────────
function filterLoads() {
    const search = document.getElementById("searchInput").value.toLowerCase();

    if (document.getElementById("clientView").style.display === "block") {
        document.querySelectorAll("#clientTableBody tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search) ? "" : "none";
        });
    } else {
        document.querySelectorAll(".load-card").forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(search) ? "block" : "none";
        });
    }
}

// ── Render sidebar load list ──────────────────────────────────
function renderLoadList() {
    const loadList = document.getElementById("loadList");
    loadList.innerHTML = "";

    loads.forEach((load, index) => {
        const complete =
            load.deliveryNoteNo &&
            load.wbReceiptNo &&
            load.tareWeight &&
            load.grossWeight;

        loadList.innerHTML += `
            <div
                class="load-card ${complete ? "complete" : "incomplete"}"
                onclick="selectLoad(${index})"
            >
                <strong>${complete ? "🟢" : "🔴"} ${load.trailerNumber}</strong>
                <div>Truck: ${load.truckNumber}</div>
                <div>${getDisplayLoadId(load)}</div>
            </div>
        `;
    });
}

// ── Populate office form fields ───────────────────────────────
function loadData() {
    if (!currentLoad) return;

    document.getElementById("trailerNumber").value  = currentLoad.trailerNumber  || "";
    document.getElementById("truckNumber").value    = currentLoad.truckNumber    || "";
    document.getElementById("customsSeal").value    = currentLoad.customsSeal    || "";
    document.getElementById("wbReceiptNo").value    = currentLoad.wbReceiptNo    || "";
    document.getElementById("deliveryNoteNo").value = currentLoad.deliveryNoteNo || "";
    document.getElementById("tareWeight").value     = currentLoad.tareWeight     || "";
    document.getElementById("grossWeight").value    = currentLoad.grossWeight    || "";
    document.getElementById("remarks").value        = currentLoad.remarks        || "";

    document.getElementById("loadingTimeIn").value  =
        currentLoad.loadingTimeIn  ? currentLoad.loadingTimeIn.slice(0, 16)  : "";
    document.getElementById("loadingTimeOut").value =
        currentLoad.loadingTimeOut ? currentLoad.loadingTimeOut.slice(0, 16) : "";
    document.getElementById("wbTimeIn").value  =
        currentLoad.wbTimeIn  ? currentLoad.wbTimeIn.slice(0, 16)  : "";
    document.getElementById("wbTimeOut").value =
        currentLoad.wbTimeOut ? currentLoad.wbTimeOut.slice(0, 16) : "";

    calculateNetWeight();

    document.getElementById("loadTitle").textContent = getDisplayLoadId(currentLoad);

    const complete =
        currentLoad.deliveryNoteNo &&
        currentLoad.wbReceiptNo &&
        currentLoad.tareWeight &&
        currentLoad.grossWeight;

    document.getElementById("loadStatus").textContent =
        complete ? "🟢 Complete" : "🔴 Incomplete";

    document.getElementById("loadSummary").textContent =
        `Truck: ${currentLoad.truckNumber} • WB: ${currentLoad.wbReceiptNo || "—"} • DN: ${currentLoad.deliveryNoteNo || "—"}`;

    loadPhotos();
}

// ── Load photos from Drive ────────────────────────────────────
async function loadPhotos() {
    const container = document.getElementById("thumbnailContainer");
    const mainPhoto = document.getElementById("mainPhoto");

    container.innerHTML = "";
    mainPhoto.removeAttribute("src");

    if (!currentLoad || !currentLoad.folderLink) return;

    const folderId = currentLoad.folderLink.match(/folders\/([^?]+)/)?.[1];
    if (!folderId) return;

    try {
        const response = await fetch(
            API_URL + "?action=getPhotos&folderId=" + encodeURIComponent(folderId)
        );
        const result = await response.json();

        if (!result.success || !result.photos.length) return;

        result.photos.forEach(photo => {
            const div = document.createElement("div");
            div.className = "photo-thumb";
            div.innerHTML = `
                <button class="delete-photo-btn"
                    onclick="event.stopPropagation(); deletePhoto('${photo.id}')">❌</button>
                <img src="${photo.url}" style="cursor:pointer">
            `;
            div.onclick = () => { document.getElementById("mainPhoto").src = photo.url; };
            container.appendChild(div);
        });

        document.getElementById("mainPhoto").src = result.photos[0].url;

    } catch (err) {
        console.error("Failed to load photos:", err);
    }
}

// ── Delete photo ──────────────────────────────────────────────
async function deletePhoto(fileId) {
    if (!confirm("Delete this photo?")) return;

    try {
        document.body.style.cursor = "wait";
        const response = await fetch(
            API_URL + "?action=deletePhoto&fileId=" + encodeURIComponent(fileId)
        );
        const result = await response.json();

        if (result.success) {
            await loadPhotos();
        } else {
            alert("Delete failed: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Delete photo error:", err);
        alert("Delete failed. Please try again.");
    } finally {
        document.body.style.cursor = "";
    }
}

window.deletePhoto = deletePhoto;

// ── Net weight calculation ────────────────────────────────────
function calculateNetWeight() {
    const tare  = Number(document.getElementById("tareWeight").value)  || 0;
    const gross = Number(document.getElementById("grossWeight").value) || 0;
    document.getElementById("netWeight").value = gross - tare;
}

document.getElementById("tareWeight").addEventListener("input", calculateNetWeight);
document.getElementById("grossWeight").addEventListener("input", calculateNetWeight);

// ── Save load ─────────────────────────────────────────────────
async function saveLoad() {

    // Capture the original displayLoadId BEFORE any edits — needed for lookup
    const originalDisplayLoadId = currentLoad.displayLoadId;

    // Read form values
    const newTrailerNumber = document.getElementById("trailerNumber").value.trim().toUpperCase();

    currentLoad.trailerNumber  = newTrailerNumber;
    currentLoad.truckNumber    = document.getElementById("truckNumber").value.trim();
    currentLoad.loadingTimeIn  = document.getElementById("loadingTimeIn").value;
    currentLoad.loadingTimeOut = document.getElementById("loadingTimeOut").value;
    currentLoad.customsSeal    = document.getElementById("customsSeal").value;
    currentLoad.wbReceiptNo    = document.getElementById("wbReceiptNo").value;
    currentLoad.deliveryNoteNo = document.getElementById("deliveryNoteNo").value;
    currentLoad.wbTimeIn       = document.getElementById("wbTimeIn").value;
    currentLoad.wbTimeOut      = document.getElementById("wbTimeOut").value;
    currentLoad.tareWeight     = document.getElementById("tareWeight").value;
    currentLoad.grossWeight    = document.getElementById("grossWeight").value;
    currentLoad.remarks        = document.getElementById("remarks").value;

    // If trailer number changed, rebuild the displayLoadId
    const newDisplayLoadId = rebuildDisplayLoadId(originalDisplayLoadId, newTrailerNumber);
    const trailerChanged   = newDisplayLoadId !== originalDisplayLoadId;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action:         "update",
                displayLoadId:  originalDisplayLoadId,  // lookup key — original value
                trailerNumber:  currentLoad.trailerNumber,
                truckNumber:    currentLoad.truckNumber,
                customsSeal:    currentLoad.customsSeal,
                loadingTimeIn:  currentLoad.loadingTimeIn,
                loadingTimeOut: currentLoad.loadingTimeOut,
                wbReceiptNo:    currentLoad.wbReceiptNo,
                deliveryNoteNo: currentLoad.deliveryNoteNo,
                wbTimeIn:       currentLoad.wbTimeIn,
                wbTimeOut:      currentLoad.wbTimeOut,
                tareWeight:     currentLoad.tareWeight,
                grossWeight:    currentLoad.grossWeight,
                remarks:        currentLoad.remarks
            })
        });

        const result = await response.json();

        if (result.success) {
            // ── Update local loads array with new displayLoadId ──
            // This is the dashboard fix: keeps in-memory data in sync
            // so dashboard, sidebar, and client table all show the correct ID
            currentLoad.displayLoadId = result.displayLoadId || newDisplayLoadId;

            if (trailerChanged) {
                console.log(`DisplayID updated: ${originalDisplayLoadId} → ${currentLoad.displayLoadId}`);
            }

            updateDashboard();
            renderLoadList();

            // Update the title shown in office view
            document.getElementById("loadTitle").textContent = getDisplayLoadId(currentLoad);

            alert("✅ Load saved.");

        } else {
            alert("Save failed: " + (result.error || "Unknown error"));
        }

    } catch (err) {
        console.error("Save error:", err);
        alert("Network error. Please try again.");
    }
}

document.getElementById("saveBtn").addEventListener("click", saveLoad);

// ── Office / Client view toggle ───────────────────────────────
function showOfficeView() {
    document.getElementById("officeView").style.display = "block";
    document.getElementById("clientView").style.display = "none";
    document.getElementById("officeTab").classList.add("active-tab");
    document.getElementById("clientTab").classList.remove("active-tab");

    document.querySelector(".app").style.gridTemplateColumns = "300px 1fr 380px";
    document.querySelector(".app").style.gridTemplateAreas =
        `"topbar topbar topbar"
         "sidebar details photos"`;

    document.querySelector(".sidebar").style.display  = "";
    document.querySelector(".photos").style.display   = "flex";
    document.querySelector(".details").style.gridColumn = "";

    renderLoadList();
}

function showClientView() {
    document.getElementById("officeView").style.display = "none";
    document.getElementById("clientView").style.display = "block";
    document.getElementById("clientTab").classList.add("active-tab");
    document.getElementById("officeTab").classList.remove("active-tab");

    document.querySelector(".sidebar").style.display = "none";
    document.querySelector(".photos").style.display  = "none";
    document.querySelector(".app").style.gridTemplateColumns = "1fr";
    document.querySelector(".app").style.gridTemplateAreas =
        `"topbar"
         "details"`;

    renderClientTable();
}

document.getElementById("officeTab").addEventListener("click", showOfficeView);
document.getElementById("clientTab").addEventListener("click", showClientView);

// ── Client table ──────────────────────────────────────────────
function renderClientTable() {
    const body = document.getElementById("clientTableBody");
    body.innerHTML = "";

    loads.forEach((load, index) => {
        const tare  = Number(load.tareWeight)  || 0;
        const gross = Number(load.grossWeight) || 0;
        const net   = gross - tare;

        body.innerHTML += `
<tr>
    <td>${index + 1}</td>
    <td>${getDisplayLoadId(load)}</td>
    <td>${load.trailerNumber  || ""}</td>
    <td>${load.truckNumber    || ""}</td>
    <td>${load.loadingTimeIn  ? new Date(load.loadingTimeIn).toLocaleString()  : ""}</td>
    <td>${load.loadingTimeOut ? new Date(load.loadingTimeOut).toLocaleString() : ""}</td>
    <td>${load.customsSeal    || ""}</td>
    <td>${load.wbReceiptNo    || ""}</td>
    <td>${load.deliveryNoteNo || ""}</td>
    <td>${load.wbTimeIn  ? new Date(load.wbTimeIn).toLocaleString()  : ""}</td>
    <td>${load.wbTimeOut ? new Date(load.wbTimeOut).toLocaleString() : ""}</td>
    <td>${tare}</td>
    <td>${gross}</td>
    <td>${net}</td>
    <td><a href="#" class="client-link"
        onclick="viewClientPhotos('${load.folderLink}', '${getDisplayLoadId(load)}')">View</a></td>
    <td><a href="#" class="client-link"
        onclick="generatePDF('${getDisplayLoadId(load)}')">PDF</a></td>
</tr>`;
    });
}

// ── Client photo gallery ──────────────────────────────────────
async function viewClientPhotos(folderLink, displayLoadId) {
    const folderId = folderLink.match(/folders\/([^?]+)/)?.[1];
    if (!folderId) { alert("No photo folder found for this load."); return; }

    try {
        const response = await fetch(
            API_URL + "?action=getPhotos&folderId=" + encodeURIComponent(folderId)
        );
        const result = await response.json();
        const photos = result.photos || [];

        if (!photos.length) { alert("No photos found for this load."); return; }

        const galleryWindow = window.open("", "_blank");
        galleryWindow.document.write(`
            <html>
            <head>
                <title>${displayLoadId}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: #f4f6f8; }
                    h2   { margin-bottom: 20px; }
                    .gallery {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                        gap: 16px;
                    }
                    img { width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
                </style>
            </head>
            <body>
                <h2>${displayLoadId}</h2>
                <div class="gallery">
                    ${photos.map(p => `<img src="${p.url}" alt="Load photo">`).join("")}
                </div>
            </body>
            </html>
        `);
        galleryWindow.document.close();

    } catch (err) {
        console.error("Gallery error:", err);
        alert("Could not load photos.");
    }
}

// Stub — to be built
function generatePDF(displayLoadId) {
    alert("PDF generation coming soon.");
}

// ── Dashboard ─────────────────────────────────────────────────
function updateDashboard() {
    const selectedDate = document.getElementById("reportDate").value;

    let dailyMT = 0, completedCount = 0, incompleteCount = 0;
    let totalMT = 0, totalTrucks = 0;

    loads.forEach(load => {
        const tare      = Number(load.tareWeight)  || 0;
        const gross     = Number(load.grossWeight) || 0;
        const netWeight = gross - tare;

        const complete =
            load.deliveryNoteNo &&
            load.wbReceiptNo &&
            load.tareWeight &&
            load.grossWeight;

        if (complete) {
            totalMT += netWeight;
            totalTrucks++;
        }

        if (!load.wbTimeOut) return;

        const loadDate = load.wbTimeOut.split("T")[0];
        if (loadDate !== selectedDate) return;

        if (complete) {
            completedCount++;
            dailyMT += netWeight;
        } else {
            incompleteCount++;
        }
    });

    document.getElementById("loadedMT").textContent         = (dailyMT / 1000).toFixed(1) + " MT";
    document.getElementById("trailerCount").textContent     = completedCount;
    document.getElementById("incompleteTrucks").textContent = incompleteCount;
    document.getElementById("totalMT").textContent          = (totalMT / 1000).toFixed(1) + " MT";
    document.getElementById("totalTrailers").textContent    = totalTrucks;
}

// ── Date picker default + listener ───────────────────────────
document.getElementById("reportDate").value = new Date().toISOString().split("T")[0];
document.getElementById("reportDate").addEventListener("change", updateDashboard);
document.getElementById("searchInput").addEventListener("input", filterLoads);

// ── Export Excel ──────────────────────────────────────────────
window.addEventListener("load", function () {
    const btn = document.getElementById("exportExcelBtn");
    if (!btn) return;
    btn.addEventListener("click", exportExcel);
});

function exportExcel() {
    const btn = document.getElementById("exportExcelBtn");
    btn.disabled  = true;
    btn.innerText = "Exporting...";

    fetch(API_URL + "?action=exportExcel")
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                window.open(result.fileUrl, "_blank");
            } else {
                alert("Export failed: " + (result.error || "Unknown error"));
            }
        })
        .catch(err => {
            console.error("Export error:", err);
            alert("Export failed. Please try again.");
        })
        .finally(() => {
            btn.disabled  = false;
            btn.innerText = "Export Excel";
        });
}
