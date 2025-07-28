import { useState, forwardRef, useImperativeHandle } from 'react';
import { getStandardizedTestPoints } from '../utils/testPointParser';
import CoreMappings from './CoreMappings';
import ProductionMappings from './ProductionMappings';
import CharzParameters from './CharzParameters';
import './ExtendedForm.css';
import './CharzParameters.css';
import validateForm from '../utils/validateForm';

const ExtendedForm = forwardRef(({ ipType, isProcessing, result }, ref) => {
  // Only keep state for fields you need
  const [errors, setErrors] = useState({});
  const [coreMappings, setCoreMappings] = useState([{ core: '', core_count: '', supply: '', frequency: '', clock: '' }]);
  const [numCoreTypes, setNumCoreTypes] = useState('1');
  const [specVariable, setSpecVariable] = useState('');
  const [selectedFlowOrders, setSelectedFlowOrders] = useState([]);
  const [productionMappings, setProductionMappings] = useState({});
  const [charzData, setCharzData] = useState({
    search_granularity: '',
    search_types: [],
    table: {},
    workloadTable: {}, // Added missing property
    psm_register_size: '',
  });

  // Handle number of core types change
  const handleNumCoreTypesChange = (e) => {
    const value = e.target.value.replace(/\D/, ''); // Only digits
    setNumCoreTypes(value);
    setErrors(prev => ({ ...prev, num_core_types: '' }));

    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setCoreMappings(prev => {
        const arr = [...prev];
        if (arr.length < num) {
          // Add rows
          while (arr.length < num) arr.push({ core: '', core_count: '', supply: '', frequency: '', clock: '' });
        } else if (arr.length > num) {
          // Remove rows
          arr.length = num;
        }
        return arr;
      });
    } else {
      setCoreMappings([]);
    }
  };

  // Handle dynamic mapping field change
  const handleCoreMappingChange = (idx, field, value) => {
    setCoreMappings(prev => {
      const arr = [...prev];
      arr[idx][field] = value;
      return arr;
    });
  };

  // Handle flow order selection (multi-select)
  const handleFlowOrderChange = (order) => {
    setSelectedFlowOrders(prev => {
      if (prev.includes(order)) {
        setProductionMappings(mappings => {
          const updated = { ...mappings };
          delete updated[order];
          return updated;
        });
        return prev.filter(o => o !== order);
      } else {
        return [...prev, order];
      }
    });
  };

  // Handle production mapping field change
  const handleProductionMappingChange = (order, field, value) => {
    setProductionMappings(prev => ({
      ...prev,
      [order]: {
        ...prev[order],
        [field]: value
      }
    }));
  };

  // Clear form data
  const clearForm = () => {
    setNumCoreTypes('1');
    setCoreMappings([{ core: '', core_count: '', supply: '', frequency: '', clock: '' }]);
    setSpecVariable('');
    setSelectedFlowOrders([]);
    setProductionMappings({});
    setCharzData({
      search_granularity: '',
      search_types: [],
      table: {},
      workloadTable: {}, // Added this line
      psm_register_size: '',
    });
    setErrors({});
  };

  // Validation function
  const validate = () => {
    const newErrors = validateForm({
      numCoreTypes,
      coreMappings,
      specVariable,
      selectedFlowOrders,
      productionMappings,
      charzData
    });
    setErrors(newErrors);
    // Debug: log all error keys and values for inspection
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation error keys:', Object.keys(newErrors));
      console.log('Validation error values:', newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  // Expose validate and clearForm to parent via ref
  useImperativeHandle(ref, () => ({
    validate,
    clearForm,
    getFormData: () => ({
      num_core_types: numCoreTypes,
      core_mappings: coreMappings,
      spec_variable: specVariable,
      flow_orders: selectedFlowOrders,
      production_mappings: productionMappings,
      charz: charzData,
    }),
    getErrors: () => errors // <-- Ensure this always returns the latest errors
  }));

  return (
    <div className="extended-form" data-ip-type={ipType}>
      <h3 className="form-title">{ipType} Configuration</h3>
      <div className="form-container">
        {/* Common Parameters */}
        <div className="core-mappings-section" style={{ marginBottom: '2rem' }}>
          <h4 style={{ borderBottom: '1px solid #007bff', color: '#007bff', marginBottom: '1rem' }}>Common Parameters</h4>
          {/* Number of Core Types as number input */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '100%' }}>
            <label htmlFor={`num_core_types_${ipType}`} style={{ flex: 1 }}>Number of Core Types</label>
            <button
              type="button"
              className="core-type-btn"
              onClick={() => {
                const current = parseInt(numCoreTypes || '0', 10);
                if (current > 1) {
                  const e = { target: { value: String(current - 1) } };
                  handleNumCoreTypesChange(e);
                }
              }}
              style={{ minWidth: 32 }}
            >-</button>
            <input
              type="number"
              min="1"
              id={`num_core_types_${ipType}`}
              name="num_core_types"
              placeholder="Enter number of core types"
              value={numCoreTypes}
              onChange={handleNumCoreTypesChange}
              className={errors.num_core_types ? 'error single-input' : 'single-input'}
              style={{ textAlign: 'center' }}
            />
            <button
              type="button"
              className="core-type-btn"
              onClick={() => {
                const current = parseInt(numCoreTypes || '0', 10);
                const e = { target: { value: String(current + 1) } };
                handleNumCoreTypesChange(e);
              }}
              style={{ minWidth: 32 }}
            >+</button>
          </div>
          {errors.num_core_types && <span className="error-message">{errors.num_core_types}</span>}
          {/* Dynamic core mappings */}
          {coreMappings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label>Core Mappings</label>
              <CoreMappings
                coreMappings={coreMappings}
                errors={errors}
                handleCoreMappingChange={handleCoreMappingChange}
              />
            </div>
          )}
          {/* Single input for Spec Variable */}
          <div className="form-group">
            <label htmlFor={`spec_variable_${ipType}`}>Spec Variable</label>
            <input
              type="text"
              id={`spec_variable_${ipType}`}
              name="spec_variable"
              value={specVariable}
              onChange={e => setSpecVariable(e.target.value)}
              className={errors.spec_variable ? 'error single-input' : 'single-input'}
            />
            {errors.spec_variable && <span className="error-message">{errors.spec_variable}</span>}
          </div>
        </div>
        {/* Production Parameters with dynamic mapping */}
        <div className="production-section" style={{ marginBottom: '2rem' }}>
          <h4 style={{ borderBottom: '1px solid #b36b00', color: '#b36b00', marginBottom: '1rem' }}>Production Parameters</h4>
          <ProductionMappings
            selectedFlowOrders={selectedFlowOrders}
            productionMappings={productionMappings}
            errors={errors}
            handleFlowOrderChange={handleFlowOrderChange}
            handleProductionMappingChange={handleProductionMappingChange}
          />
        </div>
        {/* Charz Parameters */}
        <CharzParameters
          charzData={charzData}
          setCharzData={setCharzData}
          errors={errors}
          ipType={ipType}
        />

        {errors.submit && <div className="error-message">{errors.submit}</div>}

        <div className="button-group">
          <button
            type="button"
            className="secondary-button"
            style={{ background: '#ffc107', color: '#222', marginRight: 8 }}
            onClick={() => {
              // Show transformed backend data for this IP type
              const formData = {
                num_core_types: numCoreTypes,
                core_mappings: coreMappings,
                spec_variable: specVariable,
                flow_orders: selectedFlowOrders,
                production_mappings: productionMappings,
                charz: charzData,
              };
              // Use the transformation utility
              import('../utils/transformFormDataToBackend').then(module => {
                const transformed = module.default(formData);
                console.log('Transformed backend data for', ipType, transformed);
              });
            }}
          >
            Show Form Data
          </button>
          <button onClick={clearForm} className="secondary-button">
            Clear {ipType} Form
          </button>
        </div>
      </div>
    </div>
  );
});

export default ExtendedForm;