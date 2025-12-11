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
  BarChart,
  Bar,
  Rectangle,
} from "recharts";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Fade,
  Grow,
} from "@mui/material";

function ForecastingPage() {
  const [forecastData, setForecastData] = useState(null);
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(30);
  const [city, setCity] = useState("Bangalore");
  const [isLoading, setIsLoading] = useState(false);

  const handleForecast = async () => {
    setIsLoading(true);
    setMessage("Generating forecast...");
    setForecastData(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setMessage("Please log in to access forecast data.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("http://127.0.0.1:5000/api/forecast_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days, city }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.error) {
        setMessage("⚠️ " + data.error);
        return;
      }

      const chartData = [];

      if (data.history && data.historical_forecast) {
        const sortedHistory = Object.entries(data.history).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        );
        sortedHistory.slice(-60).forEach(([date, actualValue]) => {
          chartData.push({
            date,
            Actual: actualValue,
            Forecast: data.historical_forecast[date] || null,
          });
        });
      }

      if (data.forecast) {
        const sortedForecast = Object.entries(data.forecast).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        );
        sortedForecast.forEach(([date, value]) => {
          chartData.push({ date, Actual: null, Forecast: value });
        });
      }

      setForecastData({
        chartData,
        metrics: data.metrics || null,
        recommendations: data.recommendations || [],
        benchmark_data: data.benchmark_data || {},
      });

      setMessage(`✅ ${data.message || "Forecast generated successfully"}`);
    } catch (error) {
      console.error(error);
      setMessage("Network error. Could not connect to the backend.");
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      <Fade in timeout={600}>
        <Typography
          variant="h4"
          align="center"
          sx={{ mb: 4, color: "#38bdf8", fontWeight: "bold" }}
        >
          ⚡ Forecast Insights
        </Typography>
      </Fade>

      {/* --- Controls --- */}
      <Fade in timeout={800}>
        <Paper
          sx={{
            background: "#1e293b",
            p: 3,
            mb: 4,
            borderRadius: "12px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            border: "1px solid #334155",
          }}
        >
          <Typography sx={{ color: "#94a3b8" }}>City:</Typography>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter City"
            style={{
              padding: "8px",
              borderRadius: "6px",
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #334155",
            }}
          />

          <Typography sx={{ color: "#94a3b8" }}>Period:</Typography>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: "8px",
              borderRadius: "6px",
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #334155",
            }}
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>

          <Button
            variant="contained"
            onClick={handleForecast}
            disabled={isLoading}
            sx={{
              background: "#38bdf8",
              "&:hover": { background: "#0ea5e9" },
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Generating..." : "Generate Forecast"}
          </Button>
        </Paper>
      </Fade>

      <Typography align="center" sx={{ mb: 3, color: "#94a3b8" }}>
        {message}
      </Typography>

      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: "50vh" }}>
          <CircularProgress sx={{ color: "#38bdf8" }} />
        </Box>
      )}

      {!isLoading && forecastData && forecastData.chartData.length > 0 && (
        <>
          {/* Forecast Chart */}
          <Grow in timeout={1000}>
            <Paper
              sx={{
                background: "#1e293b",
                p: 3,
                mb: 4,
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
            >
              <Typography variant="h6" sx={{ color: "#38bdf8", mb: 2 }}>
                📈 Forecast vs Actual
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecastData.chartData}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Actual"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="Forecast"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    isAnimationActive={true}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grow>

          {/* Appliance Benchmark */}
          {forecastData.benchmark_data &&
            Object.keys(forecastData.benchmark_data).length > 0 && (
              <Grow in timeout={1200}>
                <Paper
                  sx={{
                    background: "#1e293b",
                    p: 3,
                    mb: 4,
                    borderRadius: "12px",
                    border: "1px solid #334155",
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#22c55e", mb: 2 }}>
                    ⚙️ Appliance Benchmark
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={Object.entries(forecastData.benchmark_data).map(([name, val]) => ({
                        Appliance: name,
                        "Your Usage": val.user.toFixed(2),
                        "Standard Usage": val.standard.toFixed(2),
                      }))}
                    >
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                      <XAxis dataKey="Appliance" tick={{ fill: "#94a3b8" }} />
                      <YAxis tick={{ fill: "#94a3b8" }} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="Your Usage"
                        fill="#38bdf8"
                        animationDuration={1000}
                        activeBar={<Rectangle fill="#60a5fa" stroke="#3b82f6" />}
                      />
                      <Bar
                        dataKey="Standard Usage"
                        fill="#22c55e"
                        animationDuration={1200}
                        activeBar={<Rectangle fill="#4ade80" stroke="#16a34a" />}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grow>
            )}

          {/* Model Metrics
          {forecastData.metrics && (
            <Fade in timeout={1400}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  mb: 4,
                  borderRadius: "12px",
                  border: "1px solid #334155",
                }}
              >
                <Typography variant="h6" sx={{ color: "#facc15", mb: 2 }}>
                  📊 Model Performance
                </Typography>
                <Typography>MAE: {forecastData.metrics.MAE}</Typography>
                <Typography>RMSE: {forecastData.metrics.RMSE}</Typography>
                <Typography>MAPE: {forecastData.metrics["MAPE (%)"]}%</Typography>
              </Paper>
            </Fade>
          )} */}

          {/* Recommendations */}
          {forecastData.recommendations.length > 0 && (
            <Fade in timeout={1600}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  mb: 4,
                  borderRadius: "12px",
                  border: "1px solid #334155",
                }}
              >
                <Typography variant="h6" sx={{ color: "#fb7185", mb: 2 }}>
                  💡 Smart Recommendations
                </Typography>
                {forecastData.recommendations.map((rec, idx) => (
                  <Typography
                    key={idx}
                    sx={{ mb: 1, color: "#e2e8f0" }}
                    dangerouslySetInnerHTML={{ __html: rec }}
                  />
                ))}
              </Paper>
            </Fade>
          )}
        </>
      )}
    </Box>
  );
}

export default ForecastingPage;
