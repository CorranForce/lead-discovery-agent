import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength, validateEmail } from "./_core/password";

describe("Password Utilities", () => {
  describe("hashPassword", () => {
    it("should hash a valid password", async () => {
      const password = "Test123!@#";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should throw error for password less than 8 characters", async () => {
      await expect(hashPassword("Test1!")).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should generate different hashes for the same password", async () => {
      const password = "Test123!@#";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // bcrypt uses random salts
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "Test123!@#";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "Test123!@#";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword("WrongPassword123!", hash);
      expect(isValid).toBe(false);
    });

    it("should return false for empty password", async () => {
      const hash = await hashPassword("Test123!@#");
      const isValid = await verifyPassword("", hash);
      expect(isValid).toBe(false);
    });

    it("should return false for empty hash", async () => {
      const isValid = await verifyPassword("Test123!@#", "");
      expect(isValid).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should accept strong password", () => {
      const result = validatePasswordStrength("Test123!@#");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject password without uppercase", () => {
      const result = validatePasswordStrength("test123!@#");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("uppercase");
    });

    it("should reject password without lowercase", () => {
      const result = validatePasswordStrength("TEST123!@#");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("lowercase");
    });

    it("should reject password without number", () => {
      const result = validatePasswordStrength("TestTest!@#");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("number");
    });

    it("should reject password without special character", () => {
      const result = validatePasswordStrength("Test123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("special character");
    });

    it("should reject password less than 8 characters", () => {
      const result = validatePasswordStrength("Test1!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("8 characters");
    });

    it("should reject password more than 128 characters", () => {
      const longPassword = "Test123!@#" + "a".repeat(120);
      const result = validatePasswordStrength(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("128 characters");
    });
  });

  describe("validateEmail", () => {
    it("should accept valid email", () => {
      const result = validateEmail("test@example.com");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept email with subdomain", () => {
      const result = validateEmail("test@mail.example.com");
      expect(result.isValid).toBe(true);
    });

    it("should reject email without @", () => {
      const result = validateEmail("testexample.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid email format");
    });

    it("should reject email without domain", () => {
      const result = validateEmail("test@");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid email format");
    });

    it("should reject empty email", () => {
      const result = validateEmail("");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Email is required");
    });

    it("should reject email longer than 320 characters", () => {
      const longEmail = "a".repeat(310) + "@example.com";
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("320 characters");
    });
  });
});

describe("Authentication Integration", () => {
  it("should hash and verify password correctly", async () => {
    const password = "MySecurePass123!";
    
    // Hash the password
    const hash = await hashPassword(password);
    
    // Verify correct password
    const isCorrect = await verifyPassword(password, hash);
    expect(isCorrect).toBe(true);
    
    // Verify incorrect password
    const isIncorrect = await verifyPassword("WrongPassword123!", hash);
    expect(isIncorrect).toBe(false);
  });

  it("should validate password strength before hashing", async () => {
    const weakPassword = "weak";
    const validation = validatePasswordStrength(weakPassword);
    
    expect(validation.isValid).toBe(false);
    
    // Should not hash weak password
    await expect(hashPassword(weakPassword)).rejects.toThrow();
  });
});
