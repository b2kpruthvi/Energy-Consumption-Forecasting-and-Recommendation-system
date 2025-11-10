// src/pages/DistributionPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000/api";

const DistributionPage = () => {
  const [dataset, setDataset] = useState([]); // normalized array of objects
  const [applianceData, setApplianceData] = useState([]);
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [monthWiseData, setMonthWiseData] = useState(null);
  const [stackedVisible, setStackedVisible] = useState(false);
  const [stackedData, setStackedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize single row object keys & numeric conversions
  const normalizeRowObject = (raw) => {
    const r = { ...raw };

    // unify Date
    const dateKeys = ["Date", "date", "Timestamp", "timestamp", "time"];
    for (const k of dateKeys) {
      if (r[k]) {
        r.Date = r[k];
        break;
      }
    }

    // normalize numeric-like fields -> numbers or null
    Object.keys(r).forEach((k) => {
      // skip Date or string columns
      if (k === "Date" || typeof r[k] === "boolean") return;
      const v = r[k];
      if (v === null || v === undefined || v === "") {
        r[k] = null;
        return;
      }
      // parse numbers where meaningful
      const n = parseFloat(String(v).replace(",", "").trim());
      if (!Number.isNaN(n)) r[k] = n;
      else r[k] = String(v);
    });

    return r;
  };

  // If backend returned array-of-arrays (legacy), convert to objects
  const convertArrayOfArraysToObjects = (arr) => {
    if (!Array.isArray(arr) || arr.length < 2) return [];
    const header = arr[0].map((h) => String(h).trim());
    const rows = arr.slice(1);
    return rows.map((row) => {
      const obj = {};
      header.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
  };

  const findApplianceUnitKeys = (rows) => {
    // rows: array of objects
    if (!rows || rows.length === 0) return [];

    const sample = rows.find((r) => r && Object.keys(r).length > 0) || rows[0];
    const keys = Object.keys(sample);

    // pick keys that look like "something units", "something_units", "fan_units", or "(Units)" suffix
    const unitKeys = keys.filter((k) => {
      const lk = k.toLowerCase();
      if (lk === "units") return false; // skip global Units column
      return (
        lk.includes("unit") || // units/unit/_units
        lk.includes("(units)") ||
        lk.endsWith("_units") ||
        lk.includes("units)") // catch "Fan (Units)"
      );
    });

    // return unique list
    return Array.from(new Set(unitKeys));
  };

  const labelFromKey = (k) => {
    // convert key to human label: "Fan_Units" -> "Fan", "Fan (Units)" -> "Fan"
    let label = k.replace(/[_\-]/g, " ");
    label = label.replace(/\(.*units.*\)/i, "");
    label = label.replace(/units/i, "");
    label = label.replace(/_?units$/i, "");
    label = label.trim();
    // Capitalize first letter
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Process object-array dataset into appliance totals and stacked data
  const processDataFromObjects = (rows) => {
    const unitKeys = findApplianceUnitKeys(rows);
    if (unitKeys.length === 0) {
      setApplianceData([]);
      setStackedData(null);
      return;
    }

    // total per appliance
    const appliances = unitKeys.map((k) => {
      const total = rows.reduce((sum, r) => {
        const v = parseFloat(r[k]);
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0);
      return { key: k, label: labelFromKey(k), total };
    });

    setApplianceData(appliances);

    // prepare month-wise stacked data
    // Determine month for each row: either 'Month' field or derive from Date
    const monthsSet = new Set();
    rows.forEach((r) => {
      let m = null;
      if (r.Month !== undefined && r.Month !== null && r.Month !== "") {
        m = String(r.Month).padStart(2, "0");
        // if Month is number 1..12 -> convert to YYYY-MM? We don't know year; prefer YYYY-MM if Date present
      }
      if (!m && r.Date) {
        const d = new Date(r.Date);
        if (!isNaN(d)) m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!m) m = "Unknown";
      monthsSet.add(m);
    });

    const months = Array.from(monthsSet).sort();

    const datasets = unitKeys.map((k, i) => {
      const data = months.map((m) => {
        const sum = rows
          .filter((r) => {
            let rm = null;
            if (r.Month !== undefined && r.Month !== null && r.Month !== "") {
              rm = String(r.Month).padStart(2, "0");
            }
            if (!rm && r.Date) {
              const d = new Date(r.Date);
              if (!isNaN(d)) rm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            }
            if (!rm) rm = "Unknown";
            return rm === m;
          })
          .reduce((s, r) => {
            const v = parseFloat(r[k]);
            return s + (Number.isFinite(v) ? v : 0);
          }, 0);
        return sum;
      });

      // nice HSL palette spread
      return {
        label: labelFromKey(k),
        data,
        backgroundColor: `hsl(${(i * 45) % 360}, 70%, 60%)`,
      };
    });

    setStackedData({ labels: months, datasets });
  };

  const handleApplianceClick = (label) => {
    setSelectedAppliance(label);

    // Find the corresponding key in applianceData
    const found = applianceData.find((a) => a.label === label);
    if (!found) {
      setMonthWiseData(null);
      return;
    }
    const key = found.key;

    // prepare month-wise values
    // derive months similar to stacked logic
    const monthly = {};
    dataset.forEach((r) => {
      let m = null;
      if (r.Month !== undefined && r.Month !== null && r.Month !== "") {
        m = String(r.Month).padStart(2, "0");
      }
      if (!m && r.Date) {
        const d = new Date(r.Date);
        if (!isNaN(d)) m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!m) m = "Unknown";
      const v = parseFloat(r[key]);
      monthly[m] = (monthly[m] || 0) + (Number.isFinite(v) ? v : 0);
    });

    const labels = Object.keys(monthly).sort();
    const values = labels.map((l) => monthly[l]);
    setMonthWiseData({ labels, values });
  };

  useEffect(() => {
    // fetch /api/data for the logged-in user
    const load = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not logged in - please login to view distribution.");
        setLoading(false);
        return;
      }

      try {
        const resp = await axios.get(`${API_BASE}/data`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });

        console.debug("/api/data response (distribution):", resp.status, resp.data);

        // Accept multiple response shapes
        let rows = [];
        if (Array.isArray(resp.data)) {
          rows = resp.data;
        } else if (resp.data && Array.isArray(resp.data.data)) {
          rows = resp.data.data;
        } else if (resp.data && Array.isArray(resp.data.rows)) {
          rows = resp.data.rows;
        } else if (resp.data && Array.isArray(resp.data.result)) {
          rows = resp.data.result;
        } else {
          console.warn("Unexpected /api/data payload shape:", resp.data);
          rows = [];
        }

        // If array-of-arrays legacy format, convert
        if (rows.length > 0 && Array.isArray(rows[0])) {
          rows = convertArrayOfArraysToObjects(rows);
        }

        // Normalize rows to objects with numeric conversions
        const normalized = rows.map(normalizeRowObject);

        if (normalized.length === 0) {
          setDataset([]);
          setApplianceData([]);
          setStackedData(null);
          setError("No data found for this user.");
          setLoading(false);
          return;
        }

        setDataset(normalized);
        processDataFromObjects(normalized);
      } catch (err) {
        console.error("Distribution fetch error:", err);
        setError("Failed to load data for distribution. Check server or token.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <h2>Appliance-wise Energy Distribution</h2>

      {loading && <p>Loading data...</p>}
      {error && !loading && <div style={{ color: "crimson" }}>{error}</div>}

      {/* Appliance Bar Chart */}
      {!loading && applianceData.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "auto" }}>
          <Bar
            data={{
              labels: applianceData.map((a) => a.label),
              datasets: [
                {
                  label: "Total Energy (Units)",
                  data: applianceData.map((a) => a.total),
                  backgroundColor: [
                    "#4e79a7",
                    "#f28e2b",
                    "#e15759",
                    "#76b7b2",
                    "#59a14f",
                    "#edc948",
                    "#b07aa1",
                  ],
                },
              ],
            }}
            options={{
              responsive: true,
              onClick: (e, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const label = applianceData[index].label;
                  handleApplianceClick(label);
                }
              },
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: { beginAtZero: true, title: { display: true, text: "Units" } },
              },
            }}
          />

          {/* View All Appliances Button */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={() => setStackedVisible(true)}
              style={{
                background: "#2c3e50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              View Month-wise Stacked Chart
            </button>
          </div>
        </div>
      )}

      {/* Month-wise Line Chart for selected appliance */}
      {monthWiseData && (
        <div
          style={{
            marginTop: "40px",
            background: "#f9f9f9",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <h3>Month-wise Energy Usage — {selectedAppliance}</h3>
          <div style={{ maxWidth: "800px", margin: "auto" }}>
            <Line
              data={{
                labels: monthWiseData.labels,
                datasets: [
                  {
                    label: `${selectedAppliance} (Units)`,
                    data: monthWiseData.values,
                    borderColor: "#2c3e50",
                    backgroundColor: "rgba(44,62,80,0.3)",
                    fill: true,
                    tension: 0.2,
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: "Units" },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Modal for Stacked Chart */}
      {stackedVisible && stackedData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
          onClick={() => setStackedVisible(false)}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              width: "90%",
              maxWidth: "900px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
              Month-wise Stacked Energy Distribution
            </h3>
            <Bar
              data={stackedData}
              options={{
                responsive: true,
                plugins: { legend: { position: "top" } },
                scales: {
                  x: { stacked: true },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: "Units" },
                  },
                },
              }}
            />
            <div style={{ textAlign: "center", marginTop: "15px" }}>
              <button
                onClick={() => setStackedVisible(false)}
                style={{
                  background: "#e74c3c",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributionPage;
