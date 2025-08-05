// This module exports the validate function for ExtendedForm

// Helper function to validate test point range
function validateTestPointRange(start, stop, step) {
  const startNum = Number(start);
  const stopNum = Number(stop);
  const stepNum = Number(step);
  
  // Basic numeric validation
  if (isNaN(startNum) || isNaN(stopNum) || isNaN(stepNum) || stepNum === 0) {
    return { isValid: false, message: 'All values must be valid numbers and step cannot be zero' };
  }
  
  // Step direction validation
  if ((stopNum > startNum && stepNum < 0) || (stopNum < startNum && stepNum > 0)) {
    return { isValid: false, message: 'Step direction must match start-stop direction' };
  }
  
  // Check if stop value is reachable with the given step
  const range = Math.abs(stopNum - startNum);
  const absStep = Math.abs(stepNum);
  
  // Use a small epsilon for floating point comparison
  const epsilon = 1e-10;
  const remainder = range % absStep;
  
  if (remainder > epsilon) {
    return { 
      isValid: false, 
      message: `Step ${stepNum} cannot generate steady intervals from ${startNum} to ${stopNum}. The range (${range}) is not evenly divisible by the step.`
    };
  }
  
  return { isValid: true, message: null };
}

export default function validate({
  numCoreTypes,
  coreMappings,
  specVariable,
  selectedFlowOrders,
  productionMappings,
  charzData
}) {
  const newErrors = {};

  // Number of core types
  if (!numCoreTypes || isNaN(Number(numCoreTypes)) || Number(numCoreTypes) < 1) {
    newErrors.num_core_types = 'Number of core types is required and must be at least 1.';
  }

  // Core mappings
  coreMappings.forEach((mapping, idx) => {
    if (!mapping.core || typeof mapping.core !== 'string' || mapping.core.trim() === '') newErrors[`core_${idx}`] = 'Core is required.';
    if (!mapping.core_count || isNaN(Number(mapping.core_count)) || Number(mapping.core_count) < 1) newErrors[`core_count_${idx}`] = 'Core Count is required and must be at least 1.';
    if (!mapping.supply || typeof mapping.supply !== 'string' || mapping.supply.trim() === '') newErrors[`supply_${idx}`] = 'Supply is required.';
    if (!mapping.frequency || isNaN(Number(mapping.frequency))) newErrors[`frequency_${idx}`] = 'Frequency is required and must be a number.';
    if (!mapping.clock || typeof mapping.clock !== 'string' || mapping.clock.trim() === '') newErrors[`clock_${idx}`] = 'Clock is required.';
  });

  // Spec variable
  if (!specVariable || typeof specVariable !== 'string' || specVariable.trim() === '') {
    newErrors.spec_variable = 'Spec Variable is required.';
  }

  // Production mappings
  if (selectedFlowOrders.length === 0) {
    newErrors.flow_orders = 'At least one flow order must be selected.';
  }

  selectedFlowOrders.forEach(order => {
    const mapping = productionMappings[order] || {};
    
    // Always validate test_points_type
    if (!mapping.test_points_type || (mapping.test_points_type !== 'List' && mapping.test_points_type !== 'Range')) {
      newErrors[`test_points_type_${order}`] = 'Test Points Type is required for ' + order;
    }
    
    // Always validate range fields if type is missing or 'Range'
    if (!mapping.test_points_type || mapping.test_points_type === 'Range') {
      if (!mapping.test_points_start || isNaN(Number(mapping.test_points_start))) {
        newErrors[`test_points_start_${order}`] = 'Test Points Start is required and must be a number for ' + order;
      }
      if (!mapping.test_points_stop || isNaN(Number(mapping.test_points_stop))) {
        newErrors[`test_points_stop_${order}`] = 'Test Points Stop is required and must be a number for ' + order;
      }
      if (!mapping.test_points_step || isNaN(Number(mapping.test_points_step)) || Number(mapping.test_points_step) === 0) {
        newErrors[`test_points_step_${order}`] = 'Test Points Step is required and must be a non-zero number for ' + order;
      }
      
      // Enhanced range validation - only if all three values are valid numbers
      if (mapping.test_points_start && mapping.test_points_stop && mapping.test_points_step &&
          !isNaN(Number(mapping.test_points_start)) && 
          !isNaN(Number(mapping.test_points_stop)) && 
          !isNaN(Number(mapping.test_points_step)) && 
          Number(mapping.test_points_step) !== 0) {
        
        const rangeValidation = validateTestPointRange(
          mapping.test_points_start,
          mapping.test_points_stop,
          mapping.test_points_step
        );
        
        if (!rangeValidation.isValid) {
          newErrors[`test_points_range_${order}`] = rangeValidation.message + ' for ' + order;
        }
      }
    }
    
    // Validate list field if type is 'List'
    if (mapping.test_points_type === 'List') {
      if (!mapping.test_points || mapping.test_points.trim() === '') {
        newErrors[`test_points_${order}`] = 'Test Points (List) is required for ' + order;
      }
    }
    
    if (!mapping.frequency || isNaN(Number(mapping.frequency))) newErrors[`frequency_${order}`] = 'Frequency is required and must be a number for ' + order;
    if (!mapping.register_size || isNaN(Number(mapping.register_size))) newErrors[`register_size_${order}`] = 'Register Size is required and must be a number for ' + order;
  });


  // Charz parameters
  // if (!charzData.search_granularity || typeof charzData.search_granularity !== 'string' || charzData.search_granularity.trim() === '') {
  //   newErrors.search_granularity = 'Search granularity is required.';
  // }
  
  if (!charzData.search_granularity || !Array.isArray(charzData.search_granularity) || charzData.search_granularity.length === 0) {
    newErrors.search_granularity = 'At least one search granularity must be selected.';
  }

  if (!Array.isArray(charzData.search_types) || charzData.search_types.length === 0) {
    newErrors.search_types = 'At least one search type is required.';
  }

  (charzData.search_types || []).forEach(searchType => {
    // Get selected test types for this search type
    const selectedTestTypes = charzData.selectedTestTypes?.[searchType] || [];
    
    // Check if at least one test type is selected
    if (selectedTestTypes.length === 0) {
      newErrors[`charz_${searchType}_test_types`] = `At least one test type must be selected for ${searchType}`;
      return; // Skip further validation for this search type
    }
    
    // Only validate selected test types
    selectedTestTypes.forEach(testType => {
      const table = charzData.table?.[searchType]?.[testType] || {};
      const wlCount = parseInt(table.wl_count, 10) || 0;
      
      // Validate test type table fields
      if (!table.wl_count || isNaN(Number(table.wl_count))) {
        newErrors[`charz_${searchType}_${testType}_wl_count`] = 'WL Count is required and must be a number for ' + searchType + ' / ' + testType;
      }
      
      // Improved workload table validation
      if (wlCount > 0) {
        const workloadArray = charzData.workloadTable?.[searchType]?.[testType] || [];
        // Always validate each workload field, even if array is missing or too short
        for (let wlIdx = 0; wlIdx < wlCount; wlIdx++) {
          const wlValue = workloadArray[wlIdx];
          if (!wlValue || (typeof wlValue === 'string' && wlValue.trim() === '')) {
            newErrors[`charz_${searchType}_${testType}_wl_${wlIdx}`] = `WL value #${wlIdx + 1} is required for ${searchType} / ${testType}`;
          }
        }
      }
      
      if (!table.tp || table.tp.trim() === '') {
        newErrors[`charz_${searchType}_${testType}_tp`] = 'Test Points are required for ' + searchType + ' / ' + testType;
      }
      if (!table.search_start || isNaN(Number(table.search_start))) {
        newErrors[`charz_${searchType}_${testType}_search_start`] = 'Search Start is required and must be a number for ' + searchType + ' / ' + testType;
      }
      if (!table.search_end || isNaN(Number(table.search_end))) {
        newErrors[`charz_${searchType}_${testType}_search_end`] = 'Search End is required and must be a number for ' + searchType + ' / ' + testType;
      }
      if (!table.resolution || isNaN(Number(table.resolution))) {
        newErrors[`charz_${searchType}_${testType}_resolution`] = 'Resolution is required and must be a number for ' + searchType + ' / ' + testType;
      }
      if (!table.search_step || isNaN(Number(table.search_step))) {
        newErrors[`charz_${searchType}_${testType}_search_step`] = 'Search Step is required and must be a number for ' + searchType + ' / ' + testType;
      }
    });
  });

  if (!charzData.psm_register_size || isNaN(Number(charzData.psm_register_size))) {
    newErrors.psm_register_size = 'PSM Register Size is required and must be a number.';
  }

  return newErrors;
}
