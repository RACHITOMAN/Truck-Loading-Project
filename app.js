const API_URL = "https://script.google.com/macros/s/AKfycbxmTis5lkk5-RzaPRTb7N9qFvhlexUJ6twnroUSZ4GobDLxlIt-NKhNdkR-JvGJXUSl/exec";
let loads = [];

let currentLoad = null;
function getDisplayLoadId(load) {
    const datePart = String(load.loadId || "").split("-").pop();

    if (!load.trailerNumber || !datePart) {
        return load.loadId || "";
    }

    return load.trailerNumber + "-" + datePart;
}
fetch(API_URL)
.then(
    response => response.json()
)
.then(
    data => {

        loads = data;

        currentLoad = loads[0];

        renderLoadList();
console.log("Before loadData");

loadData();

console.log("After loadData");

updateDashboard();

console.log("After dashboard");
    }
);


function selectLoad(index) {

    currentLoad = loads[index];

    loadData();

}
function filterLoads() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase();

    if (
        document.getElementById(
            "clientView"
        ).style.display === "block"
    ) {

        const rows =
            document.querySelectorAll(
                "#clientTableBody tr"
            );

        rows.forEach(row => {

            if (
                row.textContent
                    .toLowerCase()
                    .includes(search)
            ) {

                row.style.display = "";

            } else {

                row.style.display = "none";
            }

        });

    } else {

        const cards =
            document.querySelectorAll(
                ".load-card"
            );

        cards.forEach(card => {

            if (
                card.textContent
                    .toLowerCase()
                    .includes(search)
            ) {

                card.style.display =
                    "block";

            } else {

                card.style.display =
                    "none";
            }

        });

    }
}
function renderLoadList() {

    const loadList =
        document.getElementById(
            "loadList"
        );

    loadList.innerHTML = "";

    loads.forEach(
        (load, index) => {

            const complete =
                load.deliveryNoteNo &&
                load.wbReceiptNo &&
                load.tareWeight &&
                load.grossWeight;

            loadList.innerHTML += `
                <div
                    class="load-card ${
                        complete
                            ? "complete"
                            : "incomplete"
                    }"
                    onclick="selectLoad(${index})"
                >

                    <strong>
                        ${
                            complete
                                ? "🟢"
                                : "🔴"
                        }
                        ${load.trailerNumber}
                    </strong>

                    <div>
                        Truck:
                        ${load.truckNumber}
                    </div>

                    <div>
${getDisplayLoadId(load)}
</div>

                </div>
            `;
        }
    );
}

function loadData() {
	console.log(
	    "Loading photos for",
	    currentLoad.folderLink
);

    document.getElementById("trailerNumber").value =
         currentLoad.trailerNumber;

    document.getElementById("truckNumber").value =
         currentLoad.truckNumber;

  document.getElementById("loadingTimeIn").value =
      currentLoad.loadingTimeIn
          ? currentLoad.loadingTimeIn.slice(0,16)
          : "";

  document.getElementById("loadingTimeOut").value =
      currentLoad.loadingTimeOut
          ? currentLoad.loadingTimeOut.slice(0,16)
        : "";

    document.getElementById("customsSeal").value =
         currentLoad.customsSeal;

    document.getElementById("wbReceiptNo").value =
         currentLoad.wbReceiptNo;

    document.getElementById("deliveryNoteNo").value =
         currentLoad.deliveryNoteNo;

    document.getElementById("wbTimeIn").value =
	    currentLoad.wbTimeIn
	        ? currentLoad.wbTimeIn.slice(0,16)
	        : "";

	document.getElementById("wbTimeOut").value =
	    currentLoad.wbTimeOut
	        ? currentLoad.wbTimeOut.slice(0,16)
        : "";

    document.getElementById("tareWeight").value =
         currentLoad.tareWeight;

    document.getElementById("grossWeight").value =
         currentLoad.grossWeight;

    document.getElementById("remarks").value =
         currentLoad.remarks;

        calculateNetWeight();
 document.getElementById("loadTitle").textContent =
    getDisplayLoadId(currentLoad);
    const complete =
    currentLoad.deliveryNoteNo &&
    currentLoad.wbReceiptNo &&
    currentLoad.tareWeight &&
    currentLoad.grossWeight;

document.getElementById("loadStatus").textContent =
    complete
        ? "🟢 Complete"
        : "🔴 Incomplete";

 document.getElementById("loadSummary").textContent =
     `Truck: ${currentLoad.truckNumber} • WB: ${currentLoad.wbReceiptNo} • DN: ${currentLoad.deliveryNoteNo}`;

 loadPhotos();
}
async function loadPhotos() {

    const container =
        document.getElementById("thumbnailContainer");

    const mainPhoto =
        document.getElementById("mainPhoto");

    container.innerHTML = "";
    mainPhoto.removeAttribute("src");

    if (
        !currentLoad ||
        !currentLoad.folderLink
    ) return;

    const folderId =
        currentLoad.folderLink
            .match(/folders\/([^?]+)/)?.[1];

    if (!folderId)
        return;

const response = await fetch(
    API_URL + "?action=getPhotos&folderId=" + encodeURIComponent(folderId)
);
   const result =
    await response.json();
    result.photos.forEach(
        photo => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "photo-thumb";

            div.innerHTML = `
			   <button
			       class="delete-photo-btn"
			       onclick="event.stopPropagation(); deletePhoto('${photo.id}')"
			   >
			       ❌
</button>

			    <img
			        src="${photo.url}"
			        style="cursor:pointer"
			    >
`;

            div.onclick =
                () => {

                    document
                        .getElementById(
                            "mainPhoto"
                        )
                        .src =
                        photo.url;
                };

            container.appendChild(
                div
            );

        }
    );

    if (
        result.photos.length
    ) {

        document
            .getElementById(
                "mainPhoto"
            )
            .src =
            result.photos[0].url;
    }
}
async function deletePhoto(fileId) {
    if (!confirm("Delete this photo?")) return;

    try {
        document.body.style.cursor = "wait";

        const response = await fetch(
            API_URL + "?action=deletePhoto&fileId=" + encodeURIComponent(fileId)
        );

        const result = await response.json();

        if (result.success) {
            alert("Photo deleted");
            await loadPhotos();
        } else {
            alert("Delete failed: " + (result.error || "Unknown error"));
        }

    } catch (error) {
        console.error("Delete photo error:", error);
        alert("Delete failed. Please try again.");

    } finally {
        document.body.style.cursor = "";
    }
}

