import { useState, forwardRef, useImperativeHandle } from 'react';
import { getStandardizedTestPoints } from '../utils/testPointParser';
import CoreMappings from './CoreMappings';
import './ExtendedForm.css';
import './CharzParameters.css';
import validateForm from '../utils/validateForm';

const ExtendedForm = forwardRef(({ ipType, isProcessing, result }, ref) => {
  const [errors, setErrors] = useState({});
  const [coreMappings, setCoreMappings] = useState([{ core: '', core_count: '', supply: '', clock: '', spec_variable: '' }]);
  const [numCoreTypes, setNumCoreTypes] = useState('1');

  // Changed: Now arrays indexed by core type
  const [selectedFlowOrders, setSelectedFlowOrders] = useState([[]]);
  const [productionMappings, setProductionMappings] = useState([{}]);
  const [showCharzForCore, setShowCharzForCore] = useState([false]);
  const [charzData, setCharzData] = useState([{
    search_granularity: '',
    search_types: [],
    table: {},
    workloadTable: {},
    psm_register_size: '',
  }]);

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
          while (arr.length < num) arr.push({ core: '', core_count: '', supply: '', clock: '', spec_variable: '' });
        } else if (arr.length > num) {
          arr.length = num;
        }
        return arr;
      });

      // Resize other arrays to match
      setSelectedFlowOrders(prev => {
        const arr = [...prev];
        while (arr.length < num) arr.push([]);
        if (arr.length > num) arr.length = num;
        return arr;
      });

      setProductionMappings(prev => {
        const arr = [...prev];
        while (arr.length < num) arr.push({});
        if (arr.length > num) arr.length = num;
        return arr;
      });

      setShowCharzForCore(prev => {
        const arr = [...prev];
        while (arr.length < num) arr.push(false);
        if (arr.length > num) arr.length = num;
        return arr;
      });

      setCharzData(prev => {
        const arr = [...prev];
        while (arr.length < num) arr.push({
          search_granularity: '',
          search_types: [],
          table: {},
          workloadTable: {},
          psm_register_size: '',
        });
        if (arr.length > num) arr.length = num;
        return arr;
      });
    } else {
      setCoreMappings([]);
      setSelectedFlowOrders([]);
      setProductionMappings([]);
      setShowCharzForCore([]);
      setCharzData([]);
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

  // Handle flow order selection for specific core type
  const handleFlowOrderChange = (coreIndex, order) => {
    setSelectedFlowOrders(prev => {
      const newFlowOrders = [...prev];
      if (!newFlowOrders[coreIndex]) {
        newFlowOrders[coreIndex] = [];
      }

      if (newFlowOrders[coreIndex].includes(order)) {
        // Remove the order and its mapping
        newFlowOrders[coreIndex] = newFlowOrders[coreIndex].filter(o => o !== order);
        setProductionMappings(mappings => {
          const updated = [...mappings];
          if (updated[coreIndex]) {
            delete updated[coreIndex][order];
          }
          return updated;
        });
      } else {
        // Add the order and initialize its mapping
        newFlowOrders[coreIndex] = [...newFlowOrders[coreIndex], order];
        setProductionMappings(mappings => {
          const updated = [...mappings];
          if (!updated[coreIndex]) {
            updated[coreIndex] = {};
          }
          updated[coreIndex][order] = {
            ...updated[coreIndex][order],
            test_points_type: updated[coreIndex][order]?.test_points_type || 'Range',
            test_points_start: updated[coreIndex][order]?.test_points_start || '',
            test_points_stop: updated[coreIndex][order]?.test_points_stop || '',
            test_points_step: updated[coreIndex][order]?.test_points_step || '',
            frequency: updated[coreIndex][order]?.frequency || '',
            register_size: updated[coreIndex][order]?.register_size || '',
            insertion: updated[coreIndex][order]?.insertion || '',
            binnable: updated[coreIndex][order]?.binnable || false,
            softsetenable: updated[coreIndex][order]?.softsetenable || false,
            fallbackenable: updated[coreIndex][order]?.fallbackenable || false,
            read_type_jtag: updated[coreIndex][order]?.read_type_jtag || false,
            read_type_fw: updated[coreIndex][order]?.read_type_fw || false
          };
          return updated;
        });
      }
      return newFlowOrders;
    });
  };

  // Handle production mapping field change for specific core type
  const handleProductionMappingChange = (coreIndex, order, field, value) => {
    setProductionMappings(prev => {
      const updated = [...prev];
      if (!updated[coreIndex]) {
        updated[coreIndex] = {};
      }
      if (!updated[coreIndex][order]) {
        updated[coreIndex][order] = {};
      }
      updated[coreIndex][order][field] = value;
      return updated;
    });
  };

  // Handle charz toggle for specific core type
  const handleCharzToggle = (coreIndex) => {
    setShowCharzForCore(prev => {
      const updated = [...prev];
      updated[coreIndex] = !updated[coreIndex];

      // Clear charz data if disabling
      if (!updated[coreIndex]) {
        setCharzData(charzPrev => {
          const charzUpdated = [...charzPrev];
          charzUpdated[coreIndex] = {
            search_granularity: '',
            search_types: [],
            table: {},
            workloadTable: {},
            psm_register_size: ''
          };
          return charzUpdated;
        });
      }
      return updated;
    });
  };

  // Handle charz data change for specific core type
  const handleCharzDataChange = (coreIndex, data) => {
    setCharzData(prev => {
      const updated = [...prev];
      updated[coreIndex] = data;
      return updated;
    });
  };

  // Clear form data
  const clearForm = () => {
    setNumCoreTypes('1');
    setCoreMappings([{ core: '', core_count: '', supply: '', clock: '', spec_variable: '' }]);
    setSpecVariable('');
    setSelectedFlowOrders([[]]);
    setProductionMappings([{}]);
    setShowCharzForCore([false]);
    setCharzData([{
      search_granularity: '',
      search_types: [],
      table: {},
      workloadTable: {},
      psm_register_size: '',
    }]);
    setErrors({});
  };

  // Validation function
  const validate = () => {
    const newErrors = validateForm({
      numCoreTypes,
      coreMappings,
      selectedFlowOrders,
      productionMappings,
      charzData,
      showCharzForCore
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
      flow_orders: selectedFlowOrders,
      production_mappings: productionMappings,
      charz_data: charzData,
      show_charz_for_core: showCharzForCore,
    }),
    getErrors: () => errors
  }));

  return (
    <div className="extended-form" data-ip-type={ipType}>
      <h3 className="form-title">{ipType} Configuration</h3>
      <div className="form-container">

        {/* Number of Core Types as number input */}
        <div className="form-group core-types-group">
          <label htmlFor={`num_core_types_${ipType}`}>Number of Core Types: </label>
          <div className="number-input-container">
            <button
              type="button"
              className="number-btn"
              onClick={() => {
                const current = parseInt(numCoreTypes || '0', 10);
                if (current > 1) {
                  const e = { target: { value: String(current - 1) } };
                  handleNumCoreTypesChange(e);
                }
              }}
              disabled={parseInt(numCoreTypes) <= 1}
            >-</button>
            <input
              type="number"
              min="1"
              id={`num_core_types_${ipType}`}
              name="num_core_types"
              placeholder="1"
              value={numCoreTypes}
              onChange={handleNumCoreTypesChange}
              className={errors.num_core_types ? 'error number-input' : 'number-input'}
            />
            <button
              type="button"
              className="number-btn"
              onClick={() => {
                const current = parseInt(numCoreTypes || '0', 10);
                const e = { target: { value: String(current + 1) } };
                handleNumCoreTypesChange(e);
              }}
            >+</button>
          </div>
          {errors.num_core_types && <span className="error-message">{errors.num_core_types}</span>}
        </div>

        {/* Dynamic core mappings with production and charz parameters for each */}
        {coreMappings.length > 0 && (
          <div className="core-mappings-container">
            <div className="section-header">
              <h5>Core Mappings</h5>
              <span className="section-badge">{coreMappings.length} core{coreMappings.length !== 1 ? 's' : ''}</span>
            </div>
            <CoreMappings
              coreMappings={coreMappings}
              errors={errors}
              handleCoreMappingChange={handleCoreMappingChange}
              productionMappings={productionMappings}
              charzData={charzData}
              selectedFlowOrders={selectedFlowOrders}
              showCharzForCore={showCharzForCore}
              handleFlowOrderChange={handleFlowOrderChange}
              handleProductionMappingChange={handleProductionMappingChange}
              handleCharzToggle={handleCharzToggle}
              setCharzData={handleCharzDataChange}
              ipType={ipType}
            />
          </div>
        )}
      </div>

      {errors.submit && <div className="error-message">{errors.submit}</div>}

      <div className="form-actions">
        <button onClick={clearForm} className="action-button clear-button">
          <span>🗑️</span> Clear Form
        </button>
      </div>

    </div>
  );
});

export default ExtendedForm;

