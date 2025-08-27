function transformFormDataToBackend(formData) {
  // Build core_mapping with nested floworder_mapping and charztype_mapping
  const core_mapping = {};

  (formData.core_mappings || []).forEach((coreMapping, coreIndex) => {
    const coreName = coreMapping.core;

    // Build floworder_mapping for this core (only if production is enabled)
    let floworder_mapping = {};
    let specVariable = '';

    if (formData.show_production_for_core && formData.show_production_for_core[coreIndex]) {
      const coreFlowOrders = formData.flow_orders[coreIndex] || [];
      const coreProductionMappings = formData.production_mappings[coreIndex] || {};

      // Get spec_variable from production mappings
      specVariable = coreProductionMappings.spec_variable || '';

      coreFlowOrders.forEach(order => {
        const mapping = coreProductionMappings[order] || {};

        floworder_mapping[order.toLowerCase()] = {
          test_points: parseFlowOrderTestPoints(mapping),
          frequency: Number(mapping.frequency) || 0,
          register_size: Number(mapping.register_size) || 0,
          binnable: !!mapping.binnable,
          softsetenable: !!mapping.softsetenable,
          fallbackenable: !!mapping.fallbackenable,
          insertionlist: parseInsertionList(mapping.insertion),
          readtype: buildReadType(mapping)
        };
      });
    }

    // Build charztype_mapping for this core (if enabled)
    let charztype_mapping = {};
    if (formData.show_charz_for_core && formData.show_charz_for_core[coreIndex]) {
      const charzData = formData.charz_data[coreIndex] || {};

      if (charzData.search_granularity && charzData.search_granularity.length > 0 &&
        charzData.search_types && charzData.search_types.length > 0) {

        charztype_mapping = {
          granularity: charzData.search_granularity || [],
          searchtype: {}
        };

        (charzData.search_types || []).forEach(searchType => {
          const selectedTestTypes = charzData.selectedTestTypes?.[searchType] || [];

          charztype_mapping.searchtype[searchType] = {
            testtype: {}
          };

          selectedTestTypes.forEach(testType => {
            const table = charzData.table?.[searchType]?.[testType] || {};
            const wlArr = charzData.workloadTable?.[searchType]?.[testType] || [];

            charztype_mapping.searchtype[searchType].testtype[testType.toLowerCase()] = {
              wl_count: Number(table.wl_count) || 0,
              wl: wlArr,
              test_points: (table.tp || '').split(',').map(s => s.trim()).map(Number).filter(n => !isNaN(n)),
              searchsettings: {
                start: table.search_start || '',
                stop: table.search_end || '',
                mode: 'LinBin', // You can make this configurable
                res: table.resolution || '',
                step: table.search_step || ''
              }
            };
          });
        });
      }
    }

    // Build the core mapping entry
    core_mapping[coreName] = {
      count: Number(coreMapping.core_count) || 0,
      supply: coreMapping.supply || '',
      clk: coreMapping.clock || '',
      freq: 1000, // You can make this configurable
      specvariable: specVariable,
      floworder_mapping: floworder_mapping,
      charztype_mapping: charztype_mapping
    };
  });

  return {
    ip: 'cpu', // or from formData if available
    core_mapping: core_mapping
  };
}

// Helper functions remain the same
function buildReadType(mapping) {
  const readTypes = [];
  if (mapping.read_type_jtag) readTypes.push('jtag');
  if (mapping.read_type_fw) readTypes.push('fw');
  return readTypes;
}

function parseFlowOrderTestPoints(mapping) {
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
    const getDecimalPlaces = (num) => {
      const numStr = num.toString();
      if (numStr.indexOf('.') === -1) return 0;
      return numStr.split('.')[1].length;
    };

    const decimalPlaces = Math.max(getDecimalPlaces(s), getDecimalPlaces(e), getDecimalPlaces(st));

    if (st > 0) {
      for (let i = s; i <= e; i += st) {
        const roundedValue = Number(i.toFixed(decimalPlaces));
        result.push(roundedValue);
      }
    } else {
      for (let i = s; i >= e; i += st) {
        const roundedValue = Number(i.toFixed(decimalPlaces));
        result.push(roundedValue);
      }
    }
    return result;
  }
  return [];
}

function parseInsertionList(insertionString) {
  if (!insertionString || typeof insertionString !== 'string') return [];
  return insertionString
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '');
}

export default transformFormDataToBackend;