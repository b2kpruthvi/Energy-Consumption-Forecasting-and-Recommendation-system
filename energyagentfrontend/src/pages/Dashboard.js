import React, { useEffect, useState } from "react";
import "../styles/style.css";

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

        // Fetch forecast data if available
        const forecastRes = await fetch("http://127.0.0.1:5000/forecast");
        const forecastData = await forecastRes.json();

        // Fetch recommendations
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
    <div className="page-container">
      {/* Sidebar */}
      <nav className="sidebar">
        <ul>
          <li><a href="/dataset">Dataset Upload</a></li>
          <li><a href="/overview">Overview</a></li>
          <li><a href="/distribution">Distribution</a></li>
          <li><a href="/forecasting">Forecasting</a></li>
          <li><a href="/recommendation">Recommendation</a></li>
          <li><a href="/dashboard" className="active">Dashboard</a></li>
        </ul>
      </nav>

      {/* Main Dashboard */}
      <main className="overview-main">
        <h2 className="overview-title">📊 Energy Analytics Dashboard</h2>

        {loading ? (
          <p>Loading insights...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-container">
              <div className="card highlight">
                <h3>Total Energy Used</h3>
                <p>{summary.totalEnergy} kWh</p>
              </div>
              <div className="card">
                <h3>Average Energy per Month</h3>
                <p>{summary.averageEnergy} kWh</p>
              </div>
              <div className="card">
                <h3>Highest Consumption</h3>
                <p>{summary.highestMonth}</p>
              </div>
              <div className="card">
                <h3>Lowest Consumption</h3>
                <p>{summary.lowestMonth}</p>
              </div>
              <div className="card">
                <h3>Forecasted Days</h3>
                <p>{summary.forecastDays}</p>
              </div>
            </div>

            {/* Recommendations Summary */}
            <div className="chart-section">
              <h3>💡 Key Energy Recommendations</h3>
              {recommendations.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {recommendations.slice(0, 5).map((rec, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "12px",
                        background: "#f9fafb",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <strong>{rec.device}:</strong> {rec.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recommendations available.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
