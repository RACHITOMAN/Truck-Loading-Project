const WORKER_URL = "https://throbbing-pine-e30f.rachitmehra.workers.dev/";
const API_URL    = WORKER_URL;

let loads       = [];
let projectInfo = {};
let currentLoad = null;

// ── DisplayID helpers ─────────────────────────────────────────
function getDisplayLoadId(load) {
    return load.displayLoadId || load.trailerNumber || "";
}

function rebuildDisplayLoadId(originalDisplayLoadId, newTrailerNumber) {
    const datePart = originalDisplayLoadId.split("-").pop();
    return newTrailerNumber.toUpperCase() + "-" + datePart;
}

// ── Initial data load ─────────────────────────────────────────
// Fetch loads and project info in parallel
Promise.all([
    fetch(API_URL).then(r => r.json()),
    fetch(API_URL + "?action=getProjectInfo").then(r => r.json())
])
.then(([loadsData, projectData]) => {
    loads       = loadsData;
    projectInfo = projectData.success ? projectData.info : {};
    currentLoad = loads[0];
    renderLoadList();
    loadData();
    updateDashboard();
})
.catch(err => {
    console.error("Failed to load data:", err);
    alert("Failed to load data. Please refresh.");
});

// ── Select load ───────────────────────────────────────────────
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

// ── Sidebar ───────────────────────────────────────────────────
function renderLoadList() {
    const loadList = document.getElementById("loadList");
    loadList.innerHTML = "";

    loads.forEach((load, index) => {
        const complete =
            load.deliveryNoteNo && load.wbReceiptNo &&
            load.tareWeight     && load.grossWeight;

        const isActive = currentLoad && getDisplayLoadId(load) === getDisplayLoadId(currentLoad);

        loadList.innerHTML += `
            <div class="load-card ${complete ? "complete" : "incomplete"}${isActive ? " active" : ""}"
                onclick="selectLoad(${index})">
                <strong>${complete ? "🟢" : "🔴"} ${getDisplayLoadId(load)}</strong>
                <div>Truck: ${load.truckNumber || "—"}</div>
            </div>`;
    });
}

// ── Office form ───────────────────────────────────────────────
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

    document.getElementById("loadTitle").textContent   = getDisplayLoadId(currentLoad);
    document.getElementById("loadStatus").textContent  =
        (currentLoad.deliveryNoteNo && currentLoad.wbReceiptNo && currentLoad.tareWeight && currentLoad.grossWeight)
        ? "🟢 Complete" : "🔴 Incomplete";
    document.getElementById("loadSummary").textContent =
        `Truck: ${currentLoad.truckNumber || "—"} • WB: ${currentLoad.wbReceiptNo || "—"} • DN: ${currentLoad.deliveryNoteNo || "—"}`;

    loadPhotos();
}

// ── Photos ────────────────────────────────────────────────────
async function loadPhotos() {
    const container = document.getElementById("thumbnailContainer");
    const mainPhoto = document.getElementById("mainPhoto");
    container.innerHTML = "";
    mainPhoto.removeAttribute("src");

    if (!currentLoad || !currentLoad.folderLink) return;
    const folderId = currentLoad.folderLink.match(/folders\/([^?]+)/)?.[1];
    if (!folderId) return;

    try {
        const result = await fetch(API_URL + "?action=getPhotos&folderId=" + encodeURIComponent(folderId))
            .then(r => r.json());
        if (!result.success || !result.photos.length) return;

        result.photos.forEach(photo => {
            const div = document.createElement("div");
            div.className = "photo-thumb";
            div.innerHTML = `
                <button class="delete-photo-btn"
                    onclick="event.stopPropagation(); deletePhoto('${photo.id}')">❌</button>
                <img src="${photo.url}" style="cursor:pointer">`;
            div.onclick = () => { mainPhoto.src = photo.url; };
            container.appendChild(div);
        });
        mainPhoto.src = result.photos[0].url;
    } catch (err) { console.error("Failed to load photos:", err); }
}

async function deletePhoto(fileId) {
    if (!confirm("Delete this photo?")) return;
    try {
        document.body.style.cursor = "wait";
        const result = await fetch(API_URL + "?action=deletePhoto&fileId=" + encodeURIComponent(fileId))
            .then(r => r.json());
        if (result.success) { await loadPhotos(); }
        else { alert("Delete failed: " + (result.error || "Unknown error")); }
    } catch (err) {
        alert("Delete failed. Please try again.");
    } finally { document.body.style.cursor = ""; }
}
window.deletePhoto = deletePhoto;

// ── Weights ───────────────────────────────────────────────────
function calculateNetWeight() {
    const tare  = Number(document.getElementById("tareWeight").value)  || 0;
    const gross = Number(document.getElementById("grossWeight").value) || 0;
    document.getElementById("netWeight").value = gross - tare;
}
document.getElementById("tareWeight").addEventListener("input", calculateNetWeight);
document.getElementById("grossWeight").addEventListener("input", calculateNetWeight);

// ── Save ──────────────────────────────────────────────────────
async function saveLoad() {
    const originalDisplayLoadId = currentLoad.displayLoadId;
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

    try {
        const result = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update", displayLoadId: originalDisplayLoadId,
                trailerNumber: currentLoad.trailerNumber, truckNumber: currentLoad.truckNumber,
                customsSeal: currentLoad.customsSeal, loadingTimeIn: currentLoad.loadingTimeIn,
                loadingTimeOut: currentLoad.loadingTimeOut, wbReceiptNo: currentLoad.wbReceiptNo,
                deliveryNoteNo: currentLoad.deliveryNoteNo, wbTimeIn: currentLoad.wbTimeIn,
                wbTimeOut: currentLoad.wbTimeOut, tareWeight: currentLoad.tareWeight,
                grossWeight: currentLoad.grossWeight, remarks: currentLoad.remarks
            })
        }).then(r => r.json());

        if (result.success) {
            currentLoad.displayLoadId = result.displayLoadId ||
                rebuildDisplayLoadId(originalDisplayLoadId, newTrailerNumber);
            updateDashboard();
            renderLoadList();
            document.getElementById("loadTitle").textContent = getDisplayLoadId(currentLoad);
            document.getElementById("loadSummary").textContent =
                `Truck: ${currentLoad.truckNumber || "—"} • WB: ${currentLoad.wbReceiptNo || "—"} • DN: ${currentLoad.deliveryNoteNo || "—"}`;
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

// ── View toggles ──────────────────────────────────────────────
function showOfficeView() {
    document.getElementById("officeView").style.display = "block";
    document.getElementById("clientView").style.display = "none";
    document.getElementById("officeTab").classList.add("active-tab");
    document.getElementById("clientTab").classList.remove("active-tab");
    document.querySelector(".app").style.gridTemplateColumns = "300px 1fr 380px";
    document.querySelector(".app").style.gridTemplateAreas   = `"topbar topbar topbar" "sidebar details photos"`;
    document.querySelector(".sidebar").style.display = "";
    document.querySelector(".photos").style.display  = "flex";
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
    document.querySelector(".app").style.gridTemplateAreas   = `"topbar" "details"`;
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
        body.innerHTML += `
<tr>
    <td>${index + 1}</td>
    <td>${load.trailerNumber  || ""}</td>
    <td>${load.loadingTimeIn  ? new Date(load.loadingTimeIn).toLocaleString()  : ""}</td>
    <td>${load.loadingTimeOut ? new Date(load.loadingTimeOut).toLocaleString() : ""}</td>
    <td>${load.customsSeal    || ""}</td>
    <td>${load.wbReceiptNo    || ""}</td>
    <td>${load.deliveryNoteNo || ""}</td>
    <td>${load.wbTimeIn  ? new Date(load.wbTimeIn).toLocaleString()  : ""}</td>
    <td>${load.wbTimeOut ? new Date(load.wbTimeOut).toLocaleString() : ""}</td>
    <td>${tare}</td>
    <td>${gross}</td>
    <td>${gross - tare}</td>
    <td><a href="#" class="client-link"
        onclick="viewClientPhotos('${load.folderLink}','${getDisplayLoadId(load)}');return false;">View</a></td>
</tr>`;
    });
}

