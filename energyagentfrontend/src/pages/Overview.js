import React, { useEffect, useState } from "react";
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

function Overview() {
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [averageEnergy, setAverageEnergy] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [highestMonth, setHighestMonth] = useState("");
  const [lowestMonth, setLowestMonth] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("dataset");
    if (!stored) {
      alert("Please upload the dataset first!");
      return;
    }

    const data = JSON.parse(stored);
    if (!data || data.length < 2) {
      alert("Invalid dataset.");
      return;
    }

    const header = data[0];
    const rows = data.slice(1);

    const dateIndex = 0; // assuming first column is date
    const unitsIndex = header.indexOf("Units");

    if (unitsIndex === -1) {
      alert("❌ 'Units' column not found in dataset.");
      return;
    }

    let totalEnergySum = 0;
    const dailyUsage = {};
    const monthlyUsage = {};

    rows.forEach((row) => {
      const dateStr = row[dateIndex];
      const units = parseFloat(row[unitsIndex]);
      if (!isNaN(units) && dateStr) {
        totalEnergySum += units;

        // Daily usage
        dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + units;

        // Monthly aggregation
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
          const monthKey = `${dateObj.getFullYear()}-${String(
            dateObj.getMonth() + 1
          ).padStart(2, "0")}`;
          monthlyUsage[monthKey] = (monthlyUsage[monthKey] || 0) + units;
        }
      }
    });

    const totalDays = Object.keys(dailyUsage).length;
    const avgEnergy = totalDays > 0 ? totalEnergySum / totalDays : 0;

    setTotalEnergy(totalEnergySum.toFixed(2));
    setAverageEnergy(avgEnergy.toFixed(2));
    setTotalRecords(rows.length);

    // Convert daily usage to chart data
    const chartArray = Object.entries(dailyUsage).map(([date, units]) => ({
      date,
      units,
    }));
    setChartData(chartArray);

    // Convert monthly usage to chart data
    const monthlyArray = Object.entries(monthlyUsage).map(([month, units]) => ({
      month,
      units,
    }));

    setMonthlyData(monthlyArray);

    // Determine highest & lowest consumption months
    if (monthlyArray.length > 0) {
      const sorted = [...monthlyArray].sort((a, b) => b.units - a.units);
      setHighestMonth(`${sorted[0].month} (${sorted[0].units.toFixed(2)} kWh)`);
      setLowestMonth(
        `${sorted[sorted.length - 1].month} (${sorted[
          sorted.length - 1
        ].units.toFixed(2)} kWh)`
      );
    }
  }, []);

  return (
    <div className="page-container">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="overview-main">
        <h2 className="overview-title">📊 Energy Consumption Overview</h2>

        {/* Summary Cards */}
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

        {/* Daily Line Chart */}
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

        {/* Monthly Line Chart */}
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
      </main>
    </div>
  );
}

export default Overview;
