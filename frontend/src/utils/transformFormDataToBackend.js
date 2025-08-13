// Utility to transform frontend form data to backend Ruby structure
// Usage: transformFormDataToBackend(formData)

function parseFlowOrderTestPoints(mapping) {
  // Handles both 'List' and 'Range' types for productionMappings
  if (!mapping) return [];
  if (mapping.test_points_type === 'List') {
    if (!mapping.test_points || typeof mapping.test_points !== 'string') return [];
    return mapping.test_points
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(Number)
      .filter(n => !isNaN(n));
  } else if (mapping.test_points_type === 'Range') {
    const s = Number(mapping.test_points_start);
    const e = Number(mapping.test_points_stop);
    const st = Number(mapping.test_points_step);
    if (isNaN(s) || isNaN(e) || isNaN(st) || st === 0) return [];
    
    const result = [];
    
    // Helper function to determine appropriate decimal places for rounding
    const getDecimalPlaces = (num) => {
      const numStr = num.toString();
      if (numStr.indexOf('.') === -1) return 0;
      return numStr.split('.')[1].length;
    };
    
    const decimalPlaces = Math.max(getDecimalPlaces(s), getDecimalPlaces(e), getDecimalPlaces(st));
    
    if (st > 0) {
      for (let i = s; i <= e; i += st) {
        // Round to prevent floating point precision issues
        const roundedValue = Number(i.toFixed(decimalPlaces));
        result.push(roundedValue);
      }
    } else {
      for (let i = s; i >= e; i += st) {
        // Round to prevent floating point precision issues
        const roundedValue = Number(i.toFixed(decimalPlaces));
        result.push(roundedValue);
      }
    }
    return result;
  }
  return [];
}

// Function to parse insertion list (mixed strings/numbers)
function parseInsertionList(insertionString) {
  if (!insertionString || typeof insertionString !== 'string') return [];
  return insertionString
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== ''); // Keep as strings, don't convert to numbers
}

function transformFormDataToBackend(formData) {
  // 1. core_mapping
  const core_mapping = {};
  (formData.core_mappings || []).forEach(m => {
    core_mapping[m.core] = {
      count: Number(m.core_count),
      supply: m.supply,
      clk: m.clock,
      spec_variable: m.spec_variable
    };
  });

  // 2. floworder_mapping - now needs to combine all core types
  const floworder_mapping = {};
  
  // Loop through each core type's flow orders and production mappings
  (formData.flow_orders || []).forEach((coreFlowOrders, coreIndex) => {
    if (!Array.isArray(coreFlowOrders)) return;
    
    coreFlowOrders.forEach(order => {
      const coreProductionMappings = formData.production_mappings[coreIndex] || {};
      const m = coreProductionMappings[order] || {};
      
      // Create a unique key for this core-order combination
      const orderKey = `${order.toLowerCase()}_core_${coreIndex}`;
      
      floworder_mapping[orderKey] = {
        ':core_index': coreIndex,
        ':core_name': formData.core_mappings[coreIndex]?.core || `core_${coreIndex}`,
        ':spec_variable': formData.core_mappings[coreIndex]?.spec_variable || '', 
        ':test_points': parseFlowOrderTestPoints(m),
        ':frequency': Number(m.frequency),
        ':register_size': Number(m.register_size),
        ':insertionlist': parseInsertionList(m.insertion), 
        ':binnable': !!m.binnable,
        ':softsetenable': !!m.softsetenable, 
        ':fallbackenable': !!m.fallbackenable,
        ':read_type_jtag': !!m.read_type_jtag,
        ':read_type_fw': !!m.read_type_fw
      };
    });
  });

  // 3. charztype_mapping - now needs to handle per-core charz data
  const charztype_mapping = {};
  
  // Loop through each core type's charz data
  (formData.charz_data || []).forEach((charzData, coreIndex) => {
    // Only process if charz is enabled for this core
    if (!formData.show_charz_for_core || !formData.show_charz_for_core[coreIndex]) {
      return;
    }
    
    const charz = charzData || {};
    const coreKey = `core_${coreIndex}`;
    
    charztype_mapping[coreKey] = {
      ':core_index': coreIndex,
      ':core_name': formData.core_mappings[coreIndex]?.core || `core_${coreIndex}`,
      ':spec_variable': formData.core_mappings[coreIndex]?.spec_variable || '',
      ':granularity': charz.search_granularity || [],
      ':searchtype': {}
    };

    (charz.search_types || []).forEach(type => {
      charztype_mapping[coreKey][':searchtype'][type] = { ':testtype': {} };
      ['CREST', 'BIST', 'PBIST'].forEach(testType => {
        const table = charz.table?.[type]?.[testType] || {};
        const wlArr = charz.workloadTable?.[type]?.[testType] || [];
        charztype_mapping[coreKey][':searchtype'][type][':testtype'][testType.toLowerCase()] = {
          ':wl_count': Number(table.wl_count),
          ':wl': wlArr,
          ':test_points': (table.tp || '').split(',').map(Number).filter(n => !isNaN(n)),
          ':searchsettings': {
            ':start': table.search_start,
            ':stop': table.search_end,
            ':res': table.resolution,
            ':step': table.search_step
          }
        };
      });
    });
  });

  // 4. Compose final object
  return {
    ip: 'cpu', // or from formData if available
    coretypes: Number(formData.num_core_types),
    core_mapping,
    floworder_mapping,
    charztype_mapping
  };
}

export default transformFormDataToBackend;
