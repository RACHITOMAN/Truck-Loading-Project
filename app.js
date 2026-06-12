
let loads = JSON.parse(
    localStorage.getItem("truckTallyLoads")
) || [

    {

        loadId: "TR001-090626",

        trailerNumber: "TR001",

        truckNumber: "7623",

        loadingTimeIn: "2026-06-09T08:00",

        loadingTimeOut: "2026-06-09T09:30",

        customsSeal: "CS45821",

        wbReceiptNo: "WB7754",

        deliveryNoteNo: "DN4588",

        wbTimeIn: "08:05",

        wbTimeOut: "09:25",

        tareWeight: 12500,

        grossWeight: 38500,

        remarks: "Normal load"

    },

    {

        loadId: "TR002-090626",

        trailerNumber: "TR002",

        truckNumber: "5555",

        loadingTimeIn: "2026-06-09T10:00",

        loadingTimeOut: "2026-06-09T11:00",

        customsSeal: "CS99999",

        wbReceiptNo: "",

        deliveryNoteNo: "DN5001",

        wbTimeIn: "10:05",

        wbTimeOut: "10:55",

        tareWeight: 12000,

        grossWeight: 36000,

        remarks: "Awaiting WB Receipt"

    }


];

fetch(
    "https://script.google.com/macros/s/AKfycbxmTis5lkk5-RzaPRTb7N9qFvhlexUJ6twnroUSZ4GobDLxlIt-NKhNdkR-JvGJXUSl/exec"
)
.then(
    response => response.json()
)
.then(
    data => {

        loads = data;

        currentLoad = loads[0];

        renderLoadList();

        loadData();

    }
);

let currentLoad = loads[0];
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
                        ${load.loadId}
                    </div>

                </div>
            `;
        }
    );
}

function loadData() {

    document.getElementById("trailerNumber").value =
         currentLoad.trailerNumber;

    document.getElementById("truckNumber").value =
         currentLoad.truckNumber;

    document.getElementById("loadingTimeIn").value =
         currentLoad.loadingTimeIn;

    document.getElementById("loadingTimeOut").value =
         currentLoad.loadingTimeOut;

    document.getElementById("customsSeal").value =
         currentLoad.customsSeal;

    document.getElementById("wbReceiptNo").value =
         currentLoad.wbReceiptNo;

    document.getElementById("deliveryNoteNo").value =
         currentLoad.deliveryNoteNo;

    document.getElementById("wbTimeIn").value =
         currentLoad.wbTimeIn;

    document.getElementById("wbTimeOut").value =
         currentLoad.wbTimeOut;

    document.getElementById("tareWeight").value =
         currentLoad.tareWeight;

    document.getElementById("grossWeight").value =
         currentLoad.grossWeight;

    document.getElementById("remarks").value =
         currentLoad.remarks;

        calculateNetWeight();
        document.getElementById("loadTitle").textContent =
    currentLoad.loadId;
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
}
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
    function saveLoad() {

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
).style.display = "block";

document.querySelector(
    ".photos"
).style.display = "flex";
	    document.getElementById(
	        "clientTab"
	    ).classList.remove(
	        "active-tab"

	    );
	}

	function showClientView() {

	    document.getElementById(
	        "officeView"
	    ).style.display = "none";

document.querySelector(
    ".details"
).style.gridColumn =
    "1 / -1";
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

    <td>${load.loadingTimeIn || ""}</td>

    <td>${load.loadingTimeOut || ""}</td>

    <td>${load.customsSeal || ""}</td>

    <td>${load.wbReceiptNo || ""}</td>

    <td>${load.deliveryNoteNo || ""}</td>

    <td>${load.wbTimeIn || ""}</td>

    <td>${load.wbTimeOut || ""}</td>

    <td>${tare}</td>

<td>${gross}</td>

<td>${net}</td>

<td>
    <a
    href="#"
    class="client-link"
    onclick="viewPhotos('${load.trailerNumber}')"
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

    alert(
        "PDF for " +
        loadId
    );
}

renderLoadList();

loadData();

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

    let totalNetWeight = 0;

    loads.forEach(load => {

        const tare =
            Number(load.tareWeight) || 0;

        const gross =
            Number(load.grossWeight) || 0;

        totalNetWeight +=
            (gross - tare);

    });

    document.getElementById(
        "loadedMT"
    ).textContent =
        (totalNetWeight / 1000)
            .toFixed(1) + " MT";

    document.getElementById(
        "trailerCount"
    ).textContent =
        loads.length;

    document.getElementById(
        "totalMT"
    ).textContent =
        (totalNetWeight / 1000)
            .toFixed(1) + " MT";

    document.getElementById(
        "totalTrailers"
    ).textContent =
        loads.length;
}