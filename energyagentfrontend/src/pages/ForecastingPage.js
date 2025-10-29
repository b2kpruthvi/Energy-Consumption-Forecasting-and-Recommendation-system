import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function ForecastingPage() {
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7); // default forecast period

  const handleForecast = async () => {
    try {
      setMessage("⏳ Generating forecast...");
      setForecastData([]);

      const res = await fetch("http://127.0.0.1:5000/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage("⚠️ " + data.error);
        return;
      }

      // Combine historical + forecast data
      const formatted = [];

      if (data.history) {
        Object.entries(data.history).forEach(([date, value]) =>
          formatted.push({ date, Actual: value })
        );
      }

      if (data.forecast) {
        Object.entries(data.forecast).forEach(([date, value]) => {
          const existing = formatted.find((d) => d.date === date);
          if (existing) existing.Forecast = value;
          else formatted.push({ date, Forecast: value });
        });
      }

      setForecastData(formatted);
      setMetrics(data.metrics || null);
      setMessage(`✅ ${data.message}`);
    } catch (err) {
      console.error(err);
      setMessage("❌ Error fetching forecast data.");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📈 Energy Consumption Forecasting
      </h2>

      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label>
          Forecast period:
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              marginLeft: "10px",
              padding: "6px",
              fontSize: "15px",
              borderRadius: "5px",
            }}
          >
            <option value={7}>Next 7 Days</option>
            <option value={30}>Next 30 Days</option>
            <option value={90}>Next 90 Days</option>
          </select>
        </label>

        <button
          onClick={handleForecast}
          style={{
            padding: "10px 18px",
            fontSize: "16px",
            borderRadius: "8px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Generate Forecast
        </button>
      </div>

      <p style={{ textAlign: "center", fontWeight: "bold", color: "#444" }}>
        {message}
      </p>

      {/* 📊 Forecast Chart */}
      {forecastData.length > 0 && (
        <div
          style={{
            background: "#fff",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
            Forecast vs Actual Trend
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={forecastData}>
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="#8884d8"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Forecast"
                stroke="#82ca9d"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 📋 Forecast Table */}
      {forecastData.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            overflowX: "auto",
            background: "#fff",
            borderRadius: "10px",
            padding: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ textAlign: "center" }}>Forecast Data Table</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              marginTop: "10px",
            }}
          >
            <thead style={{ background: "#4CAF50", color: "white" }}>
              <tr>
                <th style={{ padding: "10px" }}>Date</th>
                <th style={{ padding: "10px" }}>Actual</th>
                <th style={{ padding: "10px" }}>Forecast</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "8px" }}>{row.date}</td>
                  <td style={{ padding: "8px" }}>
                    {row.Actual ? row.Actual.toFixed(2) : "-"}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {row.Forecast ? row.Forecast.toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📈 Optional: Show metrics */}
      {metrics && (
        <div
          style={{
            marginTop: "30px",
            textAlign: "center",
            background: "#f9f9f9",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>Model Performance Metrics</h3>
          <p>MAE: {metrics.MAE}</p>
          <p>RMSE: {metrics.RMSE}</p>
          <p>MAPE: {metrics["MAPE (%)"]}%</p>
        </div>
      )}
    </div>
  );
}

export default ForecastingPage;
