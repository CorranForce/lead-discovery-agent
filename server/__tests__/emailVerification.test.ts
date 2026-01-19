import { describe, it, expect } from "vitest";
import { verifyResendApiKey } from "../services/email";

describe("Resend API Key Verification", () => {
  it("should verify that the Resend API key is valid", async () => {
    const isValid = await verifyResendApiKey();
    expect(isValid).toBe(true);
  }, 10000); // 10 second timeout for API call
});
