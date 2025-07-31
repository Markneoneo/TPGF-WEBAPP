import React from 'react';
import './CharzParameters.css';

const SEARCH_GRANULARITY_OPTIONS = ['allcore', 'bycore'];
const SEARCH_TYPE_OPTIONS = ['vmin', 'fmax'];
const TEST_TYPES = ['CREST', 'BIST', 'PBIST'];
const TABLE_FIELDS = [
  { key: 'wl_count', label: 'WL Count', type: 'number', min: 0 },
  { key: 'tp', label: 'Test Points', type: 'text' },
  { key: 'search_start', label: 'Search Start', type: 'text' },
  { key: 'search_end', label: 'Search End', type: 'text' },
  { key: 'search_step', label: 'Search Step', type: 'text' },
  { key: 'resolution', label: 'Resolution', type: 'text' },
];
const WORKLOAD_FIELDS = [
  { key: 'wl', label: 'WL', type: 'text' }
];

const CharzParameters = ({
  charzData,
  setCharzData,
  errors = {},
  ipType
}) => {
  // Handlers
  // const handleGranularityChange = (e) => {
  //   setCharzData(prev => ({ ...prev, search_granularity: e.target.value }));
  // };
  
  // Updated handler for multiple granularity selection
  const handleGranularityChange = (granularity) => {
    setCharzData(prev => {
      // Get current array or initialize empty array
      const currentGranularities = prev.search_granularity || [];
      
      // Check if granularity is already selected
      const isSelected = currentGranularities.includes(granularity);
      
      return {
        ...prev,
        search_granularity: isSelected
          ? currentGranularities.filter(g => g !== granularity) // Remove if already selected
          : [...currentGranularities, granularity] // Add if not selected
      };
    });
  };

  const handleSearchTypeChange = (type) => {
    setCharzData(prev => {
      const arr = prev.search_types || [];
      return {
        ...prev,
        search_types: arr.includes(type)
          ? arr.filter(t => t !== type)
          : [...arr, type],
      };
    });
  };

  // New handler for test type selection
  const handleTestTypeChange = (searchType, testType) => {
    setCharzData(prev => {
      const selectedTestTypes = { ...(prev.selectedTestTypes || {}) };
      if (!selectedTestTypes[searchType]) selectedTestTypes[searchType] = [];
      
      if (selectedTestTypes[searchType].includes(testType)) {
        selectedTestTypes[searchType] = selectedTestTypes[searchType].filter(t => t !== testType);
      } else {
        selectedTestTypes[searchType] = [...selectedTestTypes[searchType], testType];
      }
      
      return { ...prev, selectedTestTypes };
    });
  };

  const handleTableChange = (searchType, testType, field, value) => {
    setCharzData(prev => {
      const table = { ...(prev.table || {}) };
      if (!table[searchType]) table[searchType] = {};
      if (!table[searchType][testType]) table[searchType][testType] = {};
      table[searchType][testType][field] = value;
      return { ...prev, table };
    });
  };

  const handleRegisterSizeChange = (e) => {
    setCharzData(prev => ({ ...prev, psm_register_size: e.target.value }));
  };

  const handleWorkloadTableChange = (searchType, testType, rowIdx, value) => {
    setCharzData(prev => {
      const workloadTable = { ...(prev.workloadTable || {}) };
      if (!workloadTable[searchType]) workloadTable[searchType] = {};
      if (!workloadTable[searchType][testType]) workloadTable[searchType][testType] = [];
      workloadTable[searchType][testType][rowIdx] = value;
      return { ...prev, workloadTable };
    });
  };

  // Render
  return (
    <div className="charz-section" style={{ marginBottom: '2rem' }}>
      <h4 style={{ borderBottom: '1px solid #6b00b3', color: '#6b00b3', marginBottom: '1rem' }}>
        Charz Parameters
      </h4>

      {/* Search Granularity - NOW WITH CHECKBOXES */}
      <div className="form-group">
        <label>Search Granularity</label>
        <div className="input-hint">Select one or more granularity options</div>
        <div className="checkbox-group">
          {SEARCH_GRANULARITY_OPTIONS.map(granularity => (
            <label key={granularity} className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={(charzData.search_granularity || []).includes(granularity)}
                onChange={() => handleGranularityChange(granularity)}
              />
              <span className="checkbox-custom"></span>
              {granularity}
            </label>
          ))}
        </div>
        {errors.search_granularity && <span className="error-message">{errors.search_granularity}</span>}
      </div>

      {/* Search Type */}
      <div className="form-group">
        <label>Search Type</label>
        <div className="checkbox-group">
          {SEARCH_TYPE_OPTIONS.map(type => (
            <label key={type} className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={charzData.search_types?.includes(type) || false}
                onChange={() => handleSearchTypeChange(type)}
              />
              <span className="checkbox-custom"></span>
              {type}
            </label>
          ))}
        </div>
        {errors.search_types && <span className="error-message">{errors.search_types}</span>}
      </div>

      {/* Table for each selected search type */}
      {(charzData.search_types || []).map(searchType => (
        <React.Fragment key={searchType}>
          <div className="charz-table-block">
            <div className="charz-table-title">{searchType.toUpperCase()} Test Types</div>
            
            {/* Test Type Checkboxes */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              {/* <label>Select Test Types</label> */}
              <div className="checkbox-group">
                {TEST_TYPES.map(testType => (
                  <label key={testType} className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={charzData.selectedTestTypes?.[searchType]?.includes(testType) || false}
                      onChange={() => handleTestTypeChange(searchType, testType)}
                    />
                    <span className="checkbox-custom"></span>
                    {testType}
                  </label>
                ))}
              </div>
            </div>

            {/* Only show table if at least one test type is selected */}
            {charzData.selectedTestTypes?.[searchType]?.length > 0 && (
              <div className="charz-table-scroll">
                <table className="charz-table">
                  <thead>
                    <tr>
                      <th>Test Type</th>
                      {TABLE_FIELDS.map(f => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Only show rows for selected test types */}
                    {TEST_TYPES.filter(testType => 
                      charzData.selectedTestTypes?.[searchType]?.includes(testType)
                    ).map(testType => (
                      <tr key={testType}>
                        <td>{testType}</td>
                        {TABLE_FIELDS.map(field => (
                          <td key={field.key}>
                            <input
                              type={field.type}
                              min={field.min}
                              value={charzData.table?.[searchType]?.[testType]?.[field.key] || ''}
                              onChange={e =>
                                handleTableChange(
                                  searchType,
                                  testType,
                                  field.key,
                                  e.target.value
                                )
                              }
                              className={
                                errors[`charz_${searchType}_${testType}_${field.key}`]
                                  ? 'error single-input'
                                  : 'single-input'
                              }
                              style={{ width: '100px' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Workload Table for this searchType, below the test type table */}
          {(() => {
            // Only show workload table if test types are selected
            const selectedTestTypes = charzData.selectedTestTypes?.[searchType] || [];
            if (selectedTestTypes.length === 0) return null;

            // Get wl_count for each selected test type
            const wlCounts = {};
            selectedTestTypes.forEach(testType => {
              wlCounts[testType] = parseInt(charzData.table?.[searchType]?.[testType]?.wl_count || '0', 10);
            });
            // Find the max wl_count to determine number of rows
            const maxWlCount = Math.max(...Object.values(wlCounts));
            if (!maxWlCount || maxWlCount <= 0) return null;
            
            return (
              <div key={searchType + '-workload-table'} className="charz-table-block">
                <div className="charz-table-title">{searchType.toUpperCase()} Workload Table</div>
                <div className="charz-table-scroll">
                  <table className="charz-table">
                    <thead>
                      <tr>
                        {selectedTestTypes.map(testType => (
                          <th key={testType}>{testType}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxWlCount }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                          {selectedTestTypes.map(testType => (
                            WORKLOAD_FIELDS.map(field => {
                              const errorKey = `charz_${searchType}_${testType}_${field.key}_${rowIdx}`;
                              if (rowIdx < wlCounts[testType]) {
                                return (
                                  <td key={testType + '-' + field.key}>
                                    <input
                                      type={field.type}
                                      value={
                                        (charzData.workloadTable &&
                                          charzData.workloadTable[searchType] &&
                                          charzData.workloadTable[searchType][testType] &&
                                          charzData.workloadTable[searchType][testType][rowIdx]) || ''
                                      }
                                      onChange={e =>
                                        handleWorkloadTableChange(searchType, testType, rowIdx, e.target.value)
                                      }
                                      className={errors[errorKey] ? 'error single-input' : 'single-input'}
                                      style={{ width: '100px' }}
                                    />
                                  </td>
                                );
                              } else {
                                return <td key={testType + '-' + field.key}></td>;
                              }
                            })
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </React.Fragment>
      ))}

      {/* PSM Register Size */}
      <div className="form-group">
        <label htmlFor={`psm_reg_size_${ipType}`}>PSM Register Size</label>
        <input
          id={`psm_reg_size_${ipType}`}
          type="text"
          value={charzData.psm_register_size || ''}
          onChange={handleRegisterSizeChange}
          className="single-input"
        />
        {errors.psm_register_size && <span className="error-message">{errors.psm_register_size}</span>}
      </div>
    </div>
  );
};

export default CharzParameters;