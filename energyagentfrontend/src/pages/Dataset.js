// src/pages/Dataset.js
import React, { useState } from "react";

const Dataset = () => {
  const [previewTable, setPreviewTable] = useState("");

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("Please select a file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result.trim();
      const rows = content.split("\n").map((row) => row.split(","));

      if (rows.length < 2) {
        alert("Invalid or empty dataset.");
        return;
      }

      // Save dataset to localStorage
      localStorage.setItem("dataset", JSON.stringify(rows));

      // Build HTML preview
      const tableHtml = `
        <table border='1'>
          ${rows
            .slice(0, 6)
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${cell.trim()}</td>`).join("")}</tr>`
            )
            .join("")}
        </table>
      `;
      setPreviewTable(tableHtml);

      alert("✅ Dataset uploaded successfully!");
    };

    reader.readAsText(file);
  };

  return (
    <div className="page-container">
      {/* Sidebar */}
      <nav className="sidebar">
        <ul>
          <li><a href="/dataset">Dataset Upload</a></li>
          <li><a href="/overview">Overview</a></li>
          <li><a href="/distribution">Distribution</a></li>
          <li><a href="/forecasting">Forecasting</a></li>
          <li><a href="/recommendation">Recommendation</a></li>
          <li><a href="/prediction">Prediction</a></li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="content">
        <h2>Upload Dataset</h2>
        <div className="upload-container">
          <input type="file" accept=".csv,.xlsx" onChange={handleUpload} />
        </div>

        <h3>Preview Data</h3>
        <div
          id="previewContainer"
          dangerouslySetInnerHTML={{ __html: previewTable }}
        ></div>
      </main>
    </div>
  );
};

export default Dataset;
