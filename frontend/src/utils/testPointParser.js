/**
 * Parses a comma-separated list of test points into an array of numbers.
 * @param {string} input - The comma-separated string, e.g. "100, 200, 300"
 * @returns {number[]} - Array of numbers
 */
function parseTestPointsList(input) {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(Number)
    .filter(n => !isNaN(n));
}

/**
 * Generates an array of numbers from start to stop (inclusive) using the given step.
 * @param {string|number} start - Start value
 * @param {string|number} stop - Stop value
 * @param {string|number} step - Step value
 * @returns {number[]} - Array of numbers
 */
function parseTestPointsRange(start, stop, step) {
  const s = Number(start);
  const e = Number(stop);
  const st = Number(step);
  if (isNaN(s) || isNaN(e) || isNaN(st) || st === 0) return [];
  const result = [];
  if (st > 0) {
    for (let i = s; i <= e; i += st) result.push(i);
  } else {
    for (let i = s; i >= e; i += st) result.push(i);
  }
  return result;
}

/**
 * Returns a standardized array of test points based on the mapping object.
 * @param {object} mapping - The production mapping object
 * @returns {number[]} - Array of test points as numbers
 */
function getStandardizedTestPoints(mapping) {
  if (mapping.test_points_type === 'List') {
    return parseTestPointsList(mapping.test_points || '');
  } else {
    return parseTestPointsRange(
      mapping.test_points_start,
      mapping.test_points_stop,
      mapping.test_points_step
    );
  }
}

// Export the functions for use in other files
export {
  parseTestPointsList,
  parseTestPointsRange,
  getStandardizedTestPoints
};
