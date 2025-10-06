function transformFormDataToBackend(formData) {
  // Build core_mapping with nested floworder_mapping and charztype_mapping
  const core_mapping = {};

  (formData.core_mappings || []).forEach((coreMapping, coreIndex) => {
    const coreName = coreMapping.core;

    // Build floworder_mapping for this core (only if production is enabled)
    let floworder_mapping = {};

    if (formData.show_production_for_core && formData.show_production_for_core[coreIndex]) {
      const coreFlowOrders = formData.flow_orders[coreIndex] || [];
      const coreProductionMappings = formData.production_mappings[coreIndex] || {};

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
          readtype: buildReadType(mapping),
          specvariable: mapping.spec_variable || '',
          use_power_supply: !!mapping.use_power_supply
        };
      });
    }

    // Build charztype_mapping for this core (if enabled)
    let charztype_mapping = {};
    if (formData.show_charz_for_core && formData.show_charz_for_core[coreIndex]) {
      // Get charzData for THIS specific core
      const coreCharzData = formData.charz_data[coreIndex] || {};

      // Add debug logging
      console.log(`Core ${coreIndex} charz data:`, coreCharzData);
      console.log(`Core ${coreIndex} spec variables:`, coreCharzData.spec_variables);

      if (coreCharzData.search_granularity && coreCharzData.search_granularity.length > 0 &&
        coreCharzData.search_types && coreCharzData.search_types.length > 0) {

        charztype_mapping = {
          granularity: coreCharzData.search_granularity || [],
          searchtype: {}
        };

        (coreCharzData.search_types || []).forEach(searchType => {
          const selectedTestTypes = coreCharzData.selectedTestTypes?.[searchType] || [];

          // Get spec variable for this search type
          const searchTypeSpecVariable = coreCharzData.spec_variables?.[searchType] || '';

          console.log(`Search type ${searchType} spec variable:`, searchTypeSpecVariable);

          charztype_mapping.searchtype[searchType] = {
            specvariable: searchTypeSpecVariable,
            testtype: {}
          };

          selectedTestTypes.forEach(testType => {
            const table = coreCharzData.table?.[searchType]?.[testType] || {};
            const wlArr = coreCharzData.workloadTable?.[searchType]?.[testType] || [];

            charztype_mapping.searchtype[searchType].testtype[testType.toLowerCase()] = {
              wl_count: Number(table.wl_count) || 0,
              wl: wlArr,
              test_points: (table.tp || '').split(',').map(s => s.trim()).map(Number).filter(n => !isNaN(n)),
              searchsettings: {
                start: table.search_start || '',
                stop: table.search_end || '',
                mode: 'LinBin',
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
      freq: 1000,
      floworder_mapping: floworder_mapping,
      charztype_mapping: charztype_mapping
    };
  });

  // Log the final result
  console.log('Final core_mapping:', JSON.stringify(core_mapping, null, 2));

  return {
    core_mapping: core_mapping
  };
}

// Helper functions 
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