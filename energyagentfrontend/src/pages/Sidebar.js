import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Box,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Home,
  CloudUpload,
  Assessment,
  Timeline,
  BarChart,
  PowerSettingsNew,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const drawerWidth = 220;

const Sidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const menuItems = [
    { text: "Home", icon: <Home />, path: "/home" },
    { text: "Dataset", icon: <CloudUpload />, path: "/dataset" },
    { text: "Overview", icon: <Assessment />, path: "/overview" },
    { text: "Forecasting", icon: <Timeline />, path: "/forecasting" },
    { text: "Distribution", icon: <BarChart />, path: "/distribution" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 70,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 70,
          bgcolor: "#1e293b",
          color: "#e2e8f0",
          transition: "width 0.3s",
          borderRight: "1px solid #334155",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between", // 👈 ensures logout is pinned at bottom
        },
      }}
    >
      {/* --- Header Section --- */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            px: 2,
            py: 2,
          }}
        >
          {open && (
            <h2 style={{ fontSize: "1.2rem", margin: 0, color: "#38bdf8" }}>
              ⚡ EnergyAgent
            </h2>
          )}
          <IconButton onClick={() => setOpen(!open)} sx={{ color: "#94a3b8" }}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "#334155" }} />

        {/* --- Menu Items --- */}
        <List>
          {menuItems.map((item) => (
            <Tooltip
              key={item.text}
              title={!open ? item.text : ""}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  color: "#e2e8f0",
                  "&:hover": { bgcolor: "#334155" },
                  py: 1.2,
                }}
              >
                <ListItemIcon sx={{ color: "#38bdf8", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: "0.95rem" }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Box>

      {/* --- Logout Section pinned bottom --- */}
      <Box sx={{ mt: "auto" }}>
        <Divider sx={{ borderColor: "#334155" }} />
        <Tooltip title={!open ? "Logout" : ""} placement="right" arrow>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              color: "#f87171",
              "&:hover": { bgcolor: "#7f1d1d" },
              py: 1.5,
            }}
          >
            <ListItemIcon sx={{ color: "#f87171", minWidth: 40 }}>
              <PowerSettingsNew />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontSize: "0.95rem" }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
