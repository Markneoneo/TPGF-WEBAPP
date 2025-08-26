import React from 'react';
import Select from 'react-select';
import './ProductionMappings.css';

const FLOW_ORDERS = ['AVGPSM', 'MINPSM', 'DLDOAVGPSM', 'DLDOMINPSM', 'CPO', 'FAVFS', 'MAFDD', 'DFLL', 'XVMIN', 'XVMINDD'];

// Convert flow orders to react-select options format
const flowOrderOptions = FLOW_ORDERS.map(order => ({
  value: order,
  label: order
}));

// Custom styles for react-select
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#ffb300' : '#ffe5b4',
    borderWidth: '1.5px',
    borderRadius: '5px',
    boxShadow: state.isFocused ? '0 0 0 2px #ffe5b4' : 'none',
    '&:hover': {
      borderColor: '#ffb300'
    },
    minHeight: '40px',
    fontSize: '1rem'
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#ffe5b4',
    borderRadius: '4px'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#b36b00',
    fontWeight: '600'
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#b36b00',
    '&:hover': {
      backgroundColor: '#ffb300',
      color: '#fff'
    }
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#999',
    fontSize: '1rem'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#ffb300'
      : state.isFocused
        ? '#ffe5b4'
        : 'white',
    color: state.isSelected
      ? 'white'
      : state.isFocused
        ? '#b36b00'
        : '#333',
    fontSize: '1rem'
  })
};

