import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_BASE = "http://127.0.0.1:5000/api/upload_dataset";

const FileUploadComponent = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage("");
    setMessageType("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessageType("error");
      setMessage("Please select a file first.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setMessageType("error");
      setMessage("You must be logged in to upload a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setUploading(true);
      const response = await axios.post(API_BASE, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setMessageType("success");
      setMessage(response.data.message || "File uploaded successfully!");
      setSelectedFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      setMessageType("error");
      if (error.response) {
        setMessage(
          error.response.data.error ||
            error.response.data.msg ||
            "An error occurred during upload."
        );
      } else {
        setMessage("Network error. Could not connect to the server.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: 4,
        textAlign: "center",
        background: "#0f172a",
        borderRadius: "12px",
        border: "1px solid #334155",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, color: "#38bdf8", fontWeight: 600 }}
      >
        Upload Energy Data (.csv)
      </Typography>

      <Box
        sx={{
          border: "2px dashed #334155",
          borderRadius: "10px",
          p: 3,
          mb: 2,
          background: "#1e293b",
        }}
      >
        <label
          htmlFor="file-upload"
          style={{
            display: "inline-block",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: "0.95rem",
          }}
        >
          {selectedFile
            ? `📄 ${selectedFile.name}`
            : "Click to choose your .csv or .xlsx file"}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        startIcon={<CloudUploadIcon />}
        disabled={!selectedFile || uploading}
        sx={{
          background: "#38bdf8",
          "&:hover": { background: "#0ea5e9" },
          textTransform: "none",
          px: 3,
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button>

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress sx={{ backgroundColor: "#1e293b" }} />
        </Box>
      )}

      {message && (
        <Alert
          severity={messageType === "success" ? "success" : "error"}
          sx={{ mt: 3 }}
        >
          {message}
        </Alert>
      )}
    </Paper>
  );
};

export default FileUploadComponent;
