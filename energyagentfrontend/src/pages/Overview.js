// src/pages/Overview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/style.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:5000/api";

function Overview() {
  const navigate = useNavigate();

  const [totalEnergy, setTotalEnergy] = useState(0);
  const [averageEnergy, setAverageEnergy] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [highestMonth, setHighestMonth] = useState("");
  const [lowestMonth, setLowestMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalizer: make sure date and units are available in consistent keys
  const normalizeRow = (row) => {
    // row may be objects with many key name variants.
    const r = { ...row };

    // Find date - several possible keys
    const dateKeys = ["Date", "date", "Timestamp", "timestamp", "time"];
    for (const k of dateKeys) {
      if (r[k]) {
        r.Date = r[k];
        break;
      }
    }

    // Find units - several variants
    const unitKeys = ["Units", "units", "Unit", "kWh", "Energy", "energy", "Units_kWh"];
    for (const k of unitKeys) {
      if (r[k] !== undefined && r[k] !== null && r[k] !== "") {
        r.Units = r[k];
        break;
      }
    }

    // If appliance columns exist as strings, convert to numbers where possible
    const numericCols = [
      "Units",
      "Fan",
      "Fan_Units",
      "Refrigerator",
      "Fridge_Units",
      "AirConditioner",
      "AC_Units",
      "Bulb",
      "Bulb_Units",
      "Television",
      "TV_Units",
      "Monitor",
      "Monitor_Units",
      "MotorPump",
      "Motor_Units",
      "Extra",
      "TariffRate",
      "ElectricityBill",
      "Temperature",
    ];
    for (const c of numericCols) {
      if (r[c] !== undefined && r[c] !== null && r[c] !== "") {
        const v = parseFloat(r[c]);
        r[c] = Number.isFinite(v) ? v : null;
      } else {
        r[c] = null;
      }
    }

    return r;
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      // If not logged in, redirect to login page (or you can show a message)
      navigate("/login");
      return;
    }

      const fetchData = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Not logged in. Please login to view your data.");
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const resp = await axios.get(`${API_BASE}/data`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      // DEBUG: log entire response to help troubleshooting
      console.debug("/api/data full response:", resp.status, resp.data);

      // Normalize accepted shapes:
      // 1) resp.data === array -> use it
      // 2) resp.data.data -> use it
      // 3) resp.data.rows -> use it (some servers use 'rows')
      let rows = [];
      if (Array.isArray(resp.data)) {
        rows = resp.data;
      } else if (resp.data && Array.isArray(resp.data.data)) {
        rows = resp.data.data;
      } else if (resp.data && Array.isArray(resp.data.rows)) {
        rows = resp.data.rows;
      } else if (resp.data && Array.isArray(resp.data.result)) {
        // another possible key
        rows = resp.data.result;
      } else {
        console.warn("Unexpected /api/data payload shape:", resp.data);
        rows = [];
      }

      console.debug("Normalized rows count:", rows.length);

      if (!rows || rows.length === 0) {
        setTotalEnergy(0);
        setAverageEnergy(0);
        setTotalRecords(0);
        setChartData([]);
        setMonthlyData([]);
        setHighestMonth("");
        setLowestMonth("");
        setError("No data found for this user. Upload or add some records.");
        return;
      }

      // Normalize rows and compute aggregates (same logic as before)
      const normalized = rows.map(normalizeRow);

      normalized.sort((a, b) => {
        const da = new Date(a.Date);
        const db = new Date(b.Date);
        return da - db;
      });

      let totalEnergySum = 0;
      const dailyUsage = {};
      const monthlyUsage = {};

      normalized.forEach((item) => {
        const units = item.Units;
        const dateStr = item.Date;
        if (!dateStr || units == null || Number.isNaN(units)) return;

        totalEnergySum += units;

        const d = new Date(dateStr);
        if (isNaN(d)) return;
        const dayKey = d.toISOString().slice(0, 10);
        dailyUsage[dayKey] = (dailyUsage[dayKey] || 0) + units;

        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyUsage[monthKey] = (monthlyUsage[monthKey] || 0) + units;
      });

      const totalDays = Object.keys(dailyUsage).length;
      const avgEnergy = totalDays > 0 ? totalEnergySum / totalDays : 0;

      const chartArray = Object.entries(dailyUsage).map(([date, units]) => ({ date, units }));
      chartArray.sort((a, b) => new Date(a.date) - new Date(b.date));

      const monthlyArray = Object.entries(monthlyUsage).map(([month, units]) => ({ month, units }));
      monthlyArray.sort((a, b) => (a.month > b.month ? 1 : -1));

      let hm = "";
      let lm = "";
      if (monthlyArray.length > 0) {
        const sorted = [...monthlyArray].sort((a, b) => b.units - a.units);
        hm = `${sorted[0].month} (${sorted[0].units.toFixed(2)} kWh)`;
        const last = sorted[sorted.length - 1];
        lm = `${last.month} (${last.units.toFixed(2)} kWh)`;
      }

      setTotalEnergy(totalEnergySum.toFixed(2));
      setAverageEnergy(avgEnergy.toFixed(2));
      setTotalRecords(normalized.length);
      setChartData(chartArray);
      setMonthlyData(monthlyArray);
      setHighestMonth(hm);
      setLowestMonth(lm);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 422 || err.response.status === 403)) {
        setError("Your session expired or is invalid. Please login again.");
        localStorage.removeItem("access_token");
        setTimeout(() => navigate("/login"), 900);
      } else {
        console.error("Overview fetch error:", err);
        setError("Could not load data. Try again or check server.");
      }
    } finally {
      setLoading(false);
    }
  };


    fetchData();
    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-container">
      <nav className="sidebar">
        <ul>
          <li><a href="/dataset">Dataset Upload</a></li>
          <li><a href="/overview" className="active">Overview</a></li>
          <li><a href="/distribution">Distribution</a></li>
          <li><a href="/forecasting">Forecasting</a></li>
          <li><a href="/recommendation">Recommendation</a></li>
          <li><a href="/prediction">Prediction</a></li>
        </ul>
      </nav>

      <main className="overview-main">
        <h2 className="overview-title">📊 Energy Consumption Overview</h2>

        {loading && <p>Loading user data...</p>}
        {error && !loading && <div className="message error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="summary-container">
              <div className="card">
                <h3>Average per Day</h3>
                <p>{averageEnergy} kWh/day</p>
              </div>
              <div className="card">
                <h3>Total Records</h3>
                <p>{totalRecords}</p>
              </div>
              <div className="card info">
                <h3>Highest Consumption Month</h3>
                <p>{highestMonth || "—"}</p>
              </div>
              <div className="card info">
                <h3>Lowest Consumption Month</h3>
                <p>{lowestMonth || "—"}</p>
              </div>
              <div className="card highlight">
                <h3>Total Energy</h3>
                <p>{totalEnergy} kWh</p>
              </div>
            </div>

            <div className="chart-section">
              <h3>📈 Daily Energy Usage Trend</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      label={{
                        value: "Units (kWh)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="units"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No daily chart data available</p>
              )}
            </div>

            <div className="chart-section">
              <h3>📅 Monthly Energy Usage Trend</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      label={{
                        value: "Units (kWh)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="units"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No monthly chart data available</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Overview;
