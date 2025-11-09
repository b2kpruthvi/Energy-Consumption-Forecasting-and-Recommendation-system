import React, { useState } from 'react';
import './Dataset.css'; // Import the main CSS
// import FileUploadComponent from './FileUploadComponent'; // We don't need this anymore
import ManualEntryComponent from './ManualEntryComponent';

const Dataset = () => {
  // const [activeTab, setActiveTab] = useState('upload'); // Default to manual entry
  
  return (
    <div className="dataset-container">
      {/* --- Tab Navigation (Hidden) --- */}
      {/* <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload File
        </button>
        <button
          className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Enter Data Manually
        </button>
      </div> 
      */}

      {/* --- Show Manual Entry by default --- */}
      <ManualEntryComponent />
      
    </div>
  );
};

export default Dataset;