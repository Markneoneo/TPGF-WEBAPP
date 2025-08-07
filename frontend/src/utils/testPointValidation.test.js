// testPointValidation.test.js
import { validateTestPointRange } from './validateForm.js';
import { parseTestPointsRange } from './testPointParser.js';

// Test cases for validation
const testCases = {
    valid: [
      // Integer cases - positive increments
      { start: 0, stop: 10, step: 2, expected: [0, 2, 4, 6, 8, 10] },
      { start: 1, stop: 5, step: 1, expected: [1, 2, 3, 4, 5] },
      { start: 5, stop: 25, step: 5, expected: [5, 10, 15, 20, 25] },
      { start: 0, stop: 100, step: 25, expected: [0, 25, 50, 75, 100] },
      
      // Integer cases - negative increments (descending)
      { start: 10, stop: 0, step: -2, expected: [10, 8, 6, 4, 2, 0] },
      { start: 5, stop: 1, step: -1, expected: [5, 4, 3, 2, 1] },
      { start: 20, stop: -10, step: -10, expected: [20, 10, 0, -10] },
      
      // Single step cases
      { start: 1, stop: 0, step: -1, expected: [1, 0] },
      { start: 0, stop: 1, step: 1, expected: [0, 1] },
      
      // Negative numbers
      { start: -10, stop: -2, step: 2, expected: [-10, -8, -6, -4, -2] },
      { start: -5, stop: -15, step: -5, expected: [-5, -10, -15] },
      
      // Decimal cases - basic increments
      { start: 0.1, stop: 0.5, step: 0.1, expected: [0.1, 0.2, 0.3, 0.4, 0.5] },
      { start: 0.3, stop: 1.2, step: 0.3, expected: [0.3, 0.6, 0.9, 1.2] },
      { start: 1.5, stop: 3.0, step: 0.5, expected: [1.5, 2.0, 2.5, 3.0] },
      { start: 0.0, stop: 1.0, step: 0.25, expected: [0.0, 0.25, 0.5, 0.75, 1.0] },
      
      // Decimal cases - decrements
      { start: 1.0, stop: 0.0, step: -0.2, expected: [1.0, 0.8, 0.6, 0.4, 0.2, 0.0] },
      { start: 2.5, stop: 1.0, step: -0.5, expected: [2.5, 2.0, 1.5, 1.0] },
      
      // Mixed precision
      { start: 0, stop: 1.5, step: 0.5, expected: [0, 0.5, 1.0, 1.5] },
      { start: 1, stop: 2.2, step: 0.2, expected: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2] },
      
      // Very small increments
      { start: 0.01, stop: 0.05, step: 0.01, expected: [0.01, 0.02, 0.03, 0.04, 0.05] },
      { start: 0.1, stop: 0.3, step: 0.05, expected: [0.1, 0.15, 0.2, 0.25, 0.3] },
    ],
    
    invalid: [
      // Range not divisible by step - integers
      { start: 1, stop: 10, step: 2, reason: "Range not divisible by step (1 to 10 with step 2)" },
      { start: 0, stop: 10, step: 3, reason: "Range not divisible by step (0 to 10 with step 3)" },
      { start: 2, stop: 15, step: 4, reason: "Range not divisible by step (2 to 15 with step 4)" },
      { start: 5, stop: 22, step: 7, reason: "Range not divisible by step (5 to 22 with step 7)" },
      
      // Range not divisible by step - decimals
      { start: 0.1, stop: 1.1, step: 0.3, reason: "Range not divisible by step (0.1 to 1.1 with step 0.3)" },
      { start: 0.2, stop: 1.1, step: 0.4, reason: "Range not divisible by step (0.2 to 1.1 with step 0.4)" },
      { start: 1.1, stop: 2.5, step: 0.6, reason: "Range not divisible by step (1.1 to 2.5 with step 0.6)" },
      
      // Wrong step direction
      { start: 0, stop: 10, step: -1, reason: "Positive range with negative step" },
      { start: 10, stop: 0, step: 1, reason: "Negative range with positive step" },
      { start: 1.5, stop: 3.0, step: -0.5, reason: "Positive range with negative step" },
      { start: 5.0, stop: 2.0, step: 0.3, reason: "Negative range with positive step" },
      
      // Invalid input values
      { start: "abc", stop: 10, step: 1, reason: "Invalid start value" },
      { start: 0, stop: "xyz", step: 1, reason: "Invalid stop value" },
      { start: 0, stop: 10, step: "def", reason: "Invalid step value" },
      { start: 0, stop: 10, step: 0, reason: "Zero step" },
      { start: "", stop: 10, step: 1, reason: "Empty start value" },
      { start: 0, stop: "", step: 1, reason: "Empty stop value" },
      { start: 0, stop: 10, step: "", reason: "Empty step value" },
      
      // Edge cases
      { start: 1000000, stop: 1000010, step: 3, reason: "Large numbers - not divisible" },
      { start: 0.001, stop: 0.01, step: 0.004, reason: "Small decimals - not divisible" },
    ]
  };
  
