import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  sanitizeInteger,
  sanitizeBoolean,
  detectSQLInjection,
  detectCodeInjection,
  validateInput,
} from "../inputValidation";

describe("Input Sanitization", () => {
  describe("sanitizeString", () => {
    it("should trim whitespace", () => {
      expect(sanitizeString("  hello  ")).toBe("hello");
    });

    it("should escape HTML entities", () => {
      const input = "<script>alert('xss')</script>";
      const result = sanitizeString(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
    });

    it("should remove null bytes", () => {
      const input = "hello\0world";
      expect(sanitizeString(input)).toBe("helloworld");
    });

    it("should handle non-string input", () => {
      expect(sanitizeString(123 as any)).toBe("");
      expect(sanitizeString(null as any)).toBe("");
    });
  });

  describe("sanitizeEmail", () => {
    it("should normalize valid email", () => {
      const result = sanitizeEmail("Test@Example.COM");
      expect(result).toBe("test@example.com");
    });

    it("should return null for invalid email", () => {
      expect(sanitizeEmail("not-an-email")).toBeNull();
      expect(sanitizeEmail("@example.com")).toBeNull();
      expect(sanitizeEmail("test@")).toBeNull();
    });

    it("should handle non-string input", () => {
      expect(sanitizeEmail(123 as any)).toBeNull();
    });
  });

  describe("sanitizeURL", () => {
    it("should accept valid HTTPS URL", () => {
      const url = "https://example.com/path";
      expect(sanitizeURL(url)).toBe(url);
    });

    it("should accept valid HTTP URL", () => {
      const url = "http://example.com";
      expect(sanitizeURL(url)).toBe(url);
    });

    it("should reject URL without protocol", () => {
      expect(sanitizeURL("example.com")).toBeNull();
    });

    it("should reject invalid protocols", () => {
      expect(sanitizeURL("javascript:alert('xss')")).toBeNull();
      expect(sanitizeURL("ftp://example.com")).toBeNull();
    });
  });

  describe("sanitizeInteger", () => {
    it("should accept valid integer", () => {
      expect(sanitizeInteger(42)).toBe(42);
      expect(sanitizeInteger(0)).toBe(0);
      expect(sanitizeInteger(-10)).toBe(-10);
    });

    it("should parse string integers", () => {
      expect(sanitizeInteger("42")).toBe(42);
      expect(sanitizeInteger("-10")).toBe(-10);
    });

    it("should reject floats", () => {
      expect(sanitizeInteger(3.14)).toBeNull();
      expect(sanitizeInteger("3.14")).toBeNull();
    });

    it("should reject non-numeric strings", () => {
      expect(sanitizeInteger("abc")).toBeNull();
      expect(sanitizeInteger("12abc")).toBeNull();
    });
  });

  describe("sanitizeBoolean", () => {
    it("should handle boolean values", () => {
      expect(sanitizeBoolean(true)).toBe(true);
      expect(sanitizeBoolean(false)).toBe(false);
    });

    it("should parse string booleans", () => {
      expect(sanitizeBoolean("true")).toBe(true);
      expect(sanitizeBoolean("TRUE")).toBe(true);
      expect(sanitizeBoolean("1")).toBe(true);
      expect(sanitizeBoolean("yes")).toBe(true);
      
      expect(sanitizeBoolean("false")).toBe(false);
      expect(sanitizeBoolean("FALSE")).toBe(false);
      expect(sanitizeBoolean("0")).toBe(false);
      expect(sanitizeBoolean("no")).toBe(false);
    });

    it("should handle numbers", () => {
      expect(sanitizeBoolean(1)).toBe(true);
      expect(sanitizeBoolean(0)).toBe(false);
      expect(sanitizeBoolean(42)).toBe(true);
    });
  });
});

describe("Injection Detection", () => {
  describe("detectSQLInjection", () => {
    it("should detect SQL keywords", () => {
      expect(detectSQLInjection("SELECT * FROM users")).toBe(true);
      expect(detectSQLInjection("DROP TABLE users")).toBe(true);
      expect(detectSQLInjection("INSERT INTO users")).toBe(true);
      expect(detectSQLInjection("DELETE FROM users")).toBe(true);
      expect(detectSQLInjection("UPDATE users SET")).toBe(true);
      expect(detectSQLInjection("UNION SELECT")).toBe(true);
    });

    it("should detect SQL comments", () => {
      expect(detectSQLInjection("admin'--")).toBe(true);
      expect(detectSQLInjection("test/* comment */")).toBe(true);
      expect(detectSQLInjection("value#comment")).toBe(true);
    });

    it("should detect OR/AND injection attempts", () => {
      expect(detectSQLInjection("' OR '1'='1")).toBe(true);
      expect(detectSQLInjection("1' AND 1=1--")).toBe(true);
    });

    it("should not flag normal text", () => {
      expect(detectSQLInjection("Hello World")).toBe(false);
      expect(detectSQLInjection("user@example.com")).toBe(false);
      expect(detectSQLInjection("My name is John")).toBe(false);
    });
  });

  describe("detectCodeInjection", () => {
    it("should detect script tags", () => {
      expect(detectCodeInjection("<script>alert('xss')</script>")).toBe(true);
      expect(detectCodeInjection("<SCRIPT>alert('xss')</SCRIPT>")).toBe(true);
    });

    it("should detect javascript protocol", () => {
      expect(detectCodeInjection("javascript:alert('xss')")).toBe(true);
      expect(detectCodeInjection("JAVASCRIPT:alert('xss')")).toBe(true);
    });

    it("should detect event handlers", () => {
      expect(detectCodeInjection("onclick='alert(1)'")).toBe(true);
      expect(detectCodeInjection('onerror="alert(1)"')).toBe(true);
      expect(detectCodeInjection("onload='malicious()'")).toBe(true);
    });

    it("should detect eval and expression", () => {
      expect(detectCodeInjection("eval(maliciousCode)")).toBe(true);
      expect(detectCodeInjection("expression(alert(1))")).toBe(true);
    });

    it("should detect imports and requires", () => {
      expect(detectCodeInjection("import fs from 'fs'")).toBe(true);
      expect(detectCodeInjection("require('child_process')")).toBe(true);
    });

    it("should not flag normal text", () => {
      expect(detectCodeInjection("Hello World")).toBe(false);
      expect(detectCodeInjection("This is a normal sentence.")).toBe(false);
    });
  });

  describe("validateInput", () => {
    it("should pass clean input", () => {
      expect(validateInput("Hello World")).toBeTruthy();
      expect(validateInput("user@example.com")).toBeTruthy();
    });

    it("should throw on SQL injection attempt", () => {
      expect(() => validateInput("'; DROP TABLE users; --")).toThrow();
      expect(() => validateInput("' OR '1'='1")).toThrow();
    });

    it("should throw on code injection attempt", () => {
      expect(() => validateInput("<script>alert('xss')</script>")).toThrow();
      expect(() => validateInput("javascript:alert(1)")).toThrow();
    });

    it("should include field name in error", () => {
      try {
        validateInput("<script>alert(1)</script>", "Username");
      } catch (error: any) {
        expect(error.message).toContain("Username");
      }
    });
  });
});
