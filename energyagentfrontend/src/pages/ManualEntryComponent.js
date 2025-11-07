import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dataset.css'; // Uses the shared CSS

// Helper function to convert form data (which is all strings) to numbers
const toFloat = (val) => val ? parseFloat(val) : 0;

const ManualEntryComponent = () => {
  // State for all 21 form fields
  const [formData, setFormData] = useState({
    Date: '', Temperature: '', Fan: '', Refrigerator: '', AirConditioner: '',
    Bulb: '', Television: '', Monitor: '', MotorPump: '', Extra: '', TariffRate: '6.76' // Default Tariff
  });

  // State for the data rows in the table
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // --- Auto-Calculation Logic ---
  const calculateData = () => {
    const Fan = toFloat(formData.Fan);
    const Refrigerator = toFloat(formData.Refrigerator);
    const AirConditioner = toFloat(formData.AirConditioner);
    const Bulb = toFloat(formData.Bulb);
    const Television = toFloat(formData.Television);
    const Monitor = toFloat(formData.Monitor);
    const MotorPump = toFloat(formData.MotorPump);
    const TariffRate = toFloat(formData.TariffRate);
    const Extra = toFloat(formData.Extra);
    
    // These calculations are guesstimates based on your sample.
    // You can change the multipliers (e.g., 0.075, 0.15)
    const Fan_Units = Fan * 0.075; // Assuming 75W fan
    const Fridge_Units = Refrigerator * 0.15; // Assuming 150W fridge
    const AC_Units = AirConditioner * 1.2; // Assuming 1200W AC
    const Bulb_Units = Bulb * 0.015; // Assuming 15W bulb
    const TV_Units = Television * 0.1; // Assuming 100W TV
    const Monitor_Units = Monitor * 0.08; // Assuming 80W Monitor
    const Motor_Units = MotorPump * 0.75; // Assuming 750W Motor
    
    const Total_Units = Fan_Units + Fridge_Units + AC_Units + Bulb_Units + TV_Units + Monitor_Units + Motor_Units + Extra;
    const Bill = Total_Units * TariffRate;
    
    // Return all calculated data
    return {
      ...formData,
      Fan_Units: Fan_Units.toFixed(3),
      Fridge_Units: Fridge_Units.toFixed(3),
      AC_Units: AC_Units.toFixed(3),
      Bulb_Units: Bulb_Units.toFixed(3),
      TV_Units: TV_Units.toFixed(3),
      Monitor_Units: Monitor_Units.toFixed(3),
      Motor_Units: Motor_Units.toFixed(3),
      Units: Total_Units.toFixed(2),
      ElectricityBill: Bill.toFixed(2),
      Month: formData.Date ? new Date(formData.Date).getMonth() + 1 : 0
    };
  };

  // Update state when user types in the form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add the completed form data to the table
  const handleAddRow = () => {
    if (!formData.Date) {
      setMessageType('error');
      setMessage('Date is required to add a row.');
      return;
    }
    const calculatedRow = calculateData();
    setRows([...rows, calculatedRow]);
    // Clear form for next entry
    setFormData({
      Date: '', Temperature: '', Fan: '', Refrigerator: '', AirConditioner: '',
      Bulb: '', Television: '', Monitor: '', MotorPump: '', Extra: '', TariffRate: '6.76'
    });
    setMessage('');
  };

  // Delete a row from the table
  const handleDeleteRow = (indexToDelete) => {
    setRows(rows.filter((_, index) => index !== indexToDelete));
  };

  // --- Submit all rows from the table to the database ---
  const handleSubmitAll = async () => {
    if (rows.length === 0) {
      setMessageType('error');
      setMessage('Please add at least one row of data to submit.');
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessageType('error');
      setMessage('You must be logged in to upload.');
      return;
    }

    // Send each row to the backend, one by one
    try {
      for (const row of rows) {
        await axios.post('http://127.0.0.1:5000/api/add_daily_data', row, {
          headers: {
            'Authorization': `Bearer ${token}` 
          }
        });
      }
      setMessageType('success');
      setMessage(`Successfully saved ${rows.length} data entries to the database!`);
      setRows([]); // Clear the table on success

    } catch (error) {
      setMessageType('error');
      if (error.response) {
        setMessage(error.response.data.error || 'An error occurred while saving.');
      } else {
        setMessage('Network error. Could not connect to the server.');
      }
    }
  };

  // Render the form
  return (
    <div className="manual-entry-container">
      <h2>Enter Daily Consumption Data</h2>
      <p>Enter the date and hours of use for each appliance. Units and Bill will be auto-calculated.</p>
      
      {/* --- Input Form (21 fields) --- */}
      <div className="form-row">
        <input type="date" name="Date" value={formData.Date} onChange={handleFormChange} />
        <input type="number" name="Temperature" value={formData.Temperature} onChange={handleFormChange} placeholder="Temperature (°C)" />
      </div>
      <div className="form-row">
        <input type="number" name="Fan" value={formData.Fan} onChange={handleFormChange} placeholder="Fan (Hours)" />
        <input type="number" name="Refrigerator" value={formData.Refrigerator} onChange={handleFormChange} placeholder="Refrigerator (Hours)" />
      </div>
      <div className="form-row">
        <input type="number" name="AirConditioner" value={formData.AirConditioner} onChange={handleFormChange} placeholder="AC (Hours)" />
        <input type="number" name="Bulb" value={formData.Bulb} onChange={handleFormChange} placeholder="Bulb (Hours)" />
      </div>
      <div className="form-row">
        <input type="number" name="Television" value={formData.Television} onChange={handleFormChange} placeholder="TV (Hours)" />
        <input type="number" name="Monitor" value={formData.Monitor} onChange={handleFormChange} placeholder="Monitor (Hours)" />
      </div>
      <div className="form-row">
        <input type="number" name="MotorPump" value={formData.MotorPump} onChange={handleFormChange} placeholder="Motor (Hours)" />
        <input type="number" name="Extra" value={formData.Extra} onChange={handleFormChange} placeholder="Extra (Units)" />
      </div>
       <div className="form-row">
        <input type="number" name="TariffRate" value={formData.TariffRate} onChange={handleFormChange} placeholder="Tariff Rate" />
        <button className="add-row-button" onClick={handleAddRow}>Add Day</button>
      </div>

      {/* --- Data Table Preview --- */}
      {rows.length > 0 && (
        <>
        <h3 style={{marginTop: '2rem'}}>Data to be Submitted</h3>
        <div style={{overflowX: 'auto'}}> {/* Makes table scrollable */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Temp</th>
                <th>Fan (h)</th>
                <th>Fan (U)</th>
                <th>Fridge (h)</th>
                <th>Fridge (U)</th>
                <th>AC (h)</th>
                <th>AC (U)</th>
                <th>Bulb (h)</th>
                <th>Bulb (U)</th>
                <th>TV (h)</th>
                <th>TV (U)</th>
                <th>Monitor (h)</th>
                <th>Monitor (U)</th>
                <th>Motor (h)</th>
                <th>Motor (U)</th>
                <th>Month</th>
                <th>Total Units</th>
                <th>Extra (U)</th>
                <th>Tariff</th>
                <th>Bill</th>
                <th>Del</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>{row.Date}</td>
                  <td>{row.Temperature}</td>
                  <td>{row.Fan}</td>
                  <td>{row.Fan_Units}</td>
                  <td>{row.Refrigerator}</td>
                  <td>{row.Fridge_Units}</td>
                  <td>{row.AirConditioner}</td>
                  <td>{row.AC_Units}</td>
                  <td>{row.Bulb}</td>
                  <td>{row.Bulb_Units}</td>
                  <td>{row.Television}</td>
                  <td>{row.TV_Units}</td>
                  <td>{row.Monitor}</td>
                  <td>{row.Monitor_Units}</td>
                  <td>{row.MotorPump}</td>
                  <td>{row.Motor_Units}</td>
                  <td>{row.Month}</td>
                  <td><strong>{row.Units}</strong></td>
                  <td>{row.Extra}</td>
                  <td>{row.TariffRate}</td>
                  <td><strong>{row.ElectricityBill}</strong></td>
                  <td>
                    <button className="delete-button" onClick={() => handleDeleteRow(index)}>
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* --- Submit Button --- */}
      <button 
        className="submit-manual-button" 
        onClick={handleSubmitAll}
        disabled={rows.length === 0}
      >
        Save All Data to Database
      </button>

      {message && (
        <div className={`upload-message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default ManualEntryComponent;