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
  const handleGranularityChange = (e) => {
    setCharzData(prev => ({ ...prev, search_granularity: e.target.value }));
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

      {/* Search Granularity */}
      <div className="form-group">
        <label>Search Granularity</label>
        <select
          value={charzData.search_granularity || ''}
          onChange={handleGranularityChange}
          className="single-input"
        >
          <option value="" disabled>Select one</option>
          {SEARCH_GRANULARITY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
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
                  {TEST_TYPES.map(testType => (
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
          </div>
          {/* Workload Table for this searchType, below the test type table */}
          {(() => {
            // Get wl_count for each test type
            const wlCounts = {};
            TEST_TYPES.forEach(testType => {
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
                        {TEST_TYPES.map(testType => (
                          <th key={testType}>{testType}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxWlCount }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                          {TEST_TYPES.map(testType => (
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