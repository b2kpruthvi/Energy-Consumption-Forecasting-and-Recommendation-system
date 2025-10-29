/* ============================
   script.js - common for pages
   ============================ */

console.log("✅ Frontend script loaded");

// Utility: parse text into 2D array; supports comma, tab, semicolon OR whitespace separated
function parseTextToRows(content) {
    if (!content) return [];
    // Normalize line endings and remove empty lines
    const lines = content.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter:
    const first = lines[0];
    let delim = null;

    if (first.includes("\t")) delim = "\t";
    else if (first.includes(",")) delim = ",";
    else if (first.includes(";")) delim = ";";
    else delim = /\s+/; // fallback: any whitespace (spaces/tabs) - covers your format

    const rows = lines.map(line =>
        // if delim is a regex keep it, else use literal delim
        (delim instanceof RegExp ? line.split(delim) : line.split(delim)).map(cell => {
            // remove BOM and surrounding quotes & trim
            return String(cell).replace(/^\uFEFF/, "").replace(/^"(.*)"$/, "$1").trim();
        })
    );
    return rows;
}

// Save dataset (rows: 2D array) to localStorage as JSON
function saveDataset(rows) {
    localStorage.setItem("dataset", JSON.stringify(rows));
    console.log("✅ Dataset saved to localStorage (rows length):", rows.length);
}

// Load dataset from localStorage
function loadDatasetFromStorage() {
    const raw = localStorage.getItem("dataset");
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed;
    } catch (e) {
        console.error("Failed to parse dataset from storage:", e);
        return null;
    }
}

/* ============================
   DOM ready wrapper
   ============================ */
