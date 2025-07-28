import React from 'react';
import './CoreMappings.css';

const CoreMappings = ({ coreMappings, errors, handleCoreMappingChange }) => (
  <div className="core-mappings-section">
    {coreMappings.map((mapping, idx) => (
      <div key={idx} className="core-mapping-row">
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
        <input
          type="text"
          placeholder="Frequency"
          value={mapping.frequency || ''}
          onChange={e => handleCoreMappingChange(idx, 'frequency', e.target.value)}
          className={errors[`frequency_${idx}`] ? 'error single-input' : 'single-input'}
        />
      </div>
    ))}
  </div>
);

export default CoreMappings;