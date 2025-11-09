import React, { useState } from 'react';
import axios from 'axios';
import './Dataset.css'; // Uses the shared CSS

const FileUploadComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
    setMessageType('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessageType('error');
      setMessage('Please select a file first.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessageType('error');
      setMessage('You must be logged in to upload a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://127.0.0.1:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });

      setMessageType('success');
      setMessage(response.data.message);
      setSelectedFile(null); 

    } catch (error) {
      setMessageType('error');
      if (error.response) {
        setMessage(error.response.data.error || error.response.data.msg || 'An error occurred during upload.');
      } else {
        setMessage('Network error. Could not connect to the server.');
      }
    }
  };

  return (
    <div className="upload-box">
      <h2>Upload a .csv File</h2>
      <div className="file-input-wrapper">
        <label htmlFor="file-upload" className="file-input-label">
          {selectedFile ? 'File selected:' : 'Click to choose a .csv file'}
          {selectedFile && (
            <div className="file-name">{selectedFile.name}</div>
          )}
        </label>
        <input 
          id="file-upload"
          type="file" 
          accept=".csv"
          onChange={handleFileChange} 
        />
      </div>
      
      <button 
        className="upload-button" 
        onClick={handleUpload}
        disabled={!selectedFile}
      >
        Upload
      </button>

      {message && (
        <div className={`upload-message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;