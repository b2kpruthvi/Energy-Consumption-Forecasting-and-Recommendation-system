import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import './ForecastingPage.css'; // Your existing CSS file

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ForecastingPage = () => {
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setForecastData(null);

    const token = localStorage.getItem('access_token');
    if (!token) {
      setErrorMessage('You must be logged in to view forecasts.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://127.0.0.1:5000/forecast', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setForecastData(response.data);
      setIsLoading(false);

    } catch (error) {
      setIsLoading(false);
      if (error.response) {
        setErrorMessage(error.response.data.error || error.response.data.msg || 'Failed to fetch forecast.');
      } else {
        setErrorMessage('Network error. Could not connect to the server.');
      }
    }
  };

  // --- Chart Data ---
  const chartData = {
    labels: forecastData ? [...forecastData.historical_dates, ...forecastData.forecast_dates] : [],
    datasets: [
      {
        label: 'Historical Daily Average',
        data: forecastData ? forecastData.historical_values : [],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        pointRadius: 1,
        tension: 0.1 
      },
      {
        label: 'Forecasted Data',
        data: forecastData ? 
              (new Array(forecastData.historical_values.length).fill(null)).concat(forecastData.forecast_values) 
              : [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true, 
        borderDash: [5, 5], 
        pointRadius: 2,
        tension: 0.1
      }
    ]
  };

  // --- UPDATED CHART OPTIONS ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // <-- THIS IS THE CRITICAL CHANGE
    interaction: {
      mode: 'index', 
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Average Energy Forecast',
        font: { size: 20, weight: 'bold', family: "'Segoe UI', Arial, sans-serif" }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: true,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          font: { size: 14, weight: 'bold' }
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10 
        }
      },
      y: {
        title: {
          display: true,
          text: 'Energy (Units)',
          font: { size: 14, weight: 'bold' }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuad'
    }
  };
  
  // --- Render Logic ---
  return (
    // The h2 title has been removed from here
    <div className="forecast-container"> 
      
      {isLoading && <p className="loading-message">Generating forecast, please wait...</p>}
      
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      
      {forecastData && (
        <div className="chart-wrapper">
          <Line options={chartOptions} data={chartData} />
        </div>
      )}
    </div>
  );
};

export default ForecastingPage;