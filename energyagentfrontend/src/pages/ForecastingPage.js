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
import './ForecastingPage.css'; // Use your existing CSS file

function ForecastingPage() {
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7); // default forecast period
  
  // --- 1. ADD NEW STATE FOR CITY ---
  // We'll set a default, but the user can change it.
  const [city, setCity] = useState("Gangavathi"); 
  
  const [isLoading, setIsLoading] = useState(false);

  const handleForecast = async () => {
    setIsLoading(true);
    setMessage("⏳ Generating forecast...");
    setForecastData([]);
    setMetrics(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setMessage("⚠️ You must be logged in to generate a forecast.");
        setIsLoading(false);
        return;
      }
      
      // 2. CHECK IF CITY IS EMPTY
      if (!city) {
        setMessage("⚠️ Please enter a city name for the weather forecast.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("http://127.0.0.1:5000/api/forecast_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        // --- 3. SEND THE CITY AND DAYS ---
        body: JSON.stringify({ 
          days: days,
          city: city 
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.error) {
        setMessage("⚠️ " + data.error);
        return;
      }

      // ... (rest of data formatting logic is unchanged) ...
      const formatted = [];
      if (data.history && data.historical_forecast) {
        const sortedHistory = Object.entries(data.history).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        );
        const recentHistory = sortedHistory.slice(-60);
        recentHistory.forEach(([date, actualValue]) => {
          const histForecastValue = data.historical_forecast[date];
          formatted.push({ 
            date: date, 
            Actual: actualValue, 
            Forecast: histForecastValue
          });
        });
      }

      if (data.forecast) {
        const sortedForecast = Object.entries(data.forecast).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        );
        sortedForecast.forEach(([date, futureForecastValue]) => {
          formatted.push({
            date: date,
            Actual: null,
            Forecast: futureForecastValue
          });
        });
      }

      setForecastData(formatted);
      setMetrics(data.metrics || null);
      setMessage(`✅ ${data.message || "Forecast generated"}`);

    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setMessage("❌ Network error. Could not connect to the server.");
    }
  };

  // --- Render ---
  return (
    <div className="forecast-container">
      
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📈 Energy Consumption Forecasting
      </h2>

      {/* --- 4. ADD CITY INPUT FIELD --- */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <label>
          City:
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="E.g., Bangalore"
            style={{
              marginLeft: "5px",
              padding: "6px",
              fontSize: "15px",
              borderRadius: "5px",
              border: "1px solid #ccc"
            }}
          />
        </label>
        
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
            <option value={14}>Next 14 Days</option>
            <option value={30}>Next 30 Days</option>
          </select>
        </label>

        <button
          onClick={handleForecast}
          disabled={isLoading}
          style={{
            padding: "10px 18px",
            fontSize: "16px",
            borderRadius: "8px",
            backgroundColor: isLoading ? "#aaa" : "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isLoading ? "Generating..." : "Generate Forecast"}
        </button>
      </div>

      {/* ... (rest of the JSX is unchanged) ... */}

      <p style={{ textAlign: "center", fontWeight: "bold", minHeight: "1.2em", color: "#444" }}>
        {message}
      </p>

      {forecastData.length > 0 && (
        <div className="chart-wrapper">
          <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
            Forecast vs Actual Trend
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={forecastData}>
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12}}
                interval="auto" 
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="#8884d8"
                dot={false}
                strokeWidth={2}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Forecast"
                stroke="#82ca9d"
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
          <h3>Model Performance Metrics (on historical data)</h3>
          <p>MAE: {metrics.MAE}</p>
          <p>RMSE: {metrics.RMSE}</p>
          <p>MAPE: {metrics["MAPE (%)"]}%</p>
        </div>
      )}

      {forecastData.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            maxHeight: "300px",
            overflowY: "auto",
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
            <thead style={{ background: "#4CAF50", color: "white", position: "sticky", top: 0 }}>
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
    </div>
  );
}

export default ForecastingPage;