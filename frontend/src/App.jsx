import { useState, useRef, useEffect } from 'react'
import ExtendedForm from './components/ExtendedForm'
import transformFormDataToBackend from './utils/transformFormDataToBackend';
import './App.css'

function App() {
  const [selectedIpTypes, setSelectedIpTypes] = useState([]);
  const [processResults, setProcessResults] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const formRefs = useRef({});

  const ipOptions = ['CPU', 'GFX', 'SOC'];

  const handleIpTypeChange = (ipType) => {
    setSelectedIpTypes(prev => {
      if (prev.includes(ipType)) {
        // Remove the IP type and its results
        const newSelected = prev.filter(type => type !== ipType);
        const newResults = { ...processResults };
        delete newResults[ipType];
        setProcessResults(newResults);
        return newSelected;
      } else {
        // Add the IP type
        return [...prev, ipType];
      }
    });
  };

  const processAllForms = async () => {
    console.log('processAllForms: started');
    // Validate all forms first
    let hasValidationErrors = false;
    const errors = {};
    
    for (const ipType of selectedIpTypes) {
      const formRef = formRefs.current[ipType];
      console.log(`Validating form for ${ipType}...`, formRef);
      if (formRef && !formRef.validate()) {
        console.log(`Validation failed for ${ipType}`);
        hasValidationErrors = true;
        errors[ipType] = formRef.getErrors ? formRef.getErrors() : {};
      }
    }
    
    if (hasValidationErrors) {
      console.log('processAllForms: validation errors found, aborting');
      console.log('Validation errors:', JSON.stringify(errors, null, 2));
      return;
    }
    
    setIsProcessing(true);
    const combinedResults = {};
    
    try {
      // Process each IP type sequentially
      for (const ipType of selectedIpTypes) {
        const formRef = formRefs.current[ipType];
        if (!formRef) {
          console.log(`No formRef for ${ipType}, skipping.`);
          continue;
        }
        
        const formData = formRef.getFormData();
        console.log(`Form data for ${ipType}:`, formData);
        // Transform formData to backend format
        const backendPayload = transformFormDataToBackend(formData);
        // Set ip field to match backend expectation
        backendPayload.ip = ipType.toLowerCase();
        console.log(`Backend payload for ${ipType}:`, backendPayload);
        const response = await fetch('http://localhost:4567/api/process-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backendPayload)
        });
        
        console.log(`Response status for ${ipType}:`, response.status);
        if (!response.ok) {
          console.error(`HTTP error for ${ipType}! status: ${response.status}`);
          throw new Error(`HTTP error for ${ipType}! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`Result from backend for ${ipType}:`, result);
        combinedResults[ipType] = result;
      }
      
      // Set combined results
      setProcessResults(combinedResults);
      // File is now generated on backend, show download link
      setFileReady(true);
      console.log('processAllForms: finished successfully');
      
    } catch (error) {
      console.error('Error processing data:', error);
      // Set error state that can be displayed to user
    } finally {
      setIsProcessing(false);
      console.log('processAllForms: processing ended');
    }
  };

  const clearAll = () => {
    // Clear all form data using refs
    selectedIpTypes.forEach(ipType => {
      const formRef = formRefs.current[ipType];
      if (formRef) {
        formRef.clearForm();
      }
    });
    
    setSelectedIpTypes([]);
    setProcessResults({});
    setFileReady(false);
  };

  return (
    <div className="App">
      <h1 className='title'>Test Settings Generator</h1>
      <p className='subheading'>Please select the IP types and configure options.</p>

      <div className="card">
        {/* IP Type Selection */}
        <div className="ip-selection-container">
          <h3>Select IP Types</h3>
          <div className="checkbox-group">
            {ipOptions.map(ipType => (
              <label key={ipType} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedIpTypes.includes(ipType)}
                  onChange={() => handleIpTypeChange(ipType)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                {ipType}
              </label>
            ))}
          </div>
        </div>

        {/* Extended Forms for each selected IP type */}
        <div className="forms-container">
          {selectedIpTypes.map(ipType => (
            <ExtendedForm
              key={ipType}
              ref={el => formRefs.current[ipType] = el}
              ipType={ipType}
              isProcessing={isProcessing}
              result={processResults[ipType]}
            />
          ))}
        </div>

        {/* Global Actions */}
        {selectedIpTypes.length > 0 && (
          <div className="global-actions">
            <div className="global-button-group">
              <button
                onClick={processAllForms}
                disabled={isProcessing}
                className="primary-button"
              >
                {isProcessing ? 'Generating Files...' : 'Generate Combined File'}
              </button>
              <button onClick={clearAll} className="secondary-button">
                Clear All
              </button>
            </div>
            {/* Show download link if file is ready */}
            {fileReady && (
              <div className="download-link-container">
                <a
                  href="http://localhost:4567/tsettings.json"
                  // href="http://localhost:5173/tsettings.json"
                  download
                  className="primary-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Generated Test Settings JSON
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;