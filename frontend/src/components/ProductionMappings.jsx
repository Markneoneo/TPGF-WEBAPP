import React from 'react';
import './ProductionMappings.css';

const FLOW_ORDERS = ['AVGPSM', 'MINPSM', 'DLDOAVGPSM', 'DLDOMINPSM', 'CPO', 'FAVFS', 'MAFDD', 'DFLL', 'XVMIN', 'XVMINDD'];

const ProductionMappings = ({
  selectedFlowOrders,
  productionMappings,
  errors,
  handleFlowOrderChange,
  handleProductionMappingChange,
  coreIndex = 0 // Default to 0 for backward compatibility
}) => {
  // Update error field names to include core index
  const getErrorField = (order, field) => `${field}_${order}_core_${coreIndex}`;

  return (
    <div className="production-mappings">
      {/* Flow order selection as checkboxes */}
      <div className="form-group">
        <label>Flow Orders</label>
        <div className="input-hint">Select one or more flow orders</div>
        <div className="checkbox-group">
          {FLOW_ORDERS.map(order => (
            <label key={order} className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={selectedFlowOrders.includes(order)}
                onChange={() => handleFlowOrderChange(order)}
              />
              <span className="checkbox-custom"></span>
              {order}
            </label>
          ))}
        </div>
        {errors[`flow_orders_core_${coreIndex}`] && <span className="error-message">{errors[`flow_orders_core_${coreIndex}`]}</span>}
      </div>

      {/* Render mapping fields for each selected flow order */}
      {selectedFlowOrders.map(order => (
        <div key={order} className="production-mapping-block">

          <h5><strong>{order.toUpperCase()} Mapping</strong></h5>

          {/* Read Type Checkboxes */}
          <div className="form-group">
            <label>Read Type</label>
            <div className="input-hint">Select one read type (JTAG or FW)</div>
            {errors[getErrorField(order, 'read_type')] && (<span className="error-message">{errors[getErrorField(order, 'read_type')]}</span>)}
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
                  placeholder="Fixed List"
                  value={productionMappings[order]?.test_points || ''}
                  onChange={e => handleProductionMappingChange(order, 'test_points', e.target.value)}
                  className={
                    (errors[getErrorField(order, 'test_points')] ? 'error ' : '') + 'single-input test-points-list-input'
                  }
                />
                <div className="input-hint">Fixed list separated by commas</div>
                {errors[getErrorField(order, 'test_points')] && <span className="error-message">{errors[getErrorField(order, 'test_points')]}</span>}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Start Point"
                      value={productionMappings[order]?.test_points_start || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_start', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_start')] ? 'error single-input' : 'single-input'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Stop Point"
                      value={productionMappings[order]?.test_points_stop || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_stop', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_stop')] ? 'error single-input' : 'single-input'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Step"
                      value={productionMappings[order]?.test_points_step || ''}
                      onChange={e => handleProductionMappingChange(order, 'test_points_step', e.target.value)}
                      className={errors[getErrorField(order, 'test_points_step')] ? 'error single-input' : 'single-input'}
                    />
                  </div>
                </div>
                {/* Display individual field errors */}
                {errors[getErrorField(order, 'test_points_start')] && <span className="error-message">{errors[getErrorField(order, 'test_points_start')]}</span>}
                {errors[getErrorField(order, 'test_points_stop')] && <span className="error-message">{errors[getErrorField(order, 'test_points_stop')]}</span>}
                {errors[getErrorField(order, 'test_points_step')] && <span className="error-message">{errors[getErrorField(order, 'test_points_step')]}</span>}
                {/* Display range validation error */}
                {errors[getErrorField(order, 'test_points_range')] && <span className="error-message">{errors[getErrorField(order, 'test_points_range')]}</span>}
              </>
            )}
          </div>

          <input
            type="text"
            placeholder="Frequency"
            value={productionMappings[order]?.frequency || ''}
            onChange={e => handleProductionMappingChange(order, 'frequency', e.target.value)}
            className={errors[getErrorField(order, 'frequency')] ? 'error single-input' : 'single-input'}
            style={{ marginBottom: 4 }}
          />
          {errors[getErrorField(order, 'frequency')] && <span className="error-message">{errors[getErrorField(order, 'frequency')]}</span>}

          <input
            type="text"
            placeholder="Register Size"
            value={productionMappings[order]?.register_size || ''}
            onChange={e => handleProductionMappingChange(order, 'register_size', e.target.value)}
            className={errors[getErrorField(order, 'register_size')] ? 'error single-input' : 'single-input'}
            style={{ marginBottom: 4 }}
          />
          {errors[getErrorField(order, 'register_size')] && <span className="error-message">{errors[getErrorField(order, 'register_size')]}</span>}

          {/* Insertion Field */}
          <div style={{ marginBottom: 4 }}>
            <input
              type="text"
              placeholder="Insertion List"
              value={productionMappings[order]?.insertion || ''}
              onChange={e => handleProductionMappingChange(order, 'insertion', e.target.value)}
              className={errors[getErrorField(order, 'insertion')] ? 'error single-input insertion-input' : 'single-input insertion-input'}
            />
            <div className="input-hint">Fixed list separated by commas</div>
            {errors[getErrorField(order, 'insertion')] && <span className="error-message">{errors[getErrorField(order, 'insertion')]}</span>}
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