// ── Client photos gallery ─────────────────────────────────────
async function viewClientPhotos(folderLink, displayLoadId) {
    const folderId = folderLink.match(/folders\/([^?]+)/)?.[1];
    if (!folderId) { alert("No photo folder found."); return; }
    try {
        const result = await fetch(API_URL + "?action=getPhotos&folderId=" + encodeURIComponent(folderId))
            .then(r => r.json());
        const photos = result.photos || [];
        if (!photos.length) { alert("No photos found."); return; }
        const w = window.open("", "_blank");
        w.document.write(`<html><head><title>${displayLoadId}</title>
            <style>body{font-family:Arial,sans-serif;margin:20px;background:#f4f6f8}h2{margin-bottom:20px}
            .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
            img{width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15)}</style></head>
            <body><h2>${displayLoadId}</h2><div class="gallery">
            ${photos.map(p => `<img src="${p.url}">`).join("")}
            </div></body></html>`);
        w.document.close();
    } catch (err) { alert("Could not load photos."); }
}

// ── Dashboard ─────────────────────────────────────────────────
function updateDashboard() {
    const selectedDate = document.getElementById("reportDate").value;
    let dailyMT = 0, completedCount = 0, incompleteCount = 0, totalMT = 0, totalTrucks = 0;

    loads.forEach(load => {
        const tare  = Number(load.tareWeight)  || 0;
        const gross = Number(load.grossWeight) || 0;
        const net   = gross - tare;
        const complete = load.deliveryNoteNo && load.wbReceiptNo && load.tareWeight && load.grossWeight;

        if (complete) { totalMT += net; totalTrucks++; }
        if (!load.wbTimeOut) return;
        if (load.wbTimeOut.split("T")[0] !== selectedDate) return;
        if (complete) { completedCount++; dailyMT += net; }
        else { incompleteCount++; }
    });

    document.getElementById("loadedMT").textContent         = (dailyMT   / 1000).toFixed(1) + " MT";
    document.getElementById("trailerCount").textContent     = completedCount;
    document.getElementById("incompleteTrucks").textContent = incompleteCount;
    document.getElementById("totalMT").textContent          = (totalMT   / 1000).toFixed(1) + " MT";
    document.getElementById("totalTrailers").textContent    = totalTrucks;
}

document.getElementById("reportDate").value = new Date().toISOString().split("T")[0];
document.getElementById("reportDate").addEventListener("change", updateDashboard);
document.getElementById("searchInput").addEventListener("input", filterLoads);

// ── Open Folder ───────────────────────────────────────────────
function openFolder() {
    if (!currentLoad || !currentLoad.folderLink) { alert("No folder linked to this load."); return; }
    window.open(currentLoad.folderLink, "_blank");
}
document.getElementById("openFolderBtn").addEventListener("click", openFolder);

// ─────────────────────────────────────────────────────────────
// EXCEL EXPORT — client-side via SheetJS
// No Google account needed. Downloads a real .xlsx file.
// ─────────────────────────────────────────────────────────────

