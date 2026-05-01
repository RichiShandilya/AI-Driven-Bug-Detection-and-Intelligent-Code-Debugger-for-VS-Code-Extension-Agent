// test-js.js - JavaScript sample code with intentional bugs for testing AI Bug Analyzer

// Function with unused variable
function calculateSum(a, b) {
    let unusedVar = 42; // Bug: unused variable
    return a + b;
}

// Unused function
function unusedFunction() { // Bug: unused function
    console.log("This function is never called");
}

// Function missing return statement
function getDouble(x) {
    let result = x * 2; // Bug: missing return statement
}

// Infinite loop
function infiniteLoop() {
    while (true) { // Bug: infinite loop
        console.log("Looping forever");
    }
}

// Incorrect condition - assignment instead of comparison
function checkValue(x) {
    if (x = 5) { // Bug: assignment in condition instead of comparison
        return true;
    }
    return false;
}

// Unreachable code
function unreachableCode() {
    return "early return";
    console.log("This is unreachable"); // Bug: unreachable code
}

// Logical error - wrong calculation
function badCalculation(a, b) {
    return a - b; // Bug: logical error - should be addition but coded as subtraction
}

// Call some functions to make them used
console.log(calculateSum(2, 3));
console.log(checkValue(5));
console.log(badCalculation(10, 5));