window.deletePhoto = deletePhoto;

function calculateNetWeight() {

    const tare =
        Number(
            document.getElementById("tareWeight").value
        ) || 0;

    const gross =
        Number(
            document.getElementById("grossWeight").value
        ) || 0;

    document.getElementById("netWeight").value =
        gross - tare;
}
document
    .getElementById("tareWeight")
    .addEventListener(
        "input",
        calculateNetWeight
    );

document
    .getElementById("grossWeight")
    .addEventListener(
        "input",
        calculateNetWeight
    );
async function saveLoad() {
    currentLoad.trailerNumber =
        document.getElementById(
            "trailerNumber"
        ).value;

    currentLoad.truckNumber =
        document.getElementById(
            "truckNumber"
        ).value;

    currentLoad.loadingTimeIn =
        document.getElementById(
            "loadingTimeIn"
        ).value;

    currentLoad.loadingTimeOut =
        document.getElementById(
            "loadingTimeOut"
        ).value;

    currentLoad.customsSeal =
        document.getElementById(
            "customsSeal"
        ).value;

    currentLoad.wbReceiptNo =
        document.getElementById(
            "wbReceiptNo"
        ).value;

    currentLoad.deliveryNoteNo =
        document.getElementById(
            "deliveryNoteNo"
        ).value;

    currentLoad.wbTimeIn =
        document.getElementById(
            "wbTimeIn"
        ).value;

    currentLoad.wbTimeOut =
        document.getElementById(
            "wbTimeOut"
        ).value;

    currentLoad.tareWeight =
        document.getElementById(
            "tareWeight"
        ).value;

    currentLoad.grossWeight =
        document.getElementById(
            "grossWeight"
        ).value;

    currentLoad.remarks =
        document.getElementById(
            "remarks"
        ).value;

   localStorage.setItem(
       "truckTallyLoads",
       JSON.stringify(loads)
   );
const response =
    await fetch(
API_URL,
{
           method: "POST",

           body: JSON.stringify({

               action: "update",

               loadId:
                   currentLoad.loadId,

               trailerNumber:
                   currentLoad.trailerNumber,

               truckNumber:
                   currentLoad.truckNumber,

               customsSeal:
                   currentLoad.customsSeal,

               loadingTimeIn:
                   currentLoad.loadingTimeIn,

               loadingTimeOut:
                   currentLoad.loadingTimeOut,

               wbReceiptNo:
                   currentLoad.wbReceiptNo,

               deliveryNoteNo:
                   currentLoad.deliveryNoteNo,

               wbTimeIn:
                   currentLoad.wbTimeIn,

               wbTimeOut:
                   currentLoad.wbTimeOut,

               tareWeight:
                   currentLoad.tareWeight,

               grossWeight:
                   currentLoad.grossWeight,

               remarks:
                   currentLoad.remarks

           })

       }
);
const result =
    await response.json();

console.log(result);

console.log(currentLoad);
updateDashboard();
alert("Load saved");
}
document
    .getElementById("saveBtn")
    .addEventListener(
        "click",
        saveLoad
    );
    function showOfficeView() {

	    document.getElementById(
	        "officeView"
	    ).style.display = "block";

	    document.getElementById(
	        "clientView"
	    ).style.display = "none";

	    document.getElementById(
	        "officeTab"

	    ).classList.add(
	        "active-tab"
	    );
        document.querySelector(".app").style.gridTemplateColumns =
    "300px 1fr 380px";


document.querySelector(".app").style.gridTemplateAreas =
    `"topbar topbar topbar"
     "sidebar details photos"`;
document.querySelector(
    ".sidebar"
).style.display = "";

document.querySelector(
    ".photos"
).style.display = "flex";
	    document.getElementById(
	        "clientTab"
	    ).classList.remove(
	        "active-tab"

	    );

        document.querySelector(
    ".details"
).style.gridColumn = "";

document.querySelector(
    ".details"
).style.gridColumn =
    "details";

        renderLoadList();
	}


	function showClientView() {

	    document.getElementById(
	        "officeView"
	    ).style.display = "none";

// document.querySelector(
//     ".details"
// ).style.gridColumn =
//     "1 / -1";
	    document.getElementById(
	        "clientView"
	    ).style.display = "block";

	    document.getElementById(
	        "clientTab"
	    ).classList.add(
	        "active-tab"
	    );

	    document.getElementById(
	        "officeTab"
	    ).classList.remove(
	        "active-tab"
	    );
        document.querySelector(
    ".sidebar"
).style.display = "none";

document.querySelector(
    ".photos"
).style.display = "none";
document.querySelector(".app").style.gridTemplateColumns =
    "1fr";

document.querySelector(".app").style.gridTemplateAreas =
    `"topbar"
     "details"`;

     console.log(
    getComputedStyle(
        document.querySelector(".details")
    ).gridColumn
);

console.log(
    getComputedStyle(
        document.querySelector(".details")
    ).gridArea
);
	    renderClientTable();
}
document
    .getElementById(
        "officeTab"
    )
    .addEventListener(
        "click",
        showOfficeView
    );

