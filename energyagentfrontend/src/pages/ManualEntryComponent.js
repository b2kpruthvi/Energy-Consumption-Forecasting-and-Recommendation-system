import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Dataset.css";

const toFloat = (val) => (val ? parseFloat(val) : 0);

const ManualEntryComponent = () => {
  const [formData, setFormData] = useState({
    Date: "",
    Temperature: "",
    Fan: "",
    Refrigerator: "",
    AirConditioner: "",
    Bulb: "",
    Television: "",
    Monitor: "",
    MotorPump: "",
    Extra: "",
    TariffRate: "6.76",
  });

  const [calculatedData, setCalculatedData] = useState({
    Fan_Units: "",
    Fridge_Units: "",
    AC_Units: "",
    Bulb_Units: "",
    TV_Units: "",
    Monitor_Units: "",
    Motor_Units: "",
    Units: "",
    ElectricityBill: "",
    Month: "",
  });

  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const performCalculation = (data) => {
    const Fan_Units = toFloat(data.Fan) * 0.075;
    const Fridge_Units = toFloat(data.Refrigerator) * 0.15;
    const AC_Units = toFloat(data.AirConditioner) * 1.2;
    const Bulb_Units = toFloat(data.Bulb) * 0.015;
    const TV_Units = toFloat(data.Television) * 0.1;
    const Monitor_Units = toFloat(data.Monitor) * 0.08;
    const Motor_Units = toFloat(data.MotorPump) * 0.75;
    const Extra = toFloat(data.Extra);
    const TariffRate = toFloat(data.TariffRate);

    const Total_Units =
      Fan_Units +
      Fridge_Units +
      AC_Units +
      Bulb_Units +
      TV_Units +
      Monitor_Units +
      Motor_Units +
      Extra;
    const Bill = Total_Units * TariffRate;

    return {
      Fan_Units: Fan_Units.toFixed(3),
      Fridge_Units: Fridge_Units.toFixed(3),
      AC_Units: AC_Units.toFixed(3),
      Bulb_Units: Bulb_Units.toFixed(3),
      TV_Units: TV_Units.toFixed(3),
      Monitor_Units: Monitor_Units.toFixed(3),
      Motor_Units: Motor_Units.toFixed(3),
      Units: Total_Units.toFixed(2),
      ElectricityBill: Bill.toFixed(2),
      Month: data.Date ? new Date(data.Date).getMonth() + 1 : "",
    };
  };

  useEffect(() => {
    const calc = performCalculation(formData);
    const focused = document.activeElement?.name;
    setCalculatedData((prev) => ({
      ...Object.fromEntries(
        Object.entries(calc).map(([k, v]) => [k, focused === k ? prev[k] : v])
      ),
    }));
  }, [formData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleCalculatedChange = (e) => {
    const { name, value } = e.target;
    const next = { ...calculatedData, [name]: value };
    if (name.endsWith("_Units") || name === "Extra") {
      const total =
        toFloat(next.Fan_Units) +
        toFloat(next.Fridge_Units) +
        toFloat(next.AC_Units) +
        toFloat(next.Bulb_Units) +
        toFloat(next.TV_Units) +
        toFloat(next.Monitor_Units) +
        toFloat(next.Motor_Units) +
        toFloat(formData.Extra);
      next.Units = total.toFixed(2);
      next.ElectricityBill = (total * toFloat(formData.TariffRate)).toFixed(2);
    }
    setCalculatedData(next);
  };

  const handleAddRow = () => {
    if (!formData.Date) {
      setMessageType("error");
      setMessage("Please select a date.");
      return;
    }
    const newRow = { ...formData, ...calculatedData };
    setRows([...rows, newRow]);
    setFormData({
      Date: "",
      Temperature: "",
      Fan: "",
      Refrigerator: "",
      AirConditioner: "",
      Bulb: "",
      Television: "",
      Monitor: "",
      MotorPump: "",
      Extra: "",
      TariffRate: "6.76",
    });
    setMessage("");
  };

  const handleDeleteRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const handleSubmitAll = async () => {
    if (!rows.length) {
      setMessageType("error");
      setMessage("No data to submit.");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) {
      setMessageType("error");
      setMessage("Please log in to save data.");
      return;
    }

    setMessageType("info");
    setMessage(`Submitting ${rows.length} records...`);
    try {
      for (const row of rows) {
        await axios.post("http://127.0.0.1:5000/api/add_daily_data", row, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setRows([]);
      setMessageType("success");
      setMessage("✅ Data saved successfully!");
    } catch {
      setMessageType("error");
      setMessage("⚠️ Network or server error.");
    }
  };

  return (
    <div className="manual-page">
      <div className="manual-card">
        <h2>📅 Manual Daily Entry</h2>
        <p className="subtitle">
          Enter daily usage hours — Units auto-calculate but remain editable.
        </p>

        <div className="form-grid">
          <label>
            Date*
            <input
              type="date"
              name="Date"
              value={formData.Date}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Temperature (°C)
            <input
              type="number"
              name="Temperature"
              value={formData.Temperature}
              onChange={handleFormChange}
            />
          </label>

          {[
            ["Fan", "Fan_Units"],
            ["Refrigerator", "Fridge_Units"],
            ["AirConditioner", "AC_Units"],
            ["Bulb", "Bulb_Units"],
            ["Television", "TV_Units"],
            ["Monitor", "Monitor_Units"],
            ["MotorPump", "Motor_Units"],
          ].map(([h, u]) => (
            <React.Fragment key={h}>
              <label>
                {h.replace(/([A-Z])/g, " $1")} (hrs)
                <input
                  type="number"
                  name={h}
                  value={formData[h]}
                  onChange={handleFormChange}
                />
              </label>
              <label>
                {h.replace(/([A-Z])/g, " $1")} (Units)
                <input
                  type="number"
                  name={u}
                  value={calculatedData[u] || ""}
                  onChange={handleCalculatedChange}
                />
              </label>
            </React.Fragment>
          ))}
        </div>

        <div className="form-summary">
          <label>
            Extra (Units)
            <input
              type="number"
              name="Extra"
              value={formData.Extra}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Tariff Rate
            <input
              type="number"
              name="TariffRate"
              value={formData.TariffRate}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Total Units
            <input
              type="text"
              value={calculatedData.Units || ""}
              readOnly
              disabled
            />
          </label>

          <label>
            Bill (₹)
            <input
              type="text"
              value={calculatedData.ElectricityBill || ""}
              readOnly
              disabled
            />
          </label>

          <div className="action-btn">
            <button
              className="primary-btn"
              onClick={handleAddRow}
              disabled={!formData.Date}
            >
              ➕ Add Day
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="table-wrapper">
            <h3>📊 Data to Submit ({rows.length})</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Temp</th>
                  <th>Fan(h)</th>
                  <th>Fan(U)</th>
                  <th>Fridge(h)</th>
                  <th>Fridge(U)</th>
                  <th>AC(h)</th>
                  <th>AC(U)</th>
                  <th>Bulb(h)</th>
                  <th>Bulb(U)</th>
                  <th>TV(h)</th>
                  <th>TV(U)</th>
                  <th>Monitor(h)</th>
                  <th>Monitor(U)</th>
                  <th>Motor(h)</th>
                  <th>Motor(U)</th>
                  <th>Month</th>
                  <th>Total</th>
                  <th>Extra</th>
                  <th>Tariff</th>
                  <th>Bill</th>
                  <th>❌</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.Date}</td>
                    <td>{r.Temperature}</td>
                    <td>{r.Fan}</td>
                    <td>{r.Fan_Units}</td>
                    <td>{r.Refrigerator}</td>
                    <td>{r.Fridge_Units}</td>
                    <td>{r.AirConditioner}</td>
                    <td>{r.AC_Units}</td>
                    <td>{r.Bulb}</td>
                    <td>{r.Bulb_Units}</td>
                    <td>{r.Television}</td>
                    <td>{r.TV_Units}</td>
                    <td>{r.Monitor}</td>
                    <td>{r.Monitor_Units}</td>
                    <td>{r.MotorPump}</td>
                    <td>{r.Motor_Units}</td>
                    <td>{r.Month}</td>
                    <td>{r.Units}</td>
                    <td>{r.Extra}</td>
                    <td>{r.TariffRate}</td>
                    <td>{r.ElectricityBill}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteRow(i)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <button className="primary-btn save" onClick={handleSubmitAll}>
            💾 Save All
          </button>
        )}

        {message && <div className={`message-box ${messageType}`}>{message}</div>}
      </div>
    </div>
  );
};

export default ManualEntryComponent;