// Test function for validation
function runValidationTests() {
    console.log("🧪 Starting Test Point Range Validation Tests\n");
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Test valid cases
    console.log("✅ Testing Valid Cases:");
    console.log("=".repeat(50));
    
    testCases.valid.forEach((testCase, index) => {
      totalTests++;
      const result = validateTestPointRange(testCase.start, testCase.stop, testCase.step);
      
      if (result.isValid) {
        console.log(`✓ Test ${index + 1}: PASS - ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        passedTests++;
      } else {
        console.log(`✗ Test ${index + 1}: FAIL - ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        console.log(`  Expected: VALID, Got: ${result.message}`);
        failedTests++;
      }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log(`Valid Cases Summary: ${passedTests}/${testCases.valid.length} passed\n`);
    
    // Test invalid cases
    console.log("❌ Testing Invalid Cases:");
    console.log("=".repeat(50));
    
    testCases.invalid.forEach((testCase, index) => {
      totalTests++;
      const result = validateTestPointRange(testCase.start, testCase.stop, testCase.step);
      
      if (!result.isValid) {
        console.log(`✓ Test ${index + 1}: PASS - ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        console.log(`  Reason: ${testCase.reason}`);
        console.log(`  Got: ${result.message}`);
        passedTests++;
      } else {
        console.log(`✗ Test ${index + 1}: FAIL - ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        console.log(`  Expected: INVALID (${testCase.reason}), Got: VALID`);
        failedTests++;
      }
      console.log(""); // Add spacing between tests
    });
    
    console.log("=".repeat(50));
    console.log(`Invalid Cases Summary: ${passedTests - testCases.valid.filter((testCase, index) => {
      const result = validateTestPointRange(testCase.start, testCase.stop, testCase.step);
      return result.isValid;
    }).length}/${testCases.invalid.length} passed\n`);
    
    // Overall summary
    console.log("📊 OVERALL TEST SUMMARY:");
    console.log("=".repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
      console.log("\n🎉 ALL TESTS PASSED! 🎉");
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the validation logic.`);
    }
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100
    };
  }
  
  // Test function for generation (bonus test)
  function runGenerationTests() {
    console.log("\n🔧 Testing Test Point Generation:");
    console.log("=".repeat(50));
    
    let generationPassed = 0;
    let generationFailed = 0;
    
    testCases.valid.forEach((testCase, index) => {
      const generated = parseTestPointsRange(testCase.start, testCase.stop, testCase.step);
      const expected = testCase.expected;
      
      // Compare arrays with tolerance for floating point
      const arraysEqual = generated.length === expected.length && 
        generated.every((val, i) => Math.abs(val - expected[i]) < 0.0001);
      
      if (arraysEqual) {
        console.log(`✓ Generation Test ${index + 1}: PASS`);
        console.log(`  Input: ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        console.log(`  Generated: [${generated.join(', ')}]`);
        generationPassed++;
      } else {
        console.log(`✗ Generation Test ${index + 1}: FAIL`);
        console.log(`  Input: ${testCase.start}, ${testCase.stop}, ${testCase.step}`);
        console.log(`  Expected: [${expected.join(', ')}]`);
        console.log(`  Generated: [${generated.join(', ')}]`);
        generationFailed++;
      }
      console.log("");
    });
    
    console.log("=".repeat(50));
    console.log(`Generation Tests: ${generationPassed}/${testCases.valid.length} passed`);
    
    return {
      passed: generationPassed,
      failed: generationFailed,
      total: testCases.valid.length
    };
  }
  
  // Combined test runner
  function runAllTests() {
    const validationResults = runValidationTests();
    const generationResults = runGenerationTests();
    
    console.log("\n🏆 FINAL SUMMARY:");
    console.log("=".repeat(50));
    console.log(`Validation Tests: ${validationResults.passed}/${validationResults.total} (${validationResults.successRate.toFixed(1)}%)`);
    console.log(`Generation Tests: ${generationResults.passed}/${generationResults.total} (${((generationResults.passed/generationResults.total)*100).toFixed(1)}%)`);
    
    const overallPassed = validationResults.passed + generationResults.passed;
    const overallTotal = validationResults.total + generationResults.total;
    console.log(`Overall: ${overallPassed}/${overallTotal} (${((overallPassed/overallTotal)*100).toFixed(1)}%)`);
    
    return {
      validation: validationResults,
      generation: generationResults,
      overall: {
        passed: overallPassed,
        total: overallTotal,
        successRate: (overallPassed / overallTotal) * 100
      }
    };
  }  

export { runValidationTests, runGenerationTests, runAllTests };
