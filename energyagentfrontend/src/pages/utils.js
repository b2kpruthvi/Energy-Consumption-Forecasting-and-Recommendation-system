console.log("✅ utils.js loaded");

/**
 * 1) Load dataset from localStorage
 * Returns: array of arrays OR null
 */
function loadDataset() {
    const data = localStorage.getItem("dataset");
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("❌ Error parsing dataset from localStorage", e);
        return null;
    }
}

/**
 * 2) Build a header index map for easy lookup
 * Example: { Date: 0, Temperature: 1, Fan: 2, "Fan(Units)": 3, ... }
 */
function getHeaderIndexes(data) {
    if (!data || data.length === 0) return null;
    const header = data[0];
    let map = {};
    header.forEach((colName, idx) => {
        map[colName.trim()] = idx;
    });
    return map;
}

/**
 * 3) Identify appliance -> unit column mapping
 * We only use the columns ending with "(Units)" for energy use.
 * Example return:
 * {
 *   Fan: "Fan(Units)",
 *   Refrigerator: "Fridge(Units)",
 *   AirConditioner: "AC(Units)",
 *   ...
 * }
 */
function getApplianceUnitColumns(header) {
    let appliances = {};
    header.forEach((colName) => {
        if (colName.includes("(Units)")) {
            // Extract base name before "(Units)"
            let base = colName.split("(")[0].trim();
            appliances[base] = colName.trim();
        }
    });
    return appliances;
}

/**
 * 4) Safely parse numbers
 */
function parseNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * 5) Get unique sorted month list from dataset
 */
function getUniqueMonths(data, monthIndex) {
    let months = new Set();
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const monthVal = row[monthIndex];
        if (monthVal !== "" && monthVal !== undefined) {
            months.add(monthVal);
        }
    }
    return Array.from(months).sort((a, b) => a - b);
}

/**
 * 6) Group by Month and Appliance
 * Returns structure:
 * {
 *    2: { Fan: 0.29 + 0.348 + 0.322, Refrigerator: 1.11 + 1.006 + 1.226, ... },
 *    3: { Fan: X, Refrigerator: Y, ... },
 *    ...
 * }
 */
function groupByMonthAndAppliance(data, headerIndexes, applianceMap) {
    let result = {};

    const monthIndex = headerIndexes["Month"];
    if (monthIndex === undefined) {
        console.error("❌ Month column not found!");
        return result;
    }

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const monthVal = row[monthIndex];
        if (!monthVal) continue; // skip blank month rows

        if (!result[monthVal]) {
            result[monthVal] = {};
        }

        // For each appliance, add its corresponding units
        for (let appliance in applianceMap) {
            const unitCol = applianceMap[appliance]; // e.g. "Fan(Units)"
            const unitIndex = headerIndexes[unitCol];

            if (unitIndex !== undefined) {
                const val = parseNumber(row[unitIndex]);
                if (!result[monthVal][appliance]) {
                    result[monthVal][appliance] = 0;
                }
                result[monthVal][appliance] += val;
            }
        }
    }

    return result;
}