document
    .getElementById(
        "clientTab"
    )
    .addEventListener(
        "click",
        showClientView
    );
    function renderClientTable() {

	    const body =
	        document.getElementById(
	            "clientTableBody"
	        );

	    body.innerHTML = "";

	    loads.forEach(
	        (load, index) => {

	            const tare =
	                Number(
	                    load.tareWeight
	                ) || 0;

	            const gross =
	                Number(
	                    load.grossWeight
	                ) || 0;

	            const net =
	                gross - tare;

	           body.innerHTML += `
<tr>

    <td>${index + 1}</td>

    <td>${load.trailerNumber || ""}</td>

    <td>${load.truckNumber || ""}</td>

    <td>${
    load.loadingTimeIn
        ? new Date(load.loadingTimeIn)
            .toLocaleString()
        : ""
}</td>

<td>${
    load.loadingTimeOut
        ? new Date(load.loadingTimeOut)
            .toLocaleString()
        : ""
}</td>

    <td>${load.customsSeal || ""}</td>

    <td>${load.wbReceiptNo || ""}</td>

    <td>${load.deliveryNoteNo || ""}</td>

<td>${
    load.wbTimeIn
        ? new Date(load.wbTimeIn)
            .toLocaleString()
        : ""
}</td>

<td>${
    load.wbTimeOut
        ? new Date(load.wbTimeOut)
            .toLocaleString()
        : ""
}</td>

    <td>${tare}</td>

<td>${gross}</td>

<td>${net}</td>

<td>
    <a
        href="${load.folderLink}"
        target="_blank"
        class="client-link"
    >
        View
    </a>
</td>

<td>
    <a
    href="#"
    class="client-link"
    onclick="generatePDF('${load.loadId}')"
>
    PDF
</a>
</td>
 </tr>
`;
        }
    );
}

function viewPhotos(trailerNumber) {

    alert(
        "Photos for " +
        trailerNumber
    );
}

function generatePDF(loadId) {
    alert("PDF generation will be added later.");
}

document.getElementById("reportDate").value =
    new Date().toISOString().split("T")[0];

updateDashboard();
document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        filterLoads
    );
    document
	    .getElementById("reportDate")
	    .addEventListener(
	        "change",
	        updateDashboard
    );
function updateDashboard() {

    const selectedDate =
        document.getElementById(
            "reportDate"
        ).value;

    let dailyMT = 0;
    let completedCount = 0;
    let incompleteCount = 0;

    let totalMT = 0;
    let totalTrucks = 0;

    loads.forEach(load => {

        const tare =
            Number(load.tareWeight) || 0;

        const gross =
            Number(load.grossWeight) || 0;

        const netWeight =
            gross - tare;

        const complete =
            load.deliveryNoteNo &&
            load.wbReceiptNo &&
            load.tareWeight &&
            load.grossWeight;

        // Lifetime totals

        if (complete) {

            totalMT += netWeight;

            totalTrucks++;

        }

        // Daily totals

        if (!load.wbTimeOut)
            return;

        const loadDate =
            load.wbTimeOut
                .split("T")[0];

        if (
            loadDate !==
            selectedDate
        ) return;

        if (complete) {

            completedCount++;

            dailyMT += netWeight;

        } else {

            incompleteCount++;

        }

    });

    document.getElementById(
        "loadedMT"
    ).textContent =
        (dailyMT / 1000)
            .toFixed(1) + " MT";

    document.getElementById(
        "trailerCount"
    ).textContent =
        completedCount;

    document.getElementById(
        "incompleteTrucks"
    ).textContent =
        incompleteCount;

    document.getElementById(
        "totalMT"
    ).textContent =
        (totalMT / 1000)
            .toFixed(1) + " MT";

    document.getElementById(
        "totalTrailers"
    ).textContent =
        totalTrucks;
}