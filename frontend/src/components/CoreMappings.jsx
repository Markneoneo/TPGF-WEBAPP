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

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor={`spec_variable_${idx}`}>Spec Variable for Core {idx + 1}</label>
          <input
            type="text"
            id={`spec_variable_${idx}`}
            placeholder="Enter spec variable"
            value={mapping.spec_variable || ''}
            onChange={e => handleCoreMappingChange(idx, 'spec_variable', e.target.value)}
            className={errors[`spec_variable_${idx}`] ? 'error single-input' : 'single-input'}
          />
          {errors[`spec_variable_${idx}`] && <span className="error-message">{errors[`spec_variable_${idx}`]}</span>}
        </div>

        {/* Core Mapping Row */}
        <div className="core-mapping-row">
          <input
            type="text"
            placeholder="Core"
            value={mapping.core}
            onChange={e => handleCoreMappingChange(idx, 'core', e.target.value)}
            className={errors[`core_${idx}`] ? 'error single-input' : 'single-input'}
          />
          <input
            type="text"
            placeholder="Core Count"
            value={mapping.core_count}
            onChange={e => handleCoreMappingChange(idx, 'core_count', e.target.value)}
            className={errors[`core_count_${idx}`] ? 'error single-input' : 'single-input'}
          />
          <input
            type="text"
            placeholder="Supply"
            value={mapping.supply}
            onChange={e => handleCoreMappingChange(idx, 'supply', e.target.value)}
            className={errors[`supply_${idx}`] ? 'error single-input' : 'single-input'}
          />
          <input
            type="text"
            placeholder="Clock"
            value={mapping.clock || ''}
            onChange={e => handleCoreMappingChange(idx, 'clock', e.target.value)}
            className={errors[`clock_${idx}`] ? 'error single-input' : 'single-input'}
          />
        </div>

        {/* Production Parameters for this core type */}
        <div className="production-section" style={{ marginTop: '1rem', marginBottom: '1rem', marginLeft: '1rem', border: '1px solid #b36b00', borderRadius: '4px', padding: '1rem' }}>
          <h5 style={{ borderBottom: '1px solid #b36b00', color: '#b36b00', marginBottom: '1rem' }}>
            Production Parameters for Core {idx + 1}
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
            Charz Parameters for Core {idx + 1}
          </label>
        </div>

        {/* Charz Parameters for this core type */}
        {showCharzForCore[idx] && (
          <div style={{ marginLeft: '1rem', border: '1px solid #6f42c1', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
            <h5 style={{ borderBottom: '1px solid #6f42c1', color: '#6f42c1', marginBottom: '1rem' }}>
              Charz Parameters for Core {idx + 1}
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