document.addEventListener("DOMContentLoaded", function () {

    /* ============================
       Dataset upload & preview
       ============================ */
    (function setupUpload() {
        const uploadBtn = document.getElementById("uploadBtn");
        const fileInput = document.getElementById("datasetFile");
        const uploadStatus = document.getElementById("uploadStatus");
        const previewContainer = document.getElementById("previewContainer");

        if (!uploadBtn || !fileInput) {
            // not on dataset page
            return;
        }

        uploadBtn.addEventListener("click", function () {
            if (!fileInput.files || fileInput.files.length === 0) {
                if (uploadStatus) uploadStatus.innerText = "Please select a file.";
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                const rows = parseTextToRows(content);
                if (!rows || rows.length === 0) {
                    alert("Could not parse the file. Make sure it is CSV/TSV or whitespace-separated with a header row.");
                    return;
                }

                // Save rows to localStorage
                saveDataset(rows);

                // Show preview (first 6 rows)
                if (previewContainer) {
                    let table = "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;'>";
                    rows.slice(0, 6).forEach(r => {
                        table += "<tr>";
                        r.forEach(c => table += `<td>${c}</td>`);
                        table += "</tr>";
                    });
                    table += "</table>";
                    previewContainer.innerHTML = table;
                }

                if (uploadStatus) uploadStatus.innerText = "File uploaded successfully!";
                alert("Dataset uploaded and saved locally.");
            };
            reader.readAsText(file);
        });
    })();


    /* ============================
       Overview page (cards)
       ============================ */
    (function setupOverview() {
        if (!window.location.pathname.includes("overview.html")) return;

        console.log("Overview page detected - computing summary");

        const totalEnergyEl = document.getElementById("totalEnergy");
        const averageEnergyEl = document.getElementById("averageEnergy");
        const totalRecordsEl = document.getElementById("totalRecords");

        const rows = loadDatasetFromStorage();
        if (!rows || rows.length < 2) {
            alert("Please upload dataset first (Dataset Upload page).");
            return;
        }

        const header = rows[0].map(h => h.trim());
        const dateIndex = header.indexOf("Date");
        const unitsIndex = header.indexOf("Units");

        if (dateIndex === -1 || unitsIndex === -1) {
            alert("Dataset must include 'Date' and 'Units' columns to compute overview.");
            return;
        }

        const dataRows = rows.slice(1);
        let total = 0;
        const dateSet = new Set();

        dataRows.forEach(r => {
            const date = r[dateIndex];
            const val = parseFloat(String(r[unitsIndex] || "").replace(/,/g, "").trim());
            if (!isNaN(val)) total += val;
            if (date) dateSet.add(String(date).trim());
        });

        const avg = dateSet.size > 0 ? (total / dateSet.size) : 0;

        if (totalEnergyEl) totalEnergyEl.innerText = total.toFixed(2);
        if (averageEnergyEl) averageEnergyEl.innerText = avg.toFixed(2);
        if (totalRecordsEl) totalRecordsEl.innerText = dataRows.length;
    })();


    /* ============================
       Distribution page (charts)
       ============================ */
    (function setupDistribution() {
        if (!window.location.pathname.includes("distribution.html")) return;
        console.log("Distribution page detected - initializing distribution charts");

        const rows = loadDatasetFromStorage();
        if (!rows || rows.length < 2) {
            alert("Please upload dataset first (Dataset Upload page).");
            return;
        }

        // Normalize header (trim)
        const header = rows[0].map(h => h.trim());

        // appliance list in order (as requested)
        const APPLIANCES = [
            { label: "Fan", key: "Fan(Units)" },
            { label: "Fridge", key: "Fridge(Units)" },
            { label: "AC", key: "AC(Units)" },
            { label: "Bulb", key: "Bulb(Units)" },
            { label: "TV", key: "TV(Units)" },
            { label: "Monitor", key: "Monitor(Units)" },
            { label: "Motor", key: "Motor(Units)" }
        ];

        // find date index
        const dateIdx = header.indexOf("Date");
        if (dateIdx === -1) {
            alert("Date column not found in dataset header.");
            return;
        }

        // map appliance to index (space separated header will match keys)
        const applianceInfo = APPLIANCES.map(a => {
            const idx = header.indexOf(a.key);
            return { label: a.label, key: a.key, index: idx };
        });

        // 1) Calculate totals per appliance
        const totals = applianceInfo.map(info => {
            let sum = 0;
            if (info.index !== -1) {
                for (let i = 1; i < rows.length; i++) {
                    const valRaw = rows[i][info.index];
                    const val = parseFloat(String(valRaw || "").replace(/,/g, "").trim());
                    if (!isNaN(val)) sum += val;
                }
            }
            return { label: info.label, total: sum, index: info.index };
        });

        // Chart: appliance-wise bar chart
        const applianceCtx = document.getElementById("applianceChart").getContext("2d");

        // Colors for each appliance (fixed for consistency)
        const palette = [
            "#4e79a7", // Fan
            "#f28e2b", // Fridge
            "#e15759", // AC
            "#76b7b2", // Bulb
            "#59a14f", // TV
            "#edc948", // Monitor
            "#b07aa1"  // Motor
        ];

        // destroy previous chart if exists on the global window (safety)
        if (window._applianceChart) {
            try { window._applianceChart.destroy(); } catch(e) {}
            window._applianceChart = null;
        }

        const applianceLabels = totals.map(t => t.label);
        const applianceValues = totals.map(t => t.total);

        window._applianceChart = new Chart(applianceCtx, {
            type: "bar",
            data: {
                labels: applianceLabels,
                datasets: [{
                    label: "Total Energy (Units)",
                    data: applianceValues,
                    backgroundColor: palette,
                    borderColor: palette,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                onClick: (evt, elements) => {
                    if (!elements || elements.length === 0) return;
                    const idx = elements[0].index;
                    const chosen = totals[idx];
                    if (chosen && chosen.index !== -1) {
                        openMonthModal(chosen);
                    } else {
                        alert("No data available for this appliance.");
                    }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: "Units" } },
                    x: { title: { display: true, text: "Appliances" } }
                }
            }
        });


        /* ----------------------------
           Modal + per-appliance month chart
           ---------------------------- */
        const modalBackdrop = document.getElementById("modalBackdrop");
        const closeModalBtn = document.getElementById("closeModal");
        const modalTitleEl = document.getElementById("modalTitle");
        const monthCanvas = document.getElementById("monthChart");
        let monthChart = null;

        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", closeModal);
        }
        if (modalBackdrop) {
            modalBackdrop.addEventListener("click", (e) => {
                if (e.target === modalBackdrop) closeModal();
            });
        }

        function closeModal() {
            if (modalBackdrop) modalBackdrop.style.display = "none";
            if (monthChart) {
                try { monthChart.destroy(); } catch (e) {}
                monthChart = null;
            }
        }

        // Extract month-year key from DD-MM-YYYY or D-M-YYYY or DD/MM/YYYY formats
        function extractMonthKey(rawDate) {
            if (!rawDate) return null;
            const s = String(rawDate).trim();
            const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
            if (!m) return null;
            const dd = m[1], mm = m[2], yyyy = m[3];
            const mmPad = mm.padStart(2, "0");
            return `${yyyy}-${mmPad}`; // YYYY-MM
        }

        // Open modal and draw line chart for chosen appliance
        function openMonthModal(appliance) {
            modalTitleEl.innerText = `Month-wise Usage — ${appliance.label}`;

            // aggregate per month
            const monthMap = {}; // { 'YYYY-MM': sum }
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                const rawDate = row[dateIdx];
                const key = extractMonthKey(rawDate);
                if (!key) continue;
                const valRaw = (appliance.index !== -1) ? row[appliance.index] : undefined;
                const val = parseFloat(String(valRaw || "").replace(/,/g, "").trim());
                if (!isNaN(val)) monthMap[key] = (monthMap[key] || 0) + val;
            }

            const keys = Object.keys(monthMap).sort();
            if (keys.length === 0) {
                alert("No monthly data found for " + appliance.label);
                return;
            }

            const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const labels = keys.map(k => {
                const [yy, mm] = k.split("-");
                const idx = parseInt(mm, 10) - 1;
                return `${monthNames[idx]} ${yy}`;
            });
            const values = keys.map(k => monthMap[k]);

            // show modal
            if (modalBackdrop) modalBackdrop.style.display = "flex";

            // destroy previous chart if exists
            if (monthChart) {
                try { monthChart.destroy(); } catch (e) {}
                monthChart = null;
            }

            monthChart = new Chart(monthCanvas.getContext("2d"), {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${appliance.label} (Units)`,
                        data: values,
                        fill: false,
                        tension: 0.25,
                        pointRadius: 4,
                        borderColor: "#2c3e50",
                        backgroundColor: "#2c3e50"
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: true } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: "Units" } },
                        x: { title: { display: true, text: "Month" } }
                    }
                }
            });
        }


        /* ----------------------------
           Stacked month-wise chart for ALL appliances (button-triggered)
           ---------------------------- */
        const showMonthBtn = document.getElementById("showMonthWiseBtn");
        const allMonthSection = document.getElementById("allMonthSection");
        const allMonthCanvas = document.getElementById("allMonthChart");
        let allMonthChart = null;

        if (showMonthBtn) {
            showMonthBtn.addEventListener("click", function () {
                // compute aggregated month-wise for each appliance
                const monthApplianceMap = {}; // { 'YYYY-MM': {Fan:val, Fridge:val, ...} }
                for (let r = 1; r < rows.length; r++) {
                    const row = rows[r];
                    const key = extractMonthKey(row[dateIdx]);
                    if (!key) continue;
                    if (!monthApplianceMap[key]) monthApplianceMap[key] = {};
                    applianceInfo.forEach(info => {
                        const lab = info.label;
                        const valRaw = (info.index !== -1) ? row[info.index] : undefined;
                        const val = parseFloat(String(valRaw || "").replace(/,/g, "").trim());
                        if (!isNaN(val)) {
                            monthApplianceMap[key][lab] = (monthApplianceMap[key][lab] || 0) + val;
                        } else {
                            monthApplianceMap[key][lab] = (monthApplianceMap[key][lab] || 0) + 0;
                        }
                    });
                }

                const months = Object.keys(monthApplianceMap).sort();
                if (months.length === 0) {
                    alert("No month-wise data found in dataset.");
                    return;
                }

                const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const labels = months.map(m => {
                    const [yy, mm] = m.split("-");
                    const idx = parseInt(mm, 10) - 1;
                    return `${monthNames[idx]} ${yy}`;
                });

                // build dataset per appliance following the requested order
                const datasets = applianceInfo.map((info, idx) => {
                    const lab = info.label;
                    const dataForAppliance = months.map(m => {
                        const v = monthApplianceMap[m] && (monthApplianceMap[m][lab] || 0);
                        return v || 0;
                    });
                    return {
                        label: lab,
                        data: dataForAppliance,
                        backgroundColor: palette[idx],
                        borderColor: palette[idx],
                        borderWidth: 1
                    };
                });

                // show section
                if (allMonthSection) allMonthSection.style.display = "block";

                // destroy existing chart if present
                if (allMonthChart) {
                    try { allMonthChart.destroy(); } catch (e) {}
                    allMonthChart = null;
                }

                allMonthChart = new Chart(allMonthCanvas.getContext("2d"), {
                    type: "bar",
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: "top" } },
                        scales: {
                            x: { stacked: true, title: { display: true, text: "Month" } },
                            y: { stacked: true, beginAtZero: true, title: { display: true, text: "Units" } }
                        }
                    }
                });

                // scroll into view for user convenience
                allMonthCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        }

    })(); // end distribution IIFE

}); // end DOMContentLoaded
