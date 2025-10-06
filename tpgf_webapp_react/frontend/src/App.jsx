import { useState, useRef, useEffect } from 'react'
import ExtendedForm from './components/ExtendedForm'
import JsonPreview from './components/JsonPreview'
import transformFormDataToBackend from './utils/transformFormDataToBackend';
import './App.css'
import { runAllTests } from './utils/testPointValidation.test.js';

function App() {
  const [selectedIpTypes, setSelectedIpTypes] = useState([]);
  const [processResults, setProcessResults] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [jsonPreview, setJsonPreview] = useState(null);
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

    try {
      // Collect all form data first
      const allIpData = {};

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
        console.log(`Backend payload for ${ipType}:`, JSON.stringify(backendPayload, null, 2));
        backendPayload.ip = ipType.toLowerCase();

        allIpData[ipType.toLowerCase()] = backendPayload;
      }

      console.log('Combined payload for all IPs:', allIpData);

      // Send single request with all IP data
      const response = await fetch('http://localhost:4567/api/process-multiple-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip_configurations: allIpData })
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Combined result from backend:', result);

      setProcessResults(result);
      setJsonPreview(result.data);
      setFileReady(true);
      console.log('processAllForms: finished successfully');

    } catch (error) {
      console.error('Error processing data:', error);
      setJsonPreview(null);
    } finally {
      setIsProcessing(false);
      console.log('processAllForms: processing ended');
    }
  };

  const handleRunTests = () => {
    console.log('🧪 Running validation tests...');
    try {
      const results = runAllTests();
      console.log('✅ Test execution completed. Check console output above for detailed results.');

      // Optional: Show a brief alert with summary
      alert(`Tests completed!\nOverall: ${results.overall.passed}/${results.overall.total} (${results.overall.successRate.toFixed(1)}%)\nCheck console for details.`);
    } catch (error) {
      console.error('❌ Error running tests:', error);
      alert('Error running tests. Check console for details.');
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
    setJsonPreview(null);
  };

  // Add function to close preview manually
  const handleClosePreview = () => {
    setJsonPreview(null);
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
              <label key={ipType} className="checkbox-label ip-checkbox">
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
                className="btn btn-primary"
              >
                {isProcessing ? 'Generating Files...' : 'Generate Combined Test Settings'}
              </button>

              {fileReady && (
                <a
                  href="http://localhost:4567/tsettings.json"
                  download
                  className="btn btn-success"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download JSON
                </a>
              )}

              {/* Test Button - Only show in development */}
              {/* {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleRunTests}
                  className="secondary-button"
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: '1px solid #007bff'
                  }}
                  title="Run validation tests for test point ranges"
                >
                  Run Tests
                </button>
              )} */}

              <button onClick={clearAll} className="btn btn-secondary">
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* JSON Preview Component */}
        <JsonPreview
          jsonData={jsonPreview}
          onClose={handleClosePreview}
        />
      </div>
    </div>
  );
}

export default App;

