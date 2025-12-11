import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, CircularProgress } from "@mui/material";
import axios from "axios";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

const API_BASE = "http://localhost:5000/api";

const Overview = () => {
  const [summary, setSummary] = useState({
    totalEnergy: 0,
    averageEnergy: 0,
    totalRecords: 0,
    highestMonth: "",
    lowestMonth: "",
  });
  const [dailyChart, setDailyChart] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const resp = await axios.get(`${API_BASE}/data`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rows = Array.isArray(resp.data) ? resp.data : [];
        if (!rows.length) {
          setError("No data found. Please upload your dataset first.");
          setLoading(false);
          return;
        }

        // Normalize
        const normalized = rows.map((r) => ({
          Date: r.Date,
          Units: parseFloat(r.Units) || 0,
        }));

        normalized.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        let total = 0;
        const daily = {};
        const monthly = {};

        normalized.forEach((r) => {
          const d = new Date(r.Date);
          if (!isNaN(d)) {
            total += r.Units;
            const dayKey = d.toISOString().slice(0, 10);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            daily[dayKey] = (daily[dayKey] || 0) + r.Units;
            monthly[monthKey] = (monthly[monthKey] || 0) + r.Units;
          }
        });

        const dailyArr = Object.entries(daily).map(([date, val]) => ({ date, val }));
        const monthlyArr = Object.entries(monthly).map(([month, val]) => ({ month, val }));

        const totalDays = Object.keys(daily).length;
        const avg = totalDays ? total / totalDays : 0;
        const highest = monthlyArr.reduce((a, b) => (a.val > b.val ? a : b), monthlyArr[0]);
        const lowest = monthlyArr.reduce((a, b) => (a.val < b.val ? a : b), monthlyArr[0]);

        setSummary({
          totalEnergy: total.toFixed(2),
          averageEnergy: avg.toFixed(2),
          totalRecords: normalized.length,
          highestMonth: highest ? `${highest.month} (${highest.val.toFixed(2)} kWh)` : "—",
          lowestMonth: lowest ? `${lowest.month} (${lowest.val.toFixed(2)} kWh)` : "—",
        });
        setDailyChart(dailyArr);
        setMonthlyChart(monthlyArr);
      } catch (err) {
        console.error(err);
        setError("Error fetching data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dailyChartOptions = {
    title: { text: "📈 Daily Energy Usage (kWh)", left: "center", textStyle: { color: "#e2e8f0" } },
    tooltip: { trigger: "axis" },
    animationDuration: 800,
    animationEasing: "cubicOut",
    xAxis: { type: "category", data: dailyChart.map((d) => d.date), axisLabel: { color: "#94a3b8", rotate: 45 } },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8" } },
    series: [{
      data: dailyChart.map((d) => d.val.toFixed(2)),
      type: "line",
      smooth: true,
      symbol: "circle",
      lineStyle: { color: "#38bdf8", width: 3 },
      itemStyle: { color: "#38bdf8" },
      areaStyle: { color: "rgba(56,189,248,0.25)" },
    }],
    grid: { left: "5%", right: "5%", bottom: "15%", containLabel: true },
  };

  const monthlyChartOptions = {
    title: { text: "📅 Monthly Energy Usage", left: "center", textStyle: { color: "#e2e8f0" } },
    tooltip: { trigger: "axis" },
    animationDuration: 800,
    animationEasing: "cubicOut",
    xAxis: { type: "category", data: monthlyChart.map((d) => d.month), axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8" } },
    series: [{
      data: monthlyChart.map((d) => d.val.toFixed(2)),
      type: "bar",
      barWidth: 40,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#22c55e" },
          { offset: 1, color: "#14532d" },
        ]),
      },
    }],
    grid: { left: "5%", right: "5%", bottom: "15%", containLabel: true },
  };

  return (
    <Box
      sx={{
        p: 4,
        color: "#e2e8f0",
        background: "linear-gradient(180deg, #0f172a 0%, #0a0f1e 100%)",
        minHeight: "100vh",
      }}
    >
      <Typography
        variant="h4"
        align="center"
        sx={{ mb: 4, color: "#38bdf8", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}
      >
        <span role="img" aria-label="chart">📊</span> Energy Overview
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: "60vh" }}>
          <CircularProgress sx={{ color: "#38bdf8" }} />
        </Box>
      ) : error ? (
        <Typography color="error" align="center">{error}</Typography>
      ) : (
        <>
          {/* --- Summary Cards --- */}
          <Grid container spacing={3} justifyContent="center" sx={{ mb: 4 }}>
            {[
              { label: "Total Energy", val: `${summary.totalEnergy} kWh`, color: "#22c55e" },
              { label: "Avg/Day", val: `${summary.averageEnergy} kWh`, color: "#38bdf8" },
              { label: "Records", val: summary.totalRecords, color: "#facc15" },
              { label: "Highest", val: summary.highestMonth, color: "#fb7185" },
              { label: "Lowest", val: summary.lowestMonth, color: "#a78bfa" },
            ].map((item) => (
              <Grid item xs={12} sm={6} md={2.3} key={item.label}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    background: "#1e293b",
                    border: `1px solid ${item.color}55`,
                    borderRadius: "12px",
                  }}
                >
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.9rem" }}>{item.label}</Typography>
                  <Typography sx={{ color: item.color, fontWeight: "bold", mt: 1 }}>{item.val}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* --- Charts Section (Stacked Full Width) --- */}
          <Grid
            container
            direction="column"
            spacing={4}
            sx={{
              width: "100%",
              px: { xs: 1, md: 6 },
              margin: "0 auto",
              maxWidth: "1600px", // gives some safe limit on very wide screens
            }}
          >
            {/* Daily Usage Chart */}
            <Grid item xs={12}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  borderRadius: "14px",
                  height: { xs: "400px", md: "480px" },
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  transition: "all 0.3s ease",
                  boxShadow: "0px 0px 8px rgba(56,189,248,0.1)",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0px 0px 20px rgba(56,189,248,0.25)",
                  },
                }}

                elevation={4}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: "#38bdf8",
                    fontWeight: 600,
                    mb: 2,
                    textAlign: "center",
                  }}
                >
                  📈 Daily Energy Usage
                </Typography>

                <Box sx={{ width: "100%", height: "100%" }}>
                  <ReactECharts
                    option={dailyChartOptions}
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "svg" }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Monthly Usage Chart */}
            <Grid item xs={12}>
              <Paper
                sx={{
                  background: "#1e293b",
                  p: 3,
                  borderRadius: "14px",
                  height: { xs: "400px", md: "480px" },
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  transition: "all 0.3s ease",
                  boxShadow: "0px 0px 8px rgba(56,189,248,0.1)",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0px 0px 20px rgba(56,189,248,0.25)",
                  },
                }}

                elevation={4}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: "#22c55e",
                    fontWeight: 600,
                    mb: 2,
                    textAlign: "center",
                  }}
                >
                  📅 Monthly Energy Usage
                </Typography>

                <Box sx={{ width: "100%", height: "100%" }}>
                  <ReactECharts
                    option={monthlyChartOptions}
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "svg" }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>


        </>
      )}
    </Box>
  );
};

export default Overview;