const ProductionMappings = ({
  selectedFlowOrders,
  productionMappings,
  errors,
  handleFlowOrderChange,
  handleProductionMappingChange,
  coreIndex = 0
}) => {
  // Update error field names to include core index
  const getErrorField = (order, field) => `${field}_${order}_core_${coreIndex}`;

  // Convert selected flow orders to react-select value format
  const selectedOptions = selectedFlowOrders.map(order => ({
    value: order,
    label: order
  }));

  // Handle react-select change
  const handleSelectChange = (selectedOptions) => {
    const currentSelected = selectedFlowOrders;
    const newSelected = selectedOptions ? selectedOptions.map(option => option.value) : [];

    // Find added and removed orders
    const added = newSelected.filter(order => !currentSelected.includes(order));
    const removed = currentSelected.filter(order => !newSelected.includes(order));

    // Handle added orders
    added.forEach(order => handleFlowOrderChange(order));

    // Handle removed orders
    removed.forEach(order => handleFlowOrderChange(order));
  };

  return (
    <div className="production-mappings">
      {/* Flow order selection with React-Select */}
      <div className="form-group">
        <label>Flow Orders</label>
        <div className="input-hint">Select one or more flow orders</div>
        <div className="react-select-container">
          <Select
            isMulti
            isSearchable
            options={flowOrderOptions}
            value={selectedOptions}
            onChange={handleSelectChange}
            placeholder="Search and select flow orders..."
            styles={customStyles}
            className="react-select"
            classNamePrefix="react-select"
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            isClearable={false}
            menuPlacement="auto"
            maxMenuHeight={200}
          />
        </div>
        {errors[`flow_orders_core_${coreIndex}`] && (
          <span className="error-message">{errors[`flow_orders_core_${coreIndex}`]}</span>
        )}
      </div>

      {/* Render mapping fields for each selected flow order */}
      {selectedFlowOrders.map(order => (
        <div key={order} className="production-mapping-block">
          <h5><strong>{order.toUpperCase()} Mapping</strong></h5>

          {/* Read Type Checkboxes */}
          <div className="form-group">
            <label>Read Type</label>
            <div className="input-hint">Select one read type (JTAG or FW)</div>
            {errors[getErrorField(order, 'read_type')] && (
              <span className="error-message">{errors[getErrorField(order, 'read_type')]}</span>
            )}
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={!!productionMappings[order]?.read_type_jtag}
                  onChange={e => handleProductionMappingChange(order, 'read_type_jtag', e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                JTAG
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={!!productionMappings[order]?.read_type_fw}
                  onChange={e => handleProductionMappingChange(order, 'read_type_fw', e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                FW
              </label>
            </div>
          </div>

          {/* Test Points Dropdown and Conditional Fields */}
          <div style={{ marginBottom: 4 }}>
            <select
              value={productionMappings[order]?.test_points_type || 'Range'}
              onChange={e => handleProductionMappingChange(order, 'test_points_type', e.target.value)}
              className="single-input"
              style={{ marginBottom: 4 }}
            >
              <option value="Range">Test Point Range</option>
              <option value="List">Test Point List</option>
            </select>
            {productionMappings[order]?.test_points_type === 'List' ? (
              <>
                <input
                  type="text"
                  placeholder="Enter Fixed list separated by commas"
                  value={productionMappings[order]?.test_points || ''}
                  onChange={e => handleProductionMappingChange(order, 'test_points', e.target.value)}
                  className={
                    (errors[getErrorField(order, 'test_points')] ? 'error ' : '') + 'single-input test-points-list-input'
                  }
                />
                {/* <div className="input-hint">Fixed list separated by commas</div> */}
                {errors[getErrorField(order, 'test_points')] && (
                  <span className="error-message">{errors[getErrorField(order, 'test_points')]}</span>
                )}
              </>
            ) : (
              <>
                <div className="test-points-range-container">
                  <div className="test-point-field">
                    <span className="test-point-label">Start Point:</span>
                    <input
                      type="text"
                      value={productionMappings[order]?.test_points_start || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_start', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_start')] ? 'error single-input' : 'single-input'}
                    />
                    <span className="test-point-unit">V</span>
                  </div>
                  <div className="test-point-field">
                    <span className="test-point-label">Stop Point:</span>
                    <input
                      type="text"
                      value={productionMappings[order]?.test_points_stop || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_stop', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_stop')] ? 'error single-input' : 'single-input'}
                    />
                    <span className="test-point-unit">V</span>
                  </div>
                  <div className="test-point-field">
                    <span className="test-point-label">Step:</span>
                    <input
                      type="text"
                      value={productionMappings[order]?.test_points_step || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_step', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_step')] ? 'error single-input' : 'single-input'}
                    />
                    <span className="test-point-unit">V</span>
                  </div>
                </div>

                {/* Display individual field errors */}
                {errors[getErrorField(order, 'test_points_start')] && (
                  <span className="error-message">{errors[getErrorField(order, 'test_points_start')]}</span>
                )}
                {errors[getErrorField(order, 'test_points_stop')] && (
                  <span className="error-message">{errors[getErrorField(order, 'test_points_stop')]}</span>
                )}
                {errors[getErrorField(order, 'test_points_step')] && (
                  <span className="error-message">{errors[getErrorField(order, 'test_points_step')]}</span>
                )}
                {/* Display range validation error */}
                {errors[getErrorField(order, 'test_points_range')] && (
                  <span className="error-message">{errors[getErrorField(order, 'test_points_range')]}</span>
                )}
              </>
            )}
          </div>

          <div className="input-field-container">
            <span className="input-field-label">Frequency:</span>
            <input
              type="text"
              value={productionMappings[order]?.frequency || ''}
              onChange={e => handleProductionMappingChange(order, 'frequency', e.target.value)}
              className={errors[getErrorField(order, 'frequency')] ? 'error single-input' : 'single-input'}
            />
            <span className="input-field-unit">MHz</span>
          </div>
          {errors[getErrorField(order, 'frequency')] && (
            <span className="error-message">{errors[getErrorField(order, 'frequency')]}</span>
          )}

          <div className="input-field-container">
            <span className="input-field-label">Register Size:</span>
            <input
              type="text"
              value={productionMappings[order]?.register_size || ''}
              onChange={e => handleProductionMappingChange(order, 'register_size', e.target.value)}
              className={errors[getErrorField(order, 'register_size')] ? 'error single-input' : 'single-input'}
            />
            {/* <span className="input-field-unit">bits</span> */}
          </div>
          {errors[getErrorField(order, 'register_size')] && (
            <span className="error-message">{errors[getErrorField(order, 'register_size')]}</span>
          )}

          {/* Insertion Field */}
          <div className="insertion-field-container">
            <div className="input-field-container">
              <span className="input-field-label">Insertion List:</span>
              <input
                type="text"
                placeholder="Enter Fixed list separated by commas"
                value={productionMappings[order]?.insertion || ''}
                onChange={e => handleProductionMappingChange(order, 'insertion', e.target.value)}
                className={errors[getErrorField(order, 'insertion')] ? 'error single-input insertion-input' : 'single-input insertion-input'}
              />
              {/* <span className="input-field-unit">dB</span> */}
            </div>
            {/* <div className="input-hint">Fixed list separated by commas</div> */}
            {errors[getErrorField(order, 'insertion')] && (
              <span className="error-message">{errors[getErrorField(order, 'insertion')]}</span>
            )}
          </div>

          {/* Binnable Checkbox Option */}
          <div className="binnable-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
            <label htmlFor={`binnable_${order}_core_${coreIndex}`} style={{ marginRight: 8 }}>Binnable?</label>
            <input
              type="checkbox"
              id={`binnable_${order}_core_${coreIndex}`}
              checked={!!productionMappings[order]?.binnable}
              onChange={e => handleProductionMappingChange(order, 'binnable', e.target.checked)}
              style={{ width: 18, height: 18, marginLeft: 'auto' }}
            />
          </div>

          {/* SoftsetEnable Checkbox Option */}
          <div className="binnable-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
            <label htmlFor={`softsetenable_${order}_core_${coreIndex}`} style={{ marginRight: 8 }}>Softset Enable?</label>
            <input
              type="checkbox"
              id={`softsetenable_${order}_core_${coreIndex}`}
              checked={!!productionMappings[order]?.softsetenable}
              onChange={e => handleProductionMappingChange(order, 'softsetenable', e.target.checked)}
              style={{ width: 18, height: 18, marginLeft: 'auto' }}
            />
          </div>

          {/* FallbackEnable Checkbox Option */}
          <div className="binnable-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
            <label htmlFor={`fallbackenable_${order}_core_${coreIndex}`} style={{ marginRight: 8 }}>FallBack Enable?</label>
            <input
              type="checkbox"
              id={`fallbackenable_${order}_core_${coreIndex}`}
              checked={!!productionMappings[order]?.fallbackenable}
              onChange={e => handleProductionMappingChange(order, 'fallbackenable', e.target.checked)}
              style={{ width: 18, height: 18, marginLeft: 'auto' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductionMappings;

