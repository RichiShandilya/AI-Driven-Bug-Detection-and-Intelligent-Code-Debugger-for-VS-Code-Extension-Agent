// Sample JavaScript file with intentional bugs for testing AI Bug Detector
// Each section demonstrates a different bug type.

// --- Bug 1: Assignment in Condition ---
function checkValue(x) {
    if (x = 5) {  // Bug: assignment (=) instead of comparison (===)
        console.log("x is five");
    }
}

// --- Bug 2: Unused Variable ---
function processItems() {
    const items = [1, 2, 3];
    const unusedConfig = { debug: true };  // This variable is never used
    return items.map(item => item * 2);
}

// --- Bug 3: Infinite Loop ---
function waitForever() {
    while (true) {
        console.log("still running...");
        // No break or return — this loop never ends
    }
}

// --- Bug 4: Unreachable Code ---
function getGreeting(name) {
    return `Hello, ${name}!`;
    console.log("This will never execute");  // Unreachable after return
    const extra = "unreachable";
}

// Main
checkValue(10);
const result = processItems();
console.log(result);
