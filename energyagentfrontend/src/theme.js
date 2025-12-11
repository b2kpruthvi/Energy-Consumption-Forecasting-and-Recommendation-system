import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a", // page background
      paper: "#1e293b", // cards, tables, etc.
    },
    primary: {
      main: "#38bdf8", // cyan
    },
    secondary: {
      main: "#22c55e", // green
    },
    error: {
      main: "#ef4444", // red
    },
    text: {
      primary: "#e2e8f0", // light text
      secondary: "#94a3b8", // muted text
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e293b",
          color: "#e2e8f0",
          borderRadius: "10px",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-root": {
            color: "#e2e8f0",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148,163,184,0.4)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#38bdf8",
          },
          "& .MuiInputLabel-root": {
            color: "#94a3b8",
          },
        },
      },
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    allVariants: {
      color: "#e2e8f0",
    },
  },
});

export default theme;
