// Sample Java file with intentional bugs for testing AI Bug Detector
// Each method demonstrates a different bug type.

public class sample_bugs {

    // --- Bug 1: Unused Variable ---
    public void processData() {
        int data = 100;
        int unusedTemp = 42;  // This variable is never used
        System.out.println("Data: " + data);
    }

    // --- Bug 2: Missing Return ---
    public int calculateDiscount(int price) {
        if (price > 100) {
            return 20;
        }
        // Missing return for price <= 100 — compiler error in real Java
    }

    // --- Bug 3: Unreachable Code ---
    public String getStatus(int code) {
        if (code == 200) {
            return "OK";
            System.out.println("This is unreachable");  // After return
        }
        return "Unknown";
    }

    // --- Bug 4: Logical Error (Self-Comparison) ---
    public boolean isValid(int value) {
        if (value == value) {  // Always true — comparing variable to itself
            return true;
        }
        return false;
    }

    // Main entry point
    public static void main(String[] args) {
        sample_bugs sb = new sample_bugs();
        sb.processData();
        int discount = sb.calculateDiscount(50);
        String status = sb.getStatus(200);
        boolean valid = sb.isValid(10);
        System.out.println(discount + " " + status + " " + valid);
    }
}
