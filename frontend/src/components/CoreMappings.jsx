import React from 'react';
import ProductionMappings from './ProductionMappings';
import CharzParameters from './CharzParameters';
import './CoreMappings.css';

const CoreMappings = ({
  coreMappings,
  errors,
  handleCoreMappingChange,
  productionMappings,
  charzData,
  selectedFlowOrders,
  showCharzForCore,
  handleFlowOrderChange,
  handleProductionMappingChange,
  handleCharzToggle,
  setCharzData,
  ipType
}) => (
  <div className="core-mappings-section">
    {coreMappings.map((mapping, idx) => (

      <div key={idx} className="core-mapping-container">
        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
          <label
            htmlFor={`spec_variable_${idx}`}
            className="core-mapping-label"
          >
            <strong>Core Type {idx + 1}</strong>
          </label>

          <hr className="form-divider" />

          <div className="spec-variable-wrapper">
            <span className="spec-variable-prefix">Spec Variable:</span>
            <div className="input-with-overlay">
              {/* <span className="input-overlay-left">LEV.36.</span> */}
              <input
                type="text"
                id={`spec_variable_${idx}`}
                placeholder="Example: VDDCR"
                value={mapping.spec_variable || ''}
                onChange={e => handleCoreMappingChange(idx, 'spec_variable', e.target.value)}
                className={errors[`spec_variable_${idx}`] ? 'error single-input spec-variable-input' : 'single-input spec-variable-input'}
              />
              {/* <span className="input-overlay-right">[V]</span> */}
            </div>
          </div>
          {errors[`spec_variable_${idx}`] && <span className="error-message">{errors[`spec_variable_${idx}`]}</span>}
        </div>

        {/* Core Mapping Rows - Split into 2 rows */}
        <div className="core-mapping-rows">
          {/* First Row: Core Count and Supply */}
          <div className="core-mapping-row">
            <div className="input-wrapper">
              <span className="input-prefix">Core Name:</span>
              <input
                type="text"
                placeholder="Enter core name"
                value={mapping.core}
                onChange={e => handleCoreMappingChange(idx, 'core', e.target.value)}
                className={errors[`core_${idx}`] ? 'error single-input' : 'single-input'}
              />
              {/* <span className="input-suffix">core</span> */}
            </div>

            <div className="input-wrapper">
              <span className="input-prefix">Core Count:</span>
              <input
                type="text"
                placeholder="Enter count"
                value={mapping.core_count}
                onChange={e => handleCoreMappingChange(idx, 'core_count', e.target.value)}
                className={errors[`core_count_${idx}`] ? 'error single-input' : 'single-input'}
              />
              {/* <span className="input-suffix">cores</span> */}
            </div>
          </div>

          {/* Second Row: Core Name and Clock */}
          <div className="core-mapping-row">
            <div className="input-wrapper">
              <span className="input-prefix">Supply Name:</span>
              <input
                type="text"
                placeholder="Enter supply"
                value={mapping.supply}
                onChange={e => handleCoreMappingChange(idx, 'supply', e.target.value)}
                className={errors[`supply_${idx}`] ? 'error single-input' : 'single-input'}
              />
              {/* <span className="input-suffix">V</span> */}
            </div>

            <div className="input-wrapper">
              <span className="input-prefix">Clock:</span>
              <input
                type="text"
                placeholder="Enter clock"
                value={mapping.clock || ''}
                onChange={e => handleCoreMappingChange(idx, 'clock', e.target.value)}
                className={errors[`clock_${idx}`] ? 'error single-input' : 'single-input'}
              />
              {/* <span className="input-suffix">MHz</span> */}
            </div>
          </div>
        </div>

        {/* Production Parameters for this core type */}
        <div className="production-section">
          <h5 className="production-section-label">
            <strong>Production Parameters for Core Type {idx + 1}</strong>
          </h5>
          <ProductionMappings
            selectedFlowOrders={selectedFlowOrders[idx] || []}
            productionMappings={productionMappings[idx] || {}}
            errors={errors}
            handleFlowOrderChange={(order) => handleFlowOrderChange(idx, order)}
            handleProductionMappingChange={(order, field, value) => handleProductionMappingChange(idx, order, field, value)}
            coreIndex={idx}
          />
        </div>

        {/* Charz Parameters Toggle for this core type */}
        <div className="form-group" style={{ marginLeft: '1rem' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showCharzForCore[idx] || false}
              onChange={() => handleCharzToggle(idx)}
              className="checkbox-input"
            />
            <span className="checkbox-custom"></span>
            Charz Parameters for Core Type {idx + 1}
          </label>
        </div>

        {/* Charz Parameters for this core type */}
        {showCharzForCore[idx] && (
          <div className="charz-section">
            <h5 className="charz-section-label">
              <strong>Charz Parameters for Core Type {idx + 1}</strong>
            </h5>
            <CharzParameters
              charzData={charzData[idx] || {}}
              setCharzData={(data) => setCharzData(idx, data)}
              errors={errors}
              ipType={ipType}
              coreIndex={idx}
            />
          </div>
        )}

      </div>
    ))}
  </div>
);

export default CoreMappings;
