import React from 'react';
import './ProductionMappings.css';

const FLOW_ORDERS = ['AVGPSM', 'MINPSM', 'DLDOAVGPSM', 'DLDOMINPSM', 'CPO', 'FAVFS', 'MAFDD', 'DFLL'];

const ProductionMappings = ({
  selectedFlowOrders,
  productionMappings,
  errors,
  handleFlowOrderChange,
  handleProductionMappingChange,
}) => (
  <div className="production-section">
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
      {errors.flow_orders && <span className="error-message">{errors.flow_orders}</span>}
    </div>

    {/* Render mapping fields for each selected flow order */}
    {selectedFlowOrders.map(order => (
      <div key={order} className="production-mapping-block">
        <strong>{order.toUpperCase()} Mapping</strong>

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
                  (errors[`test_points_${order}`] ? 'error ' : '') + 'single-input test-points-list-input'
                }
              />
              <div className="input-hint">Fixed list separated by commas</div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Start"
                  value={productionMappings[order]?.test_points_start || ''}
                  onChange={e => handleProductionMappingChange(order, 'test_points_start', e.target.value)}
                  className={errors[`test_points_start_${order}`] ? 'error single-input' : 'single-input'}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Stop"
                  value={productionMappings[order]?.test_points_stop || ''}
                  onChange={e => handleProductionMappingChange(order, 'test_points_stop', e.target.value)}
                  className={errors[`test_points_stop_${order}`] ? 'error single-input' : 'single-input'}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Step"
                  value={productionMappings[order]?.test_points_step || ''}
                  onChange={e => handleProductionMappingChange(order, 'test_points_step', e.target.value)}
                  className={errors[`test_points_step_${order}`] ? 'error single-input' : 'single-input'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Insertion Field */}
        <div style={{ marginBottom: 4 }}>
          <input
            type="text"
            placeholder="Insertion List"
            value={productionMappings[order]?.insertion || ''}
            onChange={e => handleProductionMappingChange(order, 'insertion', e.target.value)}
            className={errors[`insertion_${order}`] ? 'error single-input insertion-input' : 'single-input insertion-input'}
          />
          <div className="input-hint">Fixed list separated by commas</div>
        </div>

        <input
          type="text"
          placeholder="Frequency"
          value={productionMappings[order]?.frequency || ''}
          onChange={e => handleProductionMappingChange(order, 'frequency', e.target.value)}
          className={errors[`frequency_${order}`] ? 'error single-input' : 'single-input'}
          style={{ marginBottom: 4 }}
        />

        <input
          type="text"
          placeholder="Register Size"
          value={productionMappings[order]?.register_size || ''}
          onChange={e => handleProductionMappingChange(order, 'register_size', e.target.value)}
          className={errors[`register_size_${order}`] ? 'error single-input' : 'single-input'}
          style={{ marginBottom: 4 }}
        />

        {/* Binnable Checkbox Option */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
          <label htmlFor={`binnable_${order}`} style={{ marginRight: 8 }}>Binnable?</label>
          <input
            type="checkbox"
            id={`binnable_${order}`}
            checked={!!productionMappings[order]?.binnable}
            onChange={e => handleProductionMappingChange(order, 'binnable', e.target.checked)}
            style={{ width: 18, height: 18, marginLeft: 'auto' }}
          />
        </div>

        {/* SoftsetEnable Checkbox Option */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
          <label htmlFor={`softsetenable_${order}`} style={{ marginRight: 8 }}>Softset Enable?</label>
          <input
            type="checkbox"
            id={`softsetenable_${order}`}
            checked={!!productionMappings[order]?.softsetenable}
            onChange={e => handleProductionMappingChange(order, 'softsetenable', e.target.checked)}
            style={{ width: 18, height: 18, marginLeft: 'auto' }}
          />
        </div>

        {/* FallbackEnable Checkbox Option */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
          <label htmlFor={`fallbackenable_${order}`} style={{ marginRight: 8 }}>FallBack Enable?</label>
          <input
            type="checkbox"
            id={`fallbackenable_${order}`}
            checked={!!productionMappings[order]?.fallbackenable}
            onChange={e => handleProductionMappingChange(order, 'fallbackenable', e.target.checked)}
            style={{ width: 18, height: 18, marginLeft: 'auto' }}
          />
        </div>

        {/* Show errors if any */}
        {/* {['test_type', 'test_points', 'frequency', 'register_size', 'ore_enable'].map(field =>
          errors[`${field}_${order}`] && (
            <span key={field} className="error-message">{errors[`${field}_${order}`]}</span>
          )
        )} */}
      </div>
    ))}
  </div>
);

export default ProductionMappings;