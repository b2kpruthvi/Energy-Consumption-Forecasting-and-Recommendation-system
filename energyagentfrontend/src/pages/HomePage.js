import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Avatar,
  useTheme,
  Fade,
} from "@mui/material";
import {
  CloudUpload,
  Assessment,
  Timeline,
  BarChart,
} from "@mui/icons-material";

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      title: "Upload Dataset",
      desc: "Start by uploading your energy consumption CSV file.",
      icon: <CloudUpload />,
      path: "/dataset",
      color: "#22c55e",
    },
    {
      title: "Overview",
      desc: "View statistics and summaries of your energy data.",
      icon: <Assessment />,
      path: "/overview",
      color: "#38bdf8",
    },
    {
      title: "Forecasting",
      desc: "Predict future energy consumption trends.",
      icon: <Timeline />,
      path: "/forecasting",
      color: "#facc15",
    },
    {
      title: "Distribution",
      desc: "Visualize appliance-wise energy usage patterns.",
      icon: <BarChart />,
      path: "/distribution",
      color: "#fb7185",
    },
  ];

  return (
    <Fade in={true} timeout={700}>
      <Box
        sx={{
          minHeight: "100vh",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          py: 6,
          background:
            "radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 80%)",
        }}
      >
        {/* Header */}
        <Typography
          variant="h4"
          sx={{
            mb: 2,
            fontWeight: "bold",
            color: "#38bdf8",
            textShadow: "0 0 8px #0ea5e9",
          }}
        >
          ⚡ Welcome to EnergyAgent
        </Typography>

        <Typography
          variant="h6"
          sx={{ maxWidth: 600, mb: 5, color: "#cbd5e1" }}
        >
          Your smart dashboard for analyzing, forecasting, and optimizing
          energy usage.
        </Typography>

        {/* Cards Grid */}
        <Grid
          container
          spacing={3}
          justifyContent="center"
          sx={{ width: "90%", maxWidth: "1100px" }}
        >
          {features.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card
                sx={{
                  background:
                    "linear-gradient(145deg, rgba(30,41,59,0.85), rgba(15,23,42,0.9))",
                  border: `1px solid ${f.color}`,
                  boxShadow: `0 0 12px ${f.color}44`,
                  borderRadius: "16px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: `0 0 24px ${f.color}99`,
                  },
                }}
              >
                <CardActionArea onClick={() => navigate(f.path)}>
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      p: 3,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: `${f.color}33`,
                        color: f.color,
                        mb: 2,
                        width: 60,
                        height: 60,
                        border: `2px solid ${f.color}`,
                        fontSize: 28,
                      }}
                    >
                      {f.icon}
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", mb: 1, color: f.color }}
                    >
                      {f.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#94a3b8",
                        lineHeight: 1.4,
                      }}
                    >
                      {f.desc}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Typography
          variant="body2"
          sx={{ mt: 8, color: "#64748b", fontSize: "0.9rem" }}
        >
          EnergyAgent © {new Date().getFullYear()} — Powered by Smart Analytics
        </Typography>
      </Box>
    </Fade>
  );
};

export default HomePage;
