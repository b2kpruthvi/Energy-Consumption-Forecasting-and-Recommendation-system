import React, { useEffect, useState } from "react";
import "./Dashboard.css";

function Dashboard() {
  const [summary, setSummary] = useState({
    totalEnergy: 0,
    averageEnergy: 0,
    highestMonth: "",
    lowestMonth: "",
    forecastDays: 0,
  });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const stored = localStorage.getItem("dataset");
        if (!stored) {
          setLoading(false);
          return;
        }

        const data = JSON.parse(stored);
        const header = data[0];
        const rows = data.slice(1);
        const dateIndex = 0;
        const unitsIndex = header.indexOf("Units");

        if (unitsIndex === -1) return;

        let totalEnergy = 0;
        const monthlyUsage = {};

        rows.forEach((row) => {
          const date = new Date(row[dateIndex]);
          const units = parseFloat(row[unitsIndex]);
          if (!isNaN(units)) {
            totalEnergy += units;
            const month = date.toLocaleString("default", { month: "short", year: "numeric" });
            monthlyUsage[month] = (monthlyUsage[month] || 0) + units;
          }
        });

        const months = Object.entries(monthlyUsage);
        const highest = months.reduce((a, b) => (a[1] > b[1] ? a : b), ["", 0]);
        const lowest = months.reduce((a, b) => (a[1] < b[1] ? a : b), ["", 0]);

        const forecastRes = await fetch("http://127.0.0.1:5000/forecast");
        const forecastData = await forecastRes.json();

        const recRes = await fetch("http://127.0.0.1:5000/recommendations");
        const recData = await recRes.json();

        setSummary({
          totalEnergy: totalEnergy.toFixed(2),
          averageEnergy: (totalEnergy / months.length).toFixed(2),
          highestMonth: `${highest[0]} (${highest[1].toFixed(2)} kWh)`,
          lowestMonth: `${lowest[0]} (${lowest[1].toFixed(2)} kWh)`,
          forecastDays: forecastData.forecast ? forecastData.forecast.length : 0,
        });

        setRecommendations(recData.recommendations || []);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard Error:", err);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>⚡ Energy Analytics Dashboard</h1>
        <p>Insights, Trends, and Smart Recommendations</p>
      </header>

      {loading ? (
        <div className="loading-shimmer">
          <div className="shimmer-card"></div>
          <div className="shimmer-card"></div>
          <div className="shimmer-card"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card glow">
              <h3>Total Energy Used</h3>
              <p>{summary.totalEnergy} kWh</p>
            </div>
            <div className="summary-card">
              <h3>Average per Month</h3>
              <p>{summary.averageEnergy} kWh</p>
            </div>
            <div className="summary-card">
              <h3>Highest Month</h3>
              <p>{summary.highestMonth}</p>
            </div>
            <div className="summary-card">
              <h3>Lowest Month</h3>
              <p>{summary.lowestMonth}</p>
            </div>
            <div className="summary-card">
              <h3>Forecasted Days</h3>
              <p>{summary.forecastDays}</p>
            </div>
          </div>

          {/* Recommendations Section */}
          <section className="recommendation-section">
            <h2>💡 Smart Recommendations</h2>
            {recommendations.length > 0 ? (
              <ul className="recommendation-list">
                {recommendations.slice(0, 5).map((rec, i) => (
                  <li key={i} className="recommendation-item">
                    <span className="device">{rec.device}</span>
                    <p>{rec.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recommendations available.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;
