import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dataset.css';

// --- Helper Functions ---
const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.error("No auth token found. Please log in.");
        return null;
    }
    return { 'Authorization': `Bearer ${token}` };
};

const toFloat = (val) => (val ? parseFloat(val) : 0);

// --- Main Component ---
function Dataset() {
    // --- States ---
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // --- Row Selection States ---
    const [selectedRows, setSelectedRows] = useState([]); // Will store data_ids
    const [selectStartDate, setSelectStartDate] = useState('');
    const [selectEndDate, setSelectEndDate] = useState('');


    // --- Modal States ---
    const [modalError, setModalError] = useState(null);
    const [modalMessage, setModalMessage] = useState(null);
    const [modalRows, setModalRows] = useState([]);
    const [modalFormData, setModalFormData] = useState({
        Date: '', Temperature: '', Fan: '', Refrigerator: '', AirConditioner: '',
        Bulb: '', Television: '', Monitor: '', MotorPump: '', Extra: '', TariffRate: '6.76'
    });

    // --- API Call: Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        // Clear message on each fetch
        setMessage(null); 
        const headers = getAuthHeaders();
        if (!headers) return;

        const params = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        try {
            const response = await axios.get(`${API_BASE_URL}/data`, { headers, params });
            setData(response.data);
            if (response.data.length === 0) {
                setError("No data found for the selected range.");
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setError(err.response.data.message);
                setData([]);
            } else {
                setError("An error occurred while fetching data.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Page Action Handlers (Filter, File) ---
    const handleFilter = () => fetchData();
    const handleClearFilter = () => {
        setStartDate('');
        setEndDate('');
        fetchData();
    };
    const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Please select a file first.");
            return;
        }
        setIsUploading(true);
        setError(null);
        setMessage(null);
        const headers = getAuthHeaders();
        if (!headers) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post(`${API_BASE_URL}/upload_dataset`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
            });
            setMessage(response.data.message);
            setSelectedFile(null);
            fetchData();
        } catch (err) {
            setError(err.response ? err.response.data.error : "File upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    // --- Row Selection and Deletion Handlers ---

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(data.map(row => row.data_id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleRowSelect = (e, data_id) => {
        if (e.target.checked) {
            setSelectedRows(prev => [...prev, data_id]);
        } else {
            setSelectedRows(prev => prev.filter(id => id !== data_id));
        }
    };

    const handleSelectByDate = () => {
        if (!selectStartDate || !selectEndDate) {
            setError("Please enter both a start and end date for selection.");
            return;
        }

        const start = new Date(selectStartDate);
        const end = new Date(selectEndDate);

        const idsToSelect = data
            .filter(row => {
                const rowDate = new Date(row.Date);
                return rowDate >= start && rowDate <= end;
            })
            .map(row => row.data_id);
        
        if(idsToSelect.length === 0) {
            setError("No items found in that date range to select.");
            return;
        }

        setSelectedRows(prev => [...new Set([...prev, ...idsToSelect])]);
        setMessage(`Selected ${idsToSelect.length} new items.`);
        setSelectStartDate('');
        setSelectEndDate('');
    };

    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) {
            setError("Please select rows to delete.");
            return;
        }
        
        if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} entries? This cannot be undone.`)) {
            return;
        }

        const headers = getAuthHeaders();
        if (!headers) return;

        try {
            const response = await axios.delete(`${API_BASE_URL}/delete_data`, {
                headers: headers,
                data: { ids: selectedRows }
            });

            setMessage(response.data.message);
            setSelectedRows([]); 
            fetchData(); // Refresh the table
        } catch (err) {
            setError(err.response ? err.response.data.error : "Delete failed.");
        }
    };


    // --- Modal Action Handlers (Manual Entry Logic) ---
    
    const calculateData = () => {
        const Fan = toFloat(modalFormData.Fan);
        const Refrigerator = toFloat(modalFormData.Refrigerator);
        const AirConditioner = toFloat(modalFormData.AirConditioner);
        const Bulb = toFloat(modalFormData.Bulb);
        const Television = toFloat(modalFormData.Television);
        const Monitor = toFloat(modalFormData.Monitor);
        const MotorPump = toFloat(modalFormData.MotorPump);
        const TariffRate = toFloat(modalFormData.TariffRate);
        const Extra = toFloat(modalFormData.Extra);
        
        const Fan_Units = Fan * 0.075;
        const Fridge_Units = Refrigerator * 0.15;
        const AC_Units = AirConditioner * 1.2;
        const Bulb_Units = Bulb * 0.015;
        const TV_Units = Television * 0.1;
        const Monitor_Units = Monitor * 0.08;
        const Motor_Units = MotorPump * 0.75;
        
        const Total_Units = Fan_Units + Fridge_Units + AC_Units + Bulb_Units + TV_Units + Monitor_Units + Motor_Units + Extra;
        const Bill = Total_Units * TariffRate;
        
        return {
          ...modalFormData,
          Fan_Units: Fan_Units.toFixed(3),
          Fridge_Units: Fridge_Units.toFixed(3),
          AC_Units: AC_Units.toFixed(3),
          Bulb_Units: Bulb_Units.toFixed(3),
          TV_Units: TV_Units.toFixed(3),
          Monitor_Units: Monitor_Units.toFixed(3),
          Motor_Units: Motor_Units.toFixed(3),
          Units: Total_Units.toFixed(2),
          ElectricityBill: Bill.toFixed(2),
          Month: modalFormData.Date ? new Date(modalFormData.Date).getMonth() + 1 : 0
        };
      };

    const handleModalFormChange = (e) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleModalAddRow = () => {
        if (!modalFormData.Date) {
            setModalError('Date is required to add a row.');
            return;
        }
        const calculatedRow = calculateData();
        setModalRows([...modalRows, calculatedRow]);
        setModalFormData({
            Date: '', Temperature: '', Fan: '', Refrigerator: '', AirConditioner: '',
            Bulb: '', Television: '', Monitor: '', MotorPump: '', Extra: '', TariffRate: '6.76'
        });
        setModalError('');
    };

    const handleModalDeleteRow = (indexToDelete) => {
        setModalRows(modalRows.filter((_, index) => index !== indexToDelete));
    };

    const handleModalSubmitAll = async () => {
        if (modalRows.length === 0) {
            setModalError('Please add at least one row of data to submit.');
            return;
        }
        const headers = getAuthHeaders();
        if (!headers) return;

        setModalMessage('Submitting data...');
        setModalError(null);

        try {
            let successCount = 0;
            for (const row of modalRows) {
                await axios.post(`${API_BASE_URL}/add_daily_data`, row, { headers });
                successCount++;
            }
            
            setModalMessage(`Successfully saved ${successCount} data entries!`);
            setModalRows([]);
            fetchData(); // Refresh the main page table
            
            setTimeout(() => {
                setShowModal(false);
                setModalMessage(null);
            }, 2000);

        } catch (error) {
            if (error.response) {
                setModalError(error.response.data.error || 'An error occurred while saving.');
            } else {
                setModalError('Network error. Could not connect to the server.');
            }
        }
    };
    
    const openModal = () => {
        setModalFormData({
            Date: '', Temperature: '', Fan: '', Refrigerator: '', AirConditioner: '',
            Bulb: '', Television: '', Monitor: '', MotorPump: '', Extra: '', TariffRate: '6.76'
        });
        setModalRows([]);
        setModalError(null);
        setModalMessage(null);
        setShowModal(true);
    };


    // --- Render ---

    return (
        <div className="dataset-page">
            <h2>My Dataset Hub</h2>
            
            {message && <div className="message success" onClick={() => setMessage(null)}>{message}</div>}
            {error && !isLoading && <div className="message error" onClick={() => setError(null)}>{error}</div>}

            <div className="dataset-actions">
                <div className="action-card">
                    <h3>View & Filter Data</h3>
                    <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <button onClick={handleFilter}>Filter Data</button>
                    <button onClick={handleClearFilter} className="secondary">Clear</button>
                </div>
                
                <div className="action-card">
                    <h3>Add New Data</h3>
                    <p>Upload a .csv or .xlsx file:</p>
                    <input type="file" onChange={handleFileChange} accept=".csv, .xls, .xlsx" />
                    <button onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? "Uploading..." : "Upload File"}
                    </button>
                    <p>Or add multiple days:</p>
                    <button onClick={openModal} className="secondary">
                        Advanced Manual Entry
                    </button>
                </div>
            </div>

            {/* --- Main Data Table --- */}
            <h3>Your Energy Data</h3>
            
            <div className="data-table-controls">
                <div className="select-by-date">
                    <label>Select From:</label>
                    <input type="date" value={selectStartDate} onChange={e => setSelectStartDate(e.target.value)} />
                    <label>To:</label>
                    <input type="date" value={selectEndDate} onChange={e => setSelectEndDate(e.target.value)} />
                    <button onClick={handleSelectByDate} className="secondary">Select</button>
                </div>

                {selectedRows.length > 0 && (
                    <button onClick={handleDeleteSelected} className="delete-selected-button">
                        Delete {selectedRows.length} Selected Entries
                    </button>
                )}
            </div>

            {isLoading ? (
                <p>Loading data...</p>
            ) : (
                <div className="data-table-container">
                    {data.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input 
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={data.length > 0 && selectedRows.length === data.length}
                                        />
                                    </th>
                                    <th>Date</th>
                                    <th>Units (kWh)</th>
                                    <th>Fan (hrs)</th>
                                    <th>AC (hrs)</th>
                                    <th>Refrigerator (hrs)</th>
                                    <th>Television (hrs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(row => (
                                    <tr key={row.data_id} className={selectedRows.includes(row.data_id) ? 'selected-row' : ''}>
                                        <td>
                                            <input 
                                                type="checkbox"
                                                checked={selectedRows.includes(row.data_id)}
                                                onChange={(e) => handleRowSelect(e, row.data_id)}
                                            />
                                        </td>
                                        <td>{row.Date}</td>
                                        <td>{row.Units}</td>
                                        <td>{row.Fan}</td>
                                        <td>{row.AirConditioner}</td>
                                        <td>{row.Refrigerator}</td>
                                        <td>{row.Television}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        !error && <p>No data to display.</p>
                    )}
                </div>
            )}

            {/* --- THIS IS THE MODAL HTML THAT WAS MISSING --- */}
            {showModal && (
                <div className="modal">
                    <div className="modal-content large">
                        <span className="close" onClick={() => setShowModal(false)}>&times;</span>
                        
                        <h2>Enter Daily Consumption Data</h2>
                        <p>Enter hours of use. Units and Bill will be auto-calculated.</p>
                        
                        <div className="form-row">
                            <input type="date" name="Date" value={modalFormData.Date} onChange={handleModalFormChange} />
                            <input type="number" name="Temperature" value={modalFormData.Temperature} onChange={handleModalFormChange} placeholder="Temperature (°C)" />
                        </div>
                        <div className="form-row">
                            <input type="number" name="Fan" value={modalFormData.Fan} onChange={handleModalFormChange} placeholder="Fan (Hours)" />
                            <input type="number" name="Refrigerator" value={modalFormData.Refrigerator} onChange={handleModalFormChange} placeholder="Refrigerator (Hours)" />
                        </div>
                        <div className="form-row">
                            <input type="number" name="AirConditioner" value={modalFormData.AirConditioner} onChange={handleModalFormChange} placeholder="AC (Hours)" />
                            <input type="number" name="Bulb" value={modalFormData.Bulb} onChange={handleModalFormChange} placeholder="Bulb (Hours)" />
                        </div>
                        <div className="form-row">
                            <input type="number" name="Television" value={modalFormData.Television} onChange={handleModalFormChange} placeholder="TV (Hours)" />
                            <input type="number" name="Monitor" value={modalFormData.Monitor} onChange={handleModalFormChange} placeholder="Monitor (Hours)" />
                        </div>
                        <div className="form-row">
                            <input type="number" name="MotorPump" value={modalFormData.MotorPump} onChange={handleModalFormChange} placeholder="Motor (Hours)" />
                            <input type="number" name="Extra" value={modalFormData.Extra} onChange={handleModalFormChange} placeholder="Extra (Units)" />
                        </div>
                        <div className="form-row">
                            <input type="number" name="TariffRate" value={modalFormData.TariffRate} onChange={handleModalFormChange} placeholder="Tariff Rate" />
                            <button className="add-row-button" onClick={handleModalAddRow}>Add Day</button>
                        </div>

                        {/* --- Modal Data Table Preview --- */}
                        {modalRows.length > 0 && (
                            <>
                                <h3 style={{marginTop: '2rem'}}>Data to be Submitted</h3>
                                <div className="modal-table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Total Units</th>
                                                <th>Bill (₹)</th>
                                                <th>Del</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modalRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td>{row.Date}</td>
                                                    <td><strong>{row.Units}</strong></td>
                                                    <td><strong>{row.ElectricityBill}</strong></td>
                                                    <td>
                                                        <button className="delete-button" onClick={() => handleModalDeleteRow(index)}>
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
                        
                        {/* --- Modal Submit Button --- */}
                        <button 
                            className="submit-manual-button" 
                            onClick={handleModalSubmitAll}
                            disabled={modalRows.length === 0}
                        >
                            Save All Data to Database
                        </button>
                        
                        {modalMessage && <div className="message success">{modalMessage}</div>}
                        {modalError && <div className="message error">{modalError}</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dataset;