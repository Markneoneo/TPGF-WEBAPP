// This module exports the validate function for ExtendedForm

// Helper function to validate test point range
function validateTestPointRange(start, stop, step) {
  // Check for empty or whitespace-only strings first
  if (start === '' || start === null || start === undefined ||
    (typeof start === 'string' && start.trim() === '')) {
    return { isValid: false, message: 'Start value cannot be empty' };
  }

  if (stop === '' || stop === null || stop === undefined ||
    (typeof stop === 'string' && stop.trim() === '')) {
    return { isValid: false, message: 'Stop value cannot be empty' };
  }

  if (step === '' || step === null || step === undefined ||
    (typeof step === 'string' && step.trim() === '')) {
    return { isValid: false, message: 'Step value cannot be empty' };
  }

  const startNum = Number(start);
  const stopNum = Number(stop);
  const stepNum = Number(step);

  // Basic numeric validation (after checking for empty values)
  if (isNaN(startNum) || isNaN(stopNum) || isNaN(stepNum) || stepNum === 0) {
    return { isValid: false, message: 'All values must be valid numbers and step cannot be zero' };
  }

  // Step direction validation
  if ((stopNum > startNum && stepNum < 0) || (stopNum < startNum && stepNum > 0)) {
    return { isValid: false, message: 'Step direction must match start-stop direction' };
  }

  // Helper function to determine appropriate decimal places for rounding
  const getDecimalPlaces = (num) => {
    const numStr = num.toString();
    if (numStr.indexOf('.') === -1) return 0;
    return numStr.split('.')[1].length;
  };

  // Determine the precision we need to work with
  const decimalPlaces = Math.max(
    getDecimalPlaces(startNum),
    getDecimalPlaces(stopNum),
    getDecimalPlaces(stepNum)
  );

  // Round all values to avoid floating point precision issues
  const roundedStart = Number(startNum.toFixed(decimalPlaces));
  const roundedStop = Number(stopNum.toFixed(decimalPlaces));
  const roundedStep = Number(Math.abs(stepNum).toFixed(decimalPlaces));

  // Calculate the range using rounded values
  const range = Number(Math.abs(roundedStop - roundedStart).toFixed(decimalPlaces));

  // Check if the range is evenly divisible by the step
  const expectedSteps = range / roundedStep;
  const roundedSteps = Math.round(expectedSteps);

  // Use a reasonable epsilon based on the decimal precision
  const epsilon = Math.pow(10, -(decimalPlaces + 2));

  if (Math.abs(expectedSteps - roundedSteps) > epsilon) {
    return {
      isValid: false,
      message: `Step ${stepNum} cannot generate steady intervals from ${startNum} to ${stopNum}. The range (${range}) is not evenly divisible by the step.`
    };
  }

  // Verify that we can actually reach the stop value by simulating the generation
  let current = roundedStart;
  const actualStep = stepNum > 0 ? roundedStep : -roundedStep;
  let reachesStop = false;

  // Limit iterations to prevent infinite loops
  const maxIterations = 1000;
  let iterations = 0;

  while (iterations < maxIterations) {
    current = Number((current + actualStep).toFixed(decimalPlaces));
    iterations++;

    if (Math.abs(current - roundedStop) < epsilon) {
      reachesStop = true;
      break;
    }

    // Check if we've gone past the stop value
    if ((actualStep > 0 && current > roundedStop) || (actualStep < 0 && current < roundedStop)) {
      break;
    }
  }

  if (!reachesStop) {
    return {
      isValid: false,
      message: `Step ${stepNum} cannot reach the stop value ${stopNum} from start ${startNum}.`
    };
  }

  return { isValid: true, message: null };
}

export default function validate({
  numCoreTypes,
  coreMappings,
  selectedFlowOrders,
  productionMappings,
  charzData,
  showCharzForCore
}) {
  const newErrors = {};

  // Number of core types
  if (!numCoreTypes || isNaN(Number(numCoreTypes)) || Number(numCoreTypes) < 1) {
    newErrors.num_core_types = 'Number of core types is required and must be at least 1.';
  }

  // Core mappings
  coreMappings.forEach((mapping, idx) => {
    if (!mapping.spec_variable || typeof mapping.spec_variable !== 'string' || mapping.spec_variable.trim() === '') {
      newErrors[`spec_variable_${idx}`] = `Spec Variable is required for Core ${idx + 1}.`;
    }
    if (!mapping.core || typeof mapping.core !== 'string' || mapping.core.trim() === '') newErrors[`core_${idx}`] = 'Core is required.';
    if (!mapping.core_count || isNaN(Number(mapping.core_count)) || Number(mapping.core_count) < 1) newErrors[`core_count_${idx}`] = 'Core Count is required and must be at least 1.';
    if (!mapping.supply || typeof mapping.supply !== 'string' || mapping.supply.trim() === '') newErrors[`supply_${idx}`] = 'Supply is required.';
    if (!mapping.clock || typeof mapping.clock !== 'string' || mapping.clock.trim() === '') newErrors[`clock_${idx}`] = 'Clock is required.';
  });

  // Production mappings - now validate per core type
  selectedFlowOrders.forEach((coreFlowOrders, coreIndex) => {
    if (!Array.isArray(coreFlowOrders)) return;

    // Check if at least one flow order is selected for this core
    if (coreFlowOrders.length === 0) {
      newErrors[`flow_orders_core_${coreIndex}`] = `At least one flow order must be selected for Core ${coreIndex + 1}.`;
      return;
    }

    const coreProductionMappings = productionMappings[coreIndex] || {};

    coreFlowOrders.forEach(order => {
      const mapping = coreProductionMappings[order] || {};

      // Helper function to create error field names with core index
      const getErrorField = (field) => `${field}_${order}_core_${coreIndex}`;

      // Updated validation: Require exactly one of read_type_jtag or read_type_fw
      const hasJtag = !!mapping.read_type_jtag;
      const hasFw = !!mapping.read_type_fw;

      if (!hasJtag && !hasFw) {
        newErrors[getErrorField('read_type')] = `One Read Type (JTAG or FW) must be selected for ${order} in Core ${coreIndex + 1}`;
      } else if (hasJtag && hasFw) {
        newErrors[getErrorField('read_type')] = `Only one Read Type (JTAG or FW) can be selected for ${order} in Core ${coreIndex + 1}`;
      }

      // Always validate test_points_type
      if (!mapping.test_points_type || (mapping.test_points_type !== 'List' && mapping.test_points_type !== 'Range')) {
        newErrors[getErrorField('test_points_type')] = `Test Points Type is required for ${order} in Core ${coreIndex + 1}`;
      }

      // Always validate range fields if type is missing or 'Range'
      if (!mapping.test_points_type || mapping.test_points_type === 'Range') {
        if (!mapping.test_points_start || isNaN(Number(mapping.test_points_start))) {
          newErrors[getErrorField('test_points_start')] = `Test Points Start is required and must be a number for ${order} in Core ${coreIndex + 1}`;
        }
        if (!mapping.test_points_stop || isNaN(Number(mapping.test_points_stop))) {
          newErrors[getErrorField('test_points_stop')] = `Test Points Stop is required and must be a number for ${order} in Core ${coreIndex + 1}`;
        }
        if (!mapping.test_points_step || isNaN(Number(mapping.test_points_step)) || Number(mapping.test_points_step) === 0) {
          newErrors[getErrorField('test_points_step')] = `Test Points Step is required and must be a non-zero number for ${order} in Core ${coreIndex + 1}`;
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
            newErrors[getErrorField('test_points_range')] = `${rangeValidation.message} for ${order} in Core ${coreIndex + 1}`;
          }
        }
      }

      // Validate list field if type is 'List'
      if (mapping.test_points_type === 'List') {
        if (!mapping.test_points || mapping.test_points.trim() === '') {
          newErrors[getErrorField('test_points')] = `Test Points (List) is required for ${order} in Core ${coreIndex + 1}`;
        }
      }

      if (!mapping.frequency || isNaN(Number(mapping.frequency))) {
        newErrors[getErrorField('frequency')] = `Frequency is required and must be a number for ${order} in Core ${coreIndex + 1}`;
      }
      if (!mapping.register_size || isNaN(Number(mapping.register_size))) {
        newErrors[getErrorField('register_size')] = `Register Size is required and must be a number for ${order} in Core ${coreIndex + 1}`;
      }

      // Validate insertion field if provided
      if (mapping.insertion && mapping.insertion.trim() !== '') {
        // Optional: Add any specific insertion validation logic here
      }
    });
  });

  // Charz parameters - now validate per core type
  charzData.forEach((coreCharzData, coreIndex) => {
    // Only validate if charz is enabled for this core
    if (!showCharzForCore || !showCharzForCore[coreIndex]) {
      return;
    }

    const charz = coreCharzData || {};
    const getCoreErrorField = (field) => `charz_${field}_core_${coreIndex}`;

    if (!charz.search_granularity || !Array.isArray(charz.search_granularity) || charz.search_granularity.length === 0) {
      newErrors[getCoreErrorField('search_granularity')] = `At least one search granularity must be selected for Core ${coreIndex + 1}.`;
    }

    if (!Array.isArray(charz.search_types) || charz.search_types.length === 0) {
      newErrors[getCoreErrorField('search_types')] = `At least one search type is required for Core ${coreIndex + 1}.`;
    }

    (charz.search_types || []).forEach(searchType => {
      // Get selected test types for this search type
      const selectedTestTypes = charz.selectedTestTypes?.[searchType] || [];

      // Check if at least one test type is selected
      if (selectedTestTypes.length === 0) {
        newErrors[getCoreErrorField(`${searchType}_test_types`)] = `At least one test type must be selected for ${searchType} in Core ${coreIndex + 1}`;
        return; // Skip further validation for this search type
      }

      // Only validate selected test types
      selectedTestTypes.forEach(testType => {
        const table = charz.table?.[searchType]?.[testType] || {};
        const wlCount = parseInt(table.wl_count, 10) || 0;

        // Helper function for charz error field names
        const getCharzErrorField = (field) => getCoreErrorField(`${searchType}_${testType}_${field}`);

        // Validate test type table fields
        if (!table.wl_count || isNaN(Number(table.wl_count))) {
          newErrors[getCharzErrorField('wl_count')] = `WL Count is required and must be a number for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }

        // Improved workload table validation
        if (wlCount > 0) {
          const workloadArray = charz.workloadTable?.[searchType]?.[testType] || [];
          // Always validate each workload field, even if array is missing or too short
          for (let wlIdx = 0; wlIdx < wlCount; wlIdx++) {
            const wlValue = workloadArray[wlIdx];
            if (!wlValue || (typeof wlValue === 'string' && wlValue.trim() === '')) {
              newErrors[getCharzErrorField(`wl_${wlIdx}`)] = `WL value #${wlIdx + 1} is required for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
            }
          }
        }

        if (!table.tp || table.tp.trim() === '') {
          newErrors[getCharzErrorField('tp')] = `Test Points are required for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }
        if (!table.search_start || isNaN(Number(table.search_start))) {
          newErrors[getCharzErrorField('search_start')] = `Search Start is required and must be a number for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }
        if (!table.search_end || isNaN(Number(table.search_end))) {
          newErrors[getCharzErrorField('search_end')] = `Search End is required and must be a number for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }
        if (!table.resolution || isNaN(Number(table.resolution))) {
          newErrors[getCharzErrorField('resolution')] = `Resolution is required and must be a number for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }
        if (!table.search_step || isNaN(Number(table.search_step))) {
          newErrors[getCharzErrorField('search_step')] = `Search Step is required and must be a number for ${searchType} / ${testType} in Core ${coreIndex + 1}`;
        }
      });
    });

    if (!charz.psm_register_size || isNaN(Number(charz.psm_register_size))) {
      newErrors[getCoreErrorField('psm_register_size')] = `PSM Register Size is required and must be a number for Core ${coreIndex + 1}.`;
    }
  });

  return newErrors;
}

export { validateTestPointRange };
