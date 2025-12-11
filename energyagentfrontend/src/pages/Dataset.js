import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TablePagination,
  Alert,
  CircularProgress,
} from "@mui/material";

import FileUploadComponent from "./FileUploadComponent";
import ManualEntryComponent from "./ManualEntryComponent";

const API_BASE_URL = "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : null;
};

const Dataset = () => {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectStartDate, setSelectStartDate] = useState("");
  const [selectEndDate, setSelectEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleTabChange = (_, newValue) => {
    setTabValue(newValue);
    setMessage(null);
    setError(null);
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    try {
      const config = { params };
      if (headers) config.headers = headers;

      const response = await axios.get(`${API_BASE_URL}/data`, config);
      setData(response.data);
      if (!response.data || response.data.length === 0)
        setError("No data found for the selected range.");
    } catch (err) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter / Clear Filter
  const handleFilter = () => fetchData();
  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    fetchData();
  };

  // Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(data.map((row) => row.data_id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (data_id) => {
    setSelectedRows((prev) =>
      prev.includes(data_id)
        ? prev.filter((id) => id !== data_id)
        : [...prev, data_id]
    );
  };

  const handleSelectByDate = () => {
    if (!selectStartDate || !selectEndDate) {
      setError("Please select both start and end dates.");
      return;
    }
    const start = new Date(selectStartDate);
    const end = new Date(selectEndDate);
    const idsToSelect = data
      .filter((row) => {
        const rowDate = new Date(row.Date);
        return rowDate >= start && rowDate <= end;
      })
      .map((r) => r.data_id);
    if (idsToSelect.length === 0) {
      setError("No items found in that date range.");
      return;
    }
    setSelectedRows([...new Set([...selectedRows, ...idsToSelect])]);
    setMessage(`Selected ${idsToSelect.length} new items.`);
  };

  // Delete Selected
  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      setError("No rows selected to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selectedRows.length} selected rows?`)) return;
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const resp = await axios.delete(`${API_BASE_URL}/delete_data`, {
        headers,
        data: { ids: selectedRows },
      });
      setMessage(resp.data.message);
      setSelectedRows([]);
      fetchData();
    } catch {
      setError("Error deleting selected data.");
    }
  };

  // Pagination Controls
  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Box
      sx={{
        background: "#0f172a",
        color: "#e2e8f0",
        minHeight: "100vh",
        p: 4,
      }}
    >
      <Typography variant="h4" sx={{ mb: 3, color: "#38bdf8", fontWeight: "bold" }}>
        Dataset Management
      </Typography>

      {/* Tabs Header */}
      <Paper sx={{ background: "#1e293b", borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          centered
        >
          <Tab label="📊 My Data" />
          <Tab label="📤 Upload Dataset" />
          <Tab label="📝 Manual Entry" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Box>
          {/* --- Alerts --- */}
          {message && (
            <Alert
              severity="success"
              sx={{ mb: 2, background: "#065f46", color: "#a7f3d0" }}
              onClose={() => setMessage(null)}
            >
              {message}
            </Alert>
          )}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, background: "#7f1d1d", color: "#fecaca" }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* --- Filter Section --- */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: "#e2e8f0" }, label: { color: "#94a3b8" } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: "#e2e8f0" }, label: { color: "#94a3b8" } }}
              />
            </Grid>
            <Grid item xs={12} sm={4} display="flex" alignItems="center" gap={2}>
              <Button variant="contained" color="info" onClick={handleFilter}>
                Filter
              </Button>
              <Button variant="outlined" color="inherit" onClick={handleClearFilter}>
                Clear
              </Button>
            </Grid>
          </Grid>

          {/* --- Selection Controls --- */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <TextField
              label="Select From"
              type="date"
              value={selectStartDate}
              onChange={(e) => setSelectStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ input: { color: "#e2e8f0" }, label: { color: "#94a3b8" } }}
            />
            <TextField
              label="To"
              type="date"
              value={selectEndDate}
              onChange={(e) => setSelectEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ input: { color: "#e2e8f0" }, label: { color: "#94a3b8" } }}
            />
            <Button variant="outlined" color="info" onClick={handleSelectByDate}>
              Select Range
            </Button>

            {selectedRows.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteSelected}
              >
                Delete {selectedRows.length} Selected
              </Button>
            )}
          </Box>

          {/* --- Data Table --- */}
          {loading ? (
            <Box textAlign="center" mt={5}>
              <CircularProgress sx={{ color: "#38bdf8" }} />
            </Box>
          ) : (
            <Paper sx={{ background: "#1e293b", borderRadius: 2, p: 2 }}>
              {data.length > 0 ? (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="info"
                              onChange={handleSelectAll}
                              checked={
                                data.length > 0 &&
                                selectedRows.length === data.length
                              }
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>Date</TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>Units (kWh)</TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>Fan (hrs)</TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>AC (hrs)</TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>Refrigerator (hrs)</TableCell>
                          <TableCell sx={{ color: "#38bdf8" }}>Television (hrs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((row) => (
                            <TableRow
                              key={row.data_id}
                              hover
                              selected={selectedRows.includes(row.data_id)}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="info"
                                  checked={selectedRows.includes(row.data_id)}
                                  onChange={() => handleRowSelect(row.data_id)}
                                />
                              </TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.Date}</TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.Units}</TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.Fan}</TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.AirConditioner}</TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.Refrigerator}</TableCell>
                              <TableCell sx={{ color: "#e2e8f0" }}>{row.Television}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={data.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      color: "#e2e8f0",
                      ".MuiSelect-icon": { color: "#38bdf8" },
                      ".MuiTablePagination-toolbar": { color: "#94a3b8" },
                    }}
                  />
                </>
              ) : (
                <Typography align="center" sx={{ color: "#94a3b8", p: 3 }}>
                  No data available.
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* Upload Dataset Tab */}
      {tabValue === 1 && <FileUploadComponent />}

      {/* Manual Entry Tab */}
      {tabValue === 2 && <ManualEntryComponent />}
    </Box>
  );
};

export default Dataset;
