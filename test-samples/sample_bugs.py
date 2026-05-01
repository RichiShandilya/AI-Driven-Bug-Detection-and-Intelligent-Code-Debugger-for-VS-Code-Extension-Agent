# Sample Python file with intentional bugs for testing AI Bug Detector
# Each function/section demonstrates a different bug type.

# --- Bug 1: Unused Variable ---
def process_data():
    data = [1, 2, 3]
    unused_temp = 42  # This variable is never used
    result = sum(data)
    return result


# --- Bug 2: Unused Function ---
def helper_function():
    """This function is defined but never called anywhere."""
    return "I am unused"


# --- Bug 3: Missing Return ---
def calculate_grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    # Missing return for score < 70 — function returns None implicitly


# --- Bug 4: Infinite Loop ---
def run_forever():
    counter = 0
    while True:
        counter += 1
        # No break, return, or exit — this loop never ends


# --- Bug 5: Unreachable Code ---
def get_status(code):
    if code == 200:
        return "OK"
        print("This line can never execute")  # Unreachable after return
    return "Unknown"


# --- Bug 6: Logical Error (Division by Zero) ---
def compute_average(total):
    count = 0
    average = total / 0  # Division by zero
    return average


# Main entry point
def main():
    result = process_data()
    grade = calculate_grade(85)
    status = get_status(200)
    avg = compute_average(100)
    print(result, grade, status, avg)


main()
