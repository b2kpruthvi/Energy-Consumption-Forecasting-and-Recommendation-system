import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dataset.css'; // Uses the new, updated CSS file
import '../App.css'; // <-- ADD THIS for main layout
import '../styles/style.css';

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

// --- NEW: Wattage definitions for auto-calculation (in Watts) ---
// You can adjust these values
const WATTAGE_MAP = {
    Fan: 75,
    Refrigerator: 150,
    AirConditioner: 1200,
    Bulb: 15,
    Television: 100,
    Monitor: 80,
    MotorPump: 750,
};

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
    const [selectedRows, setSelectedRows] = useState([]); 
    const [selectStartDate, setSelectStartDate] = useState('');
    const [selectEndDate, setSelectEndDate] = useState('');

    // --- Modal States ---
    // The form state now includes ALL fields
    const [modalError, setModalError] = useState(null);
    const [modalMessage, setModalMessage] = useState(null);
    const [modalRows, setModalRows] = useState([]);
    const [modalFormData, setModalFormData] = useState({
        Date: '', Temperature: '', 
        Fan: '', Fan_Units: '',
        Refrigerator: '', Fridge_Units: '',
        AirConditioner: '', AC_Units: '',
        Bulb: '', Bulb_Units: '',
        Television: '', TV_Units: '',
        Monitor: '', Monitor_Units: '',
        MotorPump: '', Motor_Units: '',
        Extra: '', TariffRate: '6.76'
    });

    // --- API Call: Fetch Data ---
    // --- API Call: Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        setMessage(null);

        const headers = getAuthHeaders(); // may be null
        const params = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        try {
            // pass headers only if present; otherwise call unauthenticated
            const config = { params };
            if (headers) config.headers = headers;

            const response = await axios.get(`${API_BASE_URL}/data`, config);
            setData(response.data);
            if (!response.data || response.data.length === 0) {
                setError("No data found for the selected range.");
                setData([]);
            }
        } catch (err) {
            // give more actionable messages
            if (err.response) {
                const status = err.response.status;
                if (status === 404) {
                    setError(err.response.data.message || "No data found.");
                    setData([]);
                } else if (status === 401 || status === 422) {
                    // token may be invalid/expired — fallback to CSV preview by refetching without auth
                    try {
                        const csvResp = await axios.get(`${API_BASE_URL}/data`);
                        setData(csvResp.data || []);
                        if (!csvResp.data || csvResp.data.length === 0) setError("No data found (CSV fallback).");
                    } catch (csvErr) {
                        setError("Auth error and CSV fallback failed.");
                    }
                } else {
                    setError(err.response.data.error || "An error occurred while fetching data.");
                }
            } else {
                setError("Network error while fetching data.");
            }
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchData();
    }, []);

    // --- Page Action Handlers (Filter, File) ---
    // (These are unchanged)
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
    // (These are unchanged)
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
            fetchData();
        } catch (err) {
            setError(err.response ? err.response.data.error : "Delete failed.");
        }
    };


    // --- Modal Action Handlers (Manual Entry Logic) ---
    
    // --- UPDATED: Smart form change handler ---
    const handleModalFormChange = (e) => {
        const { name, value } = e.target;
        
        let newFormData = { ...modalFormData, [name]: value };

        // Check if the changed field is an "hours" input (e.g., "Fan", "Bulb")
        if (WATTAGE_MAP[name]) {
            const hours = toFloat(value);
            const wattage = WATTAGE_MAP[name];
            const units = (hours * wattage) / 1000; // kWh
            
            // Get the name of the corresponding units field (e.g., "Fan" -> "Fan_Units")
            let unitFieldName = `${name}_Units`;
            if (name === 'Refrigerator') unitFieldName = 'Fridge_Units';
            if (name === 'Television') unitFieldName = 'TV_Units';
            if (name === 'MotorPump') unitFieldName = 'Motor_Units';
            
            newFormData[unitFieldName] = units.toFixed(3);
        }
        
        setModalFormData(newFormData);
    };

    // --- UPDATED: calculateData now sums the unit fields ---
    const calculateData = () => {
        const Total_Units = 
            toFloat(modalFormData.Fan_Units) +
            toFloat(modalFormData.Fridge_Units) +
            toFloat(modalFormData.AC_Units) +
            toFloat(modalFormData.Bulb_Units) +
            toFloat(modalFormData.TV_Units) +
            toFloat(modalFormData.Monitor_Units) +
            toFloat(modalFormData.Motor_Units) +
            toFloat(modalFormData.Extra);
        
        const Bill = Total_Units * toFloat(modalFormData.TariffRate);
        
        return {
            ...modalFormData, // Has all the individual hour/unit values
            Units: Total_Units.toFixed(2),
            ElectricityBill: Bill.toFixed(2),
            Month: modalFormData.Date ? new Date(modalFormData.Date).getMonth() + 1 : 0
        };
    };

    // --- UPDATED: AddRow now resets the full form state ---
    const handleModalAddRow = () => {
        if (!modalFormData.Date) {
            setModalError('Date is required to add a row.');
            return;
        }
        const calculatedRow = calculateData();
        setModalRows([...modalRows, calculatedRow]);
        // Clear form for next entry
        setModalFormData({
            Date: '', Temperature: '', 
            Fan: '', Fan_Units: '',
            Refrigerator: '', Fridge_Units: '',
            AirConditioner: '', AC_Units: '',
            Bulb: '', Bulb_Units: '',
            Television: '', TV_Units: '',
            Monitor: '', Monitor_Units: '',
            MotorPump: '', Motor_Units: '',
            Extra: '', TariffRate: '6.76'
        });
        setModalError('');
    };

    const handleModalDeleteRow = (indexToDelete) => {
        setModalRows(modalRows.filter((_, index) => index !== indexToDelete));
    };

    const handleModalSubmitAll = async () => {
        // (This function is unchanged)
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
            fetchData();
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
    
    // --- UPDATED: openModal now resets the full form state ---
    const openModal = () => {
        setModalFormData({
            Date: '', Temperature: '', 
            Fan: '', Fan_Units: '',
            Refrigerator: '', Fridge_Units: '',
            AirConditioner: '', AC_Units: '',
            Bulb: '', Bulb_Units: '',
            Television: '', TV_Units: '',
            Monitor: '', Monitor_Units: '',
            MotorPump: '', Motor_Units: '',
            Extra: '', TariffRate: '6.76'
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

            {/* --- ACTION CARDS --- */}
            {/* (This section is unchanged) */}
            <div className="dataset-actions">
                <div className="card">
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
                
                <div className="card">
                    <h3>Add New Data</h3>
                    <div className="form-group">
                        <label>Upload a .csv or .xlsx file:</label>
                        <input type="file" onChange={handleFileChange} accept=".csv, .xls, .xlsx" />
                    </div>
                    <button onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? "Uploading..." : "Upload File"}
                    </button>
                    <hr />
                    <label>Or add multiple days:</label>
                    <button onClick={openModal} className="secondary">
                        Advanced Manual Entry
                    </button>
                </div>
            </div>

            {/* --- Main Data Table --- */}
            {/* (This section is unchanged) */}
            <div className="card data-table-card">
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
                            Delete {selectedRows.length} Selected
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
            </div>

            {/* --- UPDATED: ADVANCED MANUAL ENTRY MODAL --- */}
            {showModal && (
                <div className="modal">
                    <div className="modal-content large">
                        <span className="close" onClick={() => setShowModal(false)}>&times;</span>
                        
                        <h2>Enter Daily Consumption Data</h2>
                        <p>Enter hours to auto-calculate units, or enter units manually.</p>
                        
                        {/* --- General Inputs --- */}
                        <div className="form-row">
                            <input type="date" name="Date" value={modalFormData.Date} onChange={handleModalFormChange} />
                            <input type="number" name="Temperature" value={modalFormData.Temperature} onChange={handleModalFormChange} placeholder="Temperature (°C)" />
                        </div>
                        
                        {/* --- NEW: Appliance Row Layout --- */}
                        <div className="form-row appliance-row">
                            <input type="number" name="Fan" value={modalFormData.Fan} onChange={handleModalFormChange} placeholder="Fan (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="Fan_Units" value={modalFormData.Fan_Units} onChange={handleModalFormChange} placeholder="Fan (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="Refrigerator" value={modalFormData.Refrigerator} onChange={handleModalFormChange} placeholder="Refrigerator (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="Fridge_Units" value={modalFormData.Fridge_Units} onChange={handleModalFormChange} placeholder="Fridge (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="AirConditioner" value={modalFormData.AirConditioner} onChange={handleModalFormChange} placeholder="AC (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="AC_Units" value={modalFormData.AC_Units} onChange={handleModalFormChange} placeholder="AC (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="Bulb" value={modalFormData.Bulb} onChange={handleModalFormChange} placeholder="Bulb (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="Bulb_Units" value={modalFormData.Bulb_Units} onChange={handleModalFormChange} placeholder="Bulb (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="Television" value={modalFormData.Television} onChange={handleModalFormChange} placeholder="TV (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="TV_Units" value={modalFormData.TV_Units} onChange={handleModalFormChange} placeholder="TV (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="Monitor" value={modalFormData.Monitor} onChange={handleModalFormChange} placeholder="Monitor (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="Monitor_Units" value={modalFormData.Monitor_Units} onChange={handleModalFormChange} placeholder="Monitor (Units)" />
                        </div>
                        <div className="form-row appliance-row">
                            <input type="number" name="MotorPump" value={modalFormData.MotorPump} onChange={handleModalFormChange} placeholder="Motor (Hours)" />
                            <span className="arrow">→</span>
                            <input type="number" name="Motor_Units" value={modalFormData.Motor_Units} onChange={handleModalFormChange} placeholder="Motor (Units)" />
                        </div>

                        {/* --- Other Inputs --- */}
                        <div className="form-row">
                            <input type="number" name="Extra" value={modalFormData.Extra} onChange={handleModalFormChange} placeholder="Extra (Units)" />
                            <input type="number" name="TariffRate" value={modalFormData.TariffRate} onChange={handleModalFormChange} placeholder="Tariff Rate" />
                        </div>
                        
                        <button onClick={handleModalAddRow} className="secondary" style={{width: '100%', marginBottom: '1rem'}}>
                            Add Day to Table
                        </button>

                        {modalMessage && <div className="message success">{modalMessage}</div>}
                        {modalError && <div className="message error">{modalError}</div>}

                        {/* --- Modal Data Table Preview --- */}
                        {modalRows.length > 0 && (
                            <>
                                <h3 style={{marginTop: '2rem'}}>Data to be Submitted</h3>
                                <div className="modal-table-container">
                                    <table>
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
                        
                        <button 
                            className="submit-manual-button" 
                            onClick={handleModalSubmitAll}
                            disabled={modalRows.length === 0}
                        >
                            Save All Data to Database
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dataset;