import validator from "validator";
import { z } from "zod";

/**
 * Input Sanitization Utilities
 * 
 * These utilities help prevent XSS, SQL injection, and code injection attacks
 * by validating and sanitizing user input before processing.
 */

/**
 * Sanitize string input by removing potentially malicious content
 * - Trims whitespace
 * - Escapes HTML entities to prevent XSS
 * - Removes null bytes
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Escape HTML to prevent XSS
  sanitized = validator.escape(sanitized);
  
  return sanitized;
}

/**
 * Sanitize email input
 * - Normalizes email format
 * - Validates email structure
 * - Returns null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== "string") {
    return null;
  }
  
  const normalized = validator.normalizeEmail(email);
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Sanitize URL input
 * - Validates URL structure
 * - Ensures protocol is http/https
 * - Returns null if invalid
 */
export function sanitizeURL(url: string): string | null {
  if (typeof url !== "string") {
    return null;
  }
  
  if (!validator.isURL(url, { protocols: ["http", "https"], require_protocol: true })) {
    return null;
  }
  
  return url;
}

/**
 * Sanitize integer input
 * - Validates that input is a valid integer
 * - Returns null if invalid
 */
export function sanitizeInteger(input: unknown): number | null {
  if (typeof input === "number" && Number.isInteger(input)) {
    return input;
  }
  
  if (typeof input === "string" && validator.isInt(input)) {
    return parseInt(input, 10);
  }
  
  return null;
}

/**
 * Sanitize boolean input
 * - Converts truthy/falsy values to boolean
 * - Handles string representations ("true", "false", "1", "0")
 */
export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === "boolean") {
    return input;
  }
  
  if (typeof input === "string") {
    const lower = input.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
  }
  
  if (typeof input === "number") {
    return input !== 0;
  }
  
  return Boolean(input);
}

/**
 * Remove SQL injection patterns from input
 * This is a defense-in-depth measure; primary protection comes from parameterized queries
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  
  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|#|\/\*|\*\/)/g, // SQL comments
    /(\bOR\b|\bAND\b).*?=.*?/gi, // OR/AND with equals
    /('|")\s*(OR|AND)\s*('|")/gi, // Quote-based injection
    /(\bXP_|SP_)/gi, // SQL Server stored procedures
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect potential code injection patterns
 */
export function detectCodeInjection(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  
  // Common code injection patterns
  const codePatterns = [
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers (onclick, onerror, etc.)
    /eval\s*\(/gi, // eval() function
    /expression\s*\(/gi, // CSS expression()
    /import\s+.*?from/gi, // ES6 imports
    /require\s*\(/gi, // CommonJS require
  ];
  
  return codePatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive input validation that throws if malicious content is detected
 */
export function validateInput(input: string, fieldName: string = "Input"): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  
  if (detectSQLInjection(input)) {
    throw new Error(`${fieldName} contains potential SQL injection attempt`);
  }
  
  if (detectCodeInjection(input)) {
    throw new Error(`${fieldName} contains potential code injection attempt`);
  }
  
  return sanitizeString(input);
}

/**
 * Zod schema for validating email with sanitization
 */
export const emailSchema = z.string().transform((val) => {
  const sanitized = sanitizeEmail(val);
  if (!sanitized) {
    throw new Error("Invalid email format");
  }
  return sanitized;
});

/**
 * Zod schema for validating URL with sanitization
 */
export const urlSchema = z.string().transform((val) => {
  const sanitized = sanitizeURL(val);
  if (!sanitized) {
    throw new Error("Invalid URL format");
  }
  return sanitized;
});

/**
 * Zod schema for validating safe string (no injection attempts)
 */
export const safeStringSchema = z.string().transform((val) => {
  return validateInput(val);
});
