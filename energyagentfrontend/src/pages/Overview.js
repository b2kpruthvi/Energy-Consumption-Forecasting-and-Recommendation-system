import React, { useEffect, useState } from "react";
import "../pages/Overview.css";
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
    const dateIndex = 0;
    const unitsIndex = header.indexOf("Units");

    if (unitsIndex === -1) {
      alert("❌ 'Units' column not found in dataset.");
      return;
    }

    let totalEnergySum = 0;
    const daily = {};
    const monthly = {};

    rows.forEach((r) => {
      const d = r[dateIndex];
      const val = parseFloat(r[unitsIndex]);
      if (isNaN(val) || !d) return;

      totalEnergySum += val;
      daily[d] = (daily[d] || 0) + val;

      const obj = new Date(d);
      if (!isNaN(obj)) {
        const key = `${obj.getFullYear()}-${String(obj.getMonth() + 1).padStart(2, "0")}`;
        monthly[key] = (monthly[key] || 0) + val;
      }
    });

    const totalDays = Object.keys(daily).length;
    setTotalEnergy(totalEnergySum.toFixed(2));
    setAverageEnergy((totalEnergySum / totalDays || 0).toFixed(2));
    setTotalRecords(rows.length);

    const dailyArr = Object.entries(daily).map(([date, units]) => ({ date, units }));
    const monthlyArr = Object.entries(monthly).map(([month, units]) => ({ month, units }));

    setChartData(dailyArr);
    setMonthlyData(monthlyArr);

    if (monthlyArr.length) {
      const sorted = [...monthlyArr].sort((a, b) => b.units - a.units);
      setHighestMonth(`${sorted[0].month} (${sorted[0].units.toFixed(2)} kWh)`);
      setLowestMonth(`${sorted.at(-1).month} (${sorted.at(-1).units.toFixed(2)} kWh)`);
    }
  }, []);

  return (
    <div className="overview-page">
      <div className="page-header">
        <h2>⚡ Energy Overview Dashboard</h2>
        <p>Monitor your daily and monthly energy usage patterns.</p>
      </div>

      {/* Summary Cards */}
      <div className="info-grid">
        <div className="info-card highlight">
          <h3>Total Energy</h3>
          <p>{totalEnergy} kWh</p>
        </div>
        <div className="info-card">
          <h3>Average / Day</h3>
          <p>{averageEnergy} kWh</p>
        </div>
        <div className="info-card">
          <h3>Total Records</h3>
          <p>{totalRecords}</p>
        </div>
        <div className="info-card">
          <h3>Highest Month</h3>
          <p>{highestMonth || "—"}</p>
        </div>
        <div className="info-card">
          <h3>Lowest Month</h3>
          <p>{lowestMonth || "—"}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <section className="chart-section wide">
        <h3>📈 Daily Energy Usage</h3>
        <ResponsiveContainer width="100%" height={550}>
          <LineChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00acc1" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#80deea" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="units"
              stroke="url(#dailyGradient)"
              strokeWidth={4}
              dot={false}
              animationDuration={1800}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Monthly Chart */}
      <section className="chart-section wide">
        <h3>📅 Monthly Energy Usage</h3>
        <ResponsiveContainer width="100%" height={550}>
          <LineChart data={monthlyData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#a5d6a7" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="units"
              stroke="url(#monthlyGradient)"
              strokeWidth={4}
              dot={false}
              animationDuration={1800}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

export default Overview;
