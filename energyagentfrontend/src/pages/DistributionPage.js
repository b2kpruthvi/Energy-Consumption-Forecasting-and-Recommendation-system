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
import { Box, Paper, Typography, CircularProgress, Grid, Fade, Grow } from "@mui/material";

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
  const [dataset, setDataset] = useState([]);
  const [applianceData, setApplianceData] = useState([]);
  const [monthWiseData, setMonthWiseData] = useState(null);
  const [stackedData, setStackedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [kpi, setKpi] = useState({});

  const normalizeRowObject = (raw) => {
    const r = { ...raw };
    const dateKeys = ["Date", "date", "Timestamp", "timestamp"];
    for (const k of dateKeys) if (r[k]) r.Date = r[k];
    Object.keys(r).forEach((k) => {
      if (k === "Date") return;
      const n = parseFloat(r[k]);
      if (!isNaN(n)) r[k] = n;
    });
    return r;
  };

  const findApplianceUnitKeys = (rows) => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.filter((k) => k.toLowerCase().includes("unit") && k.toLowerCase() !== "units");
  };

  const labelFromKey = (k) =>
    k.replace(/[_\-]/g, " ").replace(/\(.*\)/g, "").replace(/units/i, "").trim();

  const processData = (rows) => {
    const unitKeys = findApplianceUnitKeys(rows);
    if (!unitKeys.length) return;

    const appliances = unitKeys.map((key) => ({
      key,
      label: labelFromKey(key),
      total: rows.reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0),
    }));

    setApplianceData(appliances);

    const monthsSet = new Set();
    rows.forEach((r) => {
      const d = new Date(r.Date);
      if (!isNaN(d)) monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    const months = [...monthsSet].sort();

    const datasets = unitKeys.map((key, i) => ({
      label: labelFromKey(key),
      data: months.map((m) => {
        const monthRows = rows.filter((r) => {
          const d = new Date(r.Date);
          const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return tag === m;
        });
        return monthRows.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
      }),
      backgroundColor: `hsl(${(i * 45) % 360}, 70%, 60%)`,
    }));

    setStackedData({ labels: months, datasets });

    // Default KPI summary
    const totalUnits = appliances.reduce((sum, a) => sum + a.total, 0);
    const topAppliance = appliances.reduce((p, c) => (c.total > p.total ? c : p), appliances[0]);
    const avgDaily = (totalUnits / rows.length).toFixed(2);
    setKpi({
      totalUnits: totalUnits.toFixed(2),
      topAppliance: topAppliance.label,
      avgDaily,
      applianceCount: appliances.length,
    });
  };

  const handleApplianceClick = (label) => {
    setSelectedAppliance(label);
    const found = applianceData.find((a) => a.label === label);
    if (!found) return;
    const key = found.key;
    const monthly = {};
    dataset.forEach((r) => {
      let m = null;
      const d = new Date(r.Date);
      if (!isNaN(d)) m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const v = parseFloat(r[key]);
      monthly[m] = (monthly[m] || 0) + (Number.isFinite(v) ? v : 0);
    });
    const labels = Object.keys(monthly).sort();
    const values = labels.map((l) => monthly[l]);
    setMonthWiseData({ labels, values });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Please login to view this page.");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rows = Array.isArray(res.data) ? res.data.map(normalizeRowObject) : [];
        setDataset(rows);
        processData(rows);
      } catch (e) {
        console.error(e);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Box sx={{ background: "#0f172a", color: "#e2e8f0", p: 4, minHeight: "100vh" }}>
      <Typography variant="h4" align="center" sx={{ color: "#38bdf8", mb: 3, fontWeight: "bold" }}>
        ⚙️ Appliance Energy Distribution
      </Typography>

      {/* KPI CARDS */}
      {!loading && !error && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Total Energy Used", value: `${kpi.totalUnits || 0} kwh`, color: "#38bdf8" },
            { label: "Top Appliance", value: kpi.topAppliance || "-", color: "#22c55e" },
            { label: "Avg Daily Usage", value: `${kpi.avgDaily || 0} kwh`, color: "#facc15" },
            { label: "Tracked Appliances", value: kpi.applianceCount || 0, color: "#fb7185" },
          ].map((card, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 2,
                  borderRadius: "10px",
                  textAlign: "center",
                  border: `1px solid ${card.color}40`,
                }}
              >
                <Typography sx={{ color: "#94a3b8" }}>{card.label}</Typography>
                <Typography sx={{ color: card.color, fontSize: "1.3rem", fontWeight: "bold" }}>
                  {card.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: "50vh" }}>
          <CircularProgress sx={{ color: "#38bdf8" }} />
        </Box>
      )}

      {!loading && !error && applianceData.length > 0 && (
        <>
          {/* TOTAL APPLIANCE USAGE */}
          <Fade in timeout={700}>
            <Paper
              sx={{
                background: "#1e293b",
                p: 3,
                borderRadius: "12px",
                border: "1px solid #334155",
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#22c55e", mb: 2 }}>
                📊 Total Usage by Appliance
              </Typography>
              <Box sx={{ height: 260 }}>
                <Bar
                  data={{
                    labels: applianceData.map((a) => a.label),
                    datasets: [
                      {
                        label: "Total Energy (Units)",
                        data: applianceData.map((a) => a.total),
                        backgroundColor: [
                          "#38bdf8",
                          "#22c55e",
                          "#facc15",
                          "#fb7185",
                          "#8b5cf6",
                          "#06b6d4",
                          "#e879f9",
                        ],
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (e, el) => {
                      if (el.length > 0)
                        handleApplianceClick(applianceData[el[0].index].label);
                    },
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { color: "#94a3b8" } },
                      x: { ticks: { color: "#94a3b8" } },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Fade>

          {/* STACKED MONTH-WISE CHART */}
          {stackedData && (
            <Grow in timeout={800}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  borderRadius: "12px",
                  border: "1px solid #334155",
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ color: "#38bdf8", mb: 2 }}>
                  🧩 Month-wise Stacked Energy Distribution
                </Typography>
                <Box sx={{ height: 260 }}>
                  <Bar
                    data={stackedData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: "#e2e8f0" } } },
                      scales: {
                        x: { stacked: true, ticks: { color: "#94a3b8" } },
                        y: { stacked: true, beginAtZero: true, ticks: { color: "#94a3b8" } },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grow>
          )}

          {/* SELECTED APPLIANCE CHART */}
          {monthWiseData && (
            <Grow in timeout={900}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  borderRadius: "12px",
                  border: "1px solid #334155",
                }}
              >
                <Typography variant="h6" sx={{ color: "#facc15", mb: 2 }}>
                  📈 {selectedAppliance} — Month-wise Trend
                </Typography>
                <Box sx={{ height: 220 }}>
                  <Line
                    data={{
                      labels: monthWiseData.labels,
                      datasets: [
                        {
                          label: `${selectedAppliance} (Units)`,
                          data: monthWiseData.values,
                          borderColor: "#38bdf8",
                          backgroundColor: "rgba(56,189,248,0.2)",
                          fill: true,
                          tension: 0.3,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: "#e2e8f0" } } },
                      scales: {
                        x: { ticks: { color: "#94a3b8" } },
                        y: { beginAtZero: true, ticks: { color: "#94a3b8" } },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grow>
          )}
        </>
      )}
    </Box>
  );
};

export default DistributionPage;
