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
    if (st > 0) {
      for (let i = s; i <= e; i += st) result.push(i);
    } else {
      for (let i = s; i >= e; i += st) result.push(i);
    }
    return result;
  }
  return [];
}

function transformFormDataToBackend(formData) {
  // 1. core_mapping
  const core_mapping = {};
  (formData.core_mappings || []).forEach(m => {
    core_mapping[m.core] = {
      count: Number(m.core_count),
      supply: m.supply,
      clk: m.clock,
      freq: Number(m.frequency)
    };
  });

  // 2. floworder_mapping (with symbol-like keys)
  const floworder_mapping = {};
  (formData.flow_orders || []).forEach(order => {
    const m = formData.production_mappings[order] || {};
    floworder_mapping[order.toLowerCase()] = {
      ':test_points': parseFlowOrderTestPoints(m),
      ':frequency': Number(m.frequency),
      ':register_size': Number(m.register_size),
      // ':test_points': parseFlowOrderTestPoints(m), // Change to Insertion
      ':binnable': !!m.binnable,
      ':softsetenable': !!m.softsetenable, 
      ':fallbackenable': !!m.fallbackenable 
    };
  });

// 3. charztype_mapping
const charz = formData.charz || {};
const charztype_mapping = {
  ':granularity': [charz.search_granularity],
  ':searchtype': {}
};
(charz.search_types || []).forEach(type => {
  charztype_mapping[':searchtype'][type] = { ':testtype': {} };
  ['CREST', 'BIST', 'PBIST'].forEach(testType => {
    const table = charz.table?.[type]?.[testType] || {};
    const wlArr = charz.workloadTable?.[type]?.[testType] || [];
    charztype_mapping[':searchtype'][type][':testtype'][testType.toLowerCase()] = {
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

  // 4. Compose final object
  return {
    ip: 'cpu', // or from formData if available
    coretypes: Number(formData.num_core_types),
    core_mapping,
    spec_variable: formData.spec_variable,
    floworder_mapping,
    charztype_mapping
  };
}

export default transformFormDataToBackend;
