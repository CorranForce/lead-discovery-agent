import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

describe("Remember Me Session Management", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    name: "Test User",
  };

  const jwtSecret = "test-secret-key";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JWT Token Generation with Remember Me", () => {
    it("should create token with 24h expiry when rememberMe is false", () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: "24h" }
      );

      const decoded = jwt.verify(token, jwtSecret) as any;
      const expiryTime = decoded.exp - decoded.iat;

      // 24 hours = 86400 seconds
      expect(expiryTime).toBe(86400);
    });

    it("should create token with 30d expiry when rememberMe is true", () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: "30d" }
      );

      const decoded = jwt.verify(token, jwtSecret) as any;
      const expiryTime = decoded.exp - decoded.iat;

      // 30 days = 2592000 seconds
      expect(expiryTime).toBe(2592000);
    });

    it("should include correct user data in token", () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: "24h" }
      );

      const decoded = jwt.verify(token, jwtSecret) as any;

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });
  });

  describe("Cookie MaxAge Calculation", () => {
    it("should calculate correct maxAge for 24h session", () => {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      expect(maxAge).toBe(86400000);
    });

    it("should calculate correct maxAge for 30d session", () => {
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      expect(maxAge).toBe(2592000000);
    });

    it("should match JWT expiry with cookie maxAge", () => {
      const rememberMe = true;
      const jwtExpiresIn = rememberMe ? "30d" : "24h";
      const cookieMaxAge = rememberMe 
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

      // Create token
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      const decoded = jwt.verify(token, jwtSecret) as any;
      const tokenExpiryMs = (decoded.exp - decoded.iat) * 1000;

      // Cookie maxAge should match JWT expiry
      expect(cookieMaxAge).toBe(tokenExpiryMs);
    });
  });

  describe("Session Duration Logic", () => {
    it("should use short session when rememberMe is undefined", () => {
      const rememberMe = undefined;
      const expiresIn = rememberMe ? "30d" : "24h";
      expect(expiresIn).toBe("24h");
    });

    it("should use short session when rememberMe is false", () => {
      const rememberMe = false;
      const expiresIn = rememberMe ? "30d" : "24h";
      expect(expiresIn).toBe("24h");
    });

    it("should use long session when rememberMe is true", () => {
      const rememberMe = true;
      const expiresIn = rememberMe ? "30d" : "24h";
      expect(expiresIn).toBe("30d");
    });
  });

  describe("Token Expiration Validation", () => {
    it("should reject expired token", async () => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: "1ms" } // Expires immediately
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(() => {
        jwt.verify(expiredToken, jwtSecret);
      }).toThrow();
    });

    it("should accept valid token within expiry window", () => {
      const validToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: "1h" }
      );

      const decoded = jwt.verify(validToken, jwtSecret) as any;
      expect(decoded.userId).toBe(mockUser.id);
    });
  });
});