// Format datetime string to DD/MM/YYYY HH:MM
function fmtDateTime(val) {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d)) return val;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy}, ${hh}:${mi}`;
}

function fmtDate(val) {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d)) return val;
    return String(d.getDate()).padStart(2,"0") + "." +
           String(d.getMonth()+1).padStart(2,"0") + "." +
           String(d.getFullYear()).slice(-2);
}

// Build rows for a given set of loads
function buildRows(filteredLoads) {
    return filteredLoads.map((load, i) => {
        const tare  = Number(load.tareWeight)  || 0;
        const gross = Number(load.grossWeight) || 0;
        return [
            i + 1,
            load.trailerNumber  || "",
            fmtDateTime(load.loadingTimeIn),
            fmtDateTime(load.loadingTimeOut),
            load.customsSeal    || "",
            load.wbReceiptNo    || "",
            fmtDateTime(load.wbTimeIn),
            fmtDateTime(load.wbTimeOut),
            tare,
            gross,
            gross - tare
        ];
    });
}

// Build the full report worksheet data matching client template
function buildSheetData(filteredLoads, sheetDate) {
    const p = projectInfo;

    // Calculate totals for summary block
    const totalMT = loads.reduce((sum, l) => {
        const t = Number(l.tareWeight) || 0;
        const g = Number(l.grossWeight) || 0;
        return sum + (g - t);
    }, 0) / 1000;

    const todayMT = filteredLoads.reduce((sum, l) => {
        const t = Number(l.tareWeight) || 0;
        const g = Number(l.grossWeight) || 0;
        return sum + (g - t);
    }, 0) / 1000;

    const prevMT   = totalMT - todayMT;
    const dataRows = buildRows(filteredLoads);

    // Match client template structure exactly
    const ws_data = [
        ["", "", "", "", "SILO  OUT WEIGHT - TRUCK TALLY REPORT"],
        ["Job No:", p["JobNo"] || "", "", "", "Date:", sheetDate],
        ["Client:", p["Client"] || "", "", "", "Place:", p["Place"] || ""],
        ["Vessel:", p["Vessel"] || "", "", "", "Commenced Time:", ""],
        ["Commodity:", p["Commodity"] || "", "", "", "Completed Time:", ""],
        ["Quantity:", p["Quantity"] || "", "", "", "Silo No:", p["SiloNo"] || ""],
        [],
        // Column headers — two groups
        ["LOADING POINT", "", "", "", "", "WEIGH BRIDGE", "", "", "", "", ""],
        ["No.", "Trailer No.", "Time In", "Time Out", "Customs Seals",
         "WB Rcpt No.", "Time In", "Time Out",
         "Tare weight Mt", "Gross weight Mt", "Net Weight Mt",
         "", "", ""],
    ];

    // Data rows — summary block floats on the right (cols M-N)
    dataRows.forEach((row, i) => {
        const fullRow = [...row, "", ""];
        if (i === 0) { fullRow.push("Previous Delivery:", prevMT.toFixed(3) + " MT"); }
        else if (i === 1) { fullRow.push("Delivery on " + sheetDate + ":", todayMT.toFixed(3) + " MT"); }
        else if (i === 2) { fullRow.push("Total Delivery:", totalMT.toFixed(3) + " MT"); }
        else if (i === 3) { fullRow.push("Total Trucks:", filteredLoads.length); }
        else { fullRow.push("", ""); }
        ws_data.push(fullRow);
    });

    // Total row
    ws_data.push([
        "", "", "", "", "", "", "", "", "",
        "Total", filteredLoads.reduce((s, l) => s + ((Number(l.grossWeight)||0) - (Number(l.tareWeight)||0)), 0)
    ]);

    return ws_data;
}

// Generate and download xlsx using SheetJS
function generateExcel(filteredLoads, filename, sheetDate) {
    if (!window.XLSX) { alert("Excel library not loaded. Please refresh and try again."); return; }
    if (!filteredLoads.length) { alert("No completed loads found for this export."); return; }

    const ws_data = buildSheetData(filteredLoads, sheetDate);
    const wb      = XLSX.utils.book_new();
    const ws      = XLSX.utils.aoa_to_sheet(ws_data);

    // Column widths
    ws["!cols"] = [
        {wch:5}, {wch:14}, {wch:18}, {wch:18}, {wch:14},
        {wch:14}, {wch:18}, {wch:18}, {wch:14}, {wch:14},
        {wch:14}, {wch:2}, {wch:2}, {wch:20}, {wch:16}
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetDate);
    XLSX.writeFile(wb, filename);
}

// Export Daily — only loads matching the selected report date
function exportDaily() {
    const selectedDate = document.getElementById("reportDate").value;
    if (!selectedDate) { alert("Please select a date first."); return; }

    const filtered = loads.filter(l => {
        if (!l.wbTimeOut) return false;
        return l.wbTimeOut.split("T")[0] === selectedDate;
    });

    const d       = new Date(selectedDate);
    const display = String(d.getDate()).padStart(2,"0") + "." +
                    String(d.getMonth()+1).padStart(2,"0") + "." +
                    String(d.getFullYear()).slice(-2);

    generateExcel(filtered, "Truck_Tally_" + display + ".xlsx", display);
}

// Export Full — all loads
function exportFull() {
    const today   = new Date();
    const display = String(today.getDate()).padStart(2,"0") + "." +
                    String(today.getMonth()+1).padStart(2,"0") + "." +
                    String(today.getFullYear()).slice(-2);

    generateExcel(loads, "Truck_Tally_Full_" + display + ".xlsx", "Full Report");
}

// Wire up buttons after DOM loads
window.addEventListener("load", function () {
    const dailyBtn = document.getElementById("exportDailyBtn");
    const fullBtn  = document.getElementById("exportFullBtn");
    if (dailyBtn) dailyBtn.addEventListener("click", exportDaily);
    if (fullBtn)  fullBtn.addEventListener("click",  exportFull);
});
