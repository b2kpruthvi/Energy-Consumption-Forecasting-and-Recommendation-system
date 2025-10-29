// src/pages/DistributionPage.js
import React, { useEffect, useState } from "react";
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

const DistributionPage = () => {
  const [dataset, setDataset] = useState([]);
  const [applianceData, setApplianceData] = useState([]);
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [monthWiseData, setMonthWiseData] = useState(null);
  const [stackedVisible, setStackedVisible] = useState(false);
  const [stackedData, setStackedData] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("dataset"));
    if (!data || data.length < 2) {
      alert("Please upload the dataset first!");
      return;
    }
    setDataset(data);
    processData(data);
  }, []);

  const processData = (data) => {
    const header = data[0];
    const rows = data.slice(1);

    // ✅ Detect appliance columns dynamically
    const applianceCols = header
      .map((h, i) => ({ name: h, index: i }))
      .filter((col) => col.name.includes("(Units)"));

    if (applianceCols.length === 0) {
      alert("❌ No appliance '(Units)' columns found.");
      return;
    }

    const appliances = applianceCols.map((a) => ({
      label: a.name.split("(")[0],
      total: rows.reduce(
        (sum, row) => sum + parseFloat(row[a.index] || 0),
        0
      ),
    }));

    setApplianceData(appliances);
    prepareStackedData(header, rows, applianceCols);
  };

  const handleApplianceClick = (label) => {
    setSelectedAppliance(label);
    const header = dataset[0];
    const rows = dataset.slice(1);

    const monthIdx = header.indexOf("Month");
    const appIdx = header.indexOf(`${label}(Units)`);

    if (monthIdx === -1 || appIdx === -1) {
      alert("Month or Appliance column missing!");
      return;
    }

    const monthly = {};
    rows.forEach((row) => {
      const month = row[monthIdx];
      const val = parseFloat(row[appIdx] || 0);
      monthly[month] = (monthly[month] || 0) + val;
    });

    const labels = Object.keys(monthly);
    const values = Object.values(monthly);

    setMonthWiseData({ labels, values });
  };

  const prepareStackedData = (header, rows, applianceCols) => {
    const monthIdx = header.indexOf("Month");
    if (monthIdx === -1) return;

    const months = Array.from(new Set(rows.map((r) => r[monthIdx])));
    const datasets = applianceCols.map((col, i) => {
      const data = months.map((m) => {
        const filtered = rows.filter((r) => r[monthIdx] === m);
        return filtered.reduce(
          (sum, r) => sum + parseFloat(r[col.index] || 0),
          0
        );
      });

      return {
        label: col.name.split("(")[0],
        data,
        backgroundColor: `hsl(${i * 45}, 70%, 60%)`,
      };
    });

    setStackedData({ labels: months, datasets });
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <h2>Appliance-wise Energy Distribution</h2>

      {/* Appliance Bar Chart */}
      {applianceData.length > 0 && (
        <div style={{ maxWidth: "800px", margin: "auto" }}>
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
