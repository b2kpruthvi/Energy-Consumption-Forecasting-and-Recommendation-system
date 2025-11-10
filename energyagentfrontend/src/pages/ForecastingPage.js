import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "./ForecastingPage.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ForecastingPage = () => {
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setForecastData(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setErrorMessage("You must be logged in to view forecasts.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get("http://127.0.0.1:5000/forecast", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForecastData(response.data);
    } catch (error) {
      if (error.response) {
        setErrorMessage(
          error.response.data.error ||
            error.response.data.msg ||
            "Failed to fetch forecast."
        );
      } else {
        setErrorMessage("Network error. Could not connect to the server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = {
    labels: forecastData
      ? [...forecastData.historical_dates, ...forecastData.forecast_dates]
      : [],
    datasets: [
      {
        label: "Historical Usage",
        data: forecastData ? forecastData.historical_values : [],
        borderColor: "#00B4D8",
        backgroundColor: "rgba(0, 180, 216, 0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: "Forecasted Usage",
        data: forecastData
          ? new Array(forecastData.historical_values.length)
              .fill(null)
              .concat(forecastData.forecast_values)
          : [],
        borderColor: "#FF6B6B",
        backgroundColor: "rgba(255, 107, 107, 0.2)",
        fill: true,
        borderDash: [6, 4],
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#E2E8F0" } },
      title: {
        display: true,
        text: "🔮 Energy Consumption Forecast",
        color: "#00FFE0",
        font: { size: 20, weight: "bold" },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 10,
        titleColor: "#fff",
        bodyColor: "#ddd",
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        ticks: { color: "#E2E8F0" },
        title: { display: true, text: "Date", color: "#E2E8F0" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      y: {
        ticks: { color: "#E2E8F0" },
        title: { display: true, text: "Energy (Units)", color: "#E2E8F0" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
    animation: { duration: 1200, easing: "easeInOutQuart" },
  };

  return (
    <div className="forecast-page">
      <header className="forecast-header">
        <h1>⚡ Energy Forecasting Dashboard</h1>
        <p>Predict your future energy consumption with AI-powered insights.</p>
      </header>

      <div className="forecast-controls">
        <button
          className="forecast-button"
          onClick={fetchForecast}
          disabled={isLoading}
        >
          {isLoading ? "⏳ Generating..." : "🔁 Generate Forecast"}
        </button>
      </div>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {forecastData && (
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {!forecastData && !errorMessage && !isLoading && (
        <p className="info-text">Click "Generate Forecast" to load predictions.</p>
      )}
    </div>
  );
};

export default ForecastingPage;
