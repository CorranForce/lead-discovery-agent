import helmet from "helmet";
import { type Express } from "express";

/**
 * Security Middleware Configuration
 * 
 * Implements comprehensive security headers and protections:
 * - XSS Protection
 * - Content Security Policy
 * - Clickjacking Protection
 * - MIME Type Sniffing Protection
 * - And more...
 */

export function setupSecurityMiddleware(app: Express) {
  // Helmet provides multiple security headers
  app.use(
    helmet({
      // Content Security Policy - prevents XSS attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for inline scripts (React, Vite HMR)
            "'unsafe-eval'", // Required for development (Vite HMR)
            "https://www.googletagmanager.com",
            "https://www.google-analytics.com",
            "https://files.manuscdn.com",
            "https://manus-analytics.com",
            "https://plausible.io",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for inline styles (Tailwind, component styles)
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://files.manuscdn.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",
            "http:", // Allow images from any HTTPS source
          ],
          connectSrc: [
            "'self'",
            "https://www.google-analytics.com",
            "https://api.manus.im",
            "https://manus-analytics.com",
            "https://plausible.io",
          ],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
        },
      },
      
      // X-Frame-Options - prevents clickjacking
      frameguard: {
        action: "deny", // Prevent embedding in iframes
      },
      
      // X-Content-Type-Options - prevents MIME type sniffing
      noSniff: true,
      
      // X-XSS-Protection - legacy XSS protection for older browsers
      xssFilter: true,
      
      // Referrer-Policy - controls referrer information
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
      
      // Hide X-Powered-By header
      hidePoweredBy: true,
      
      // HTTP Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      
      // Permissions Policy (formerly Feature Policy)
      permittedCrossDomainPolicies: {
        permittedPolicies: "none",
      },
    })
  );
  
  // Additional custom security headers
  app.use((req, res, next) => {
    // Prevent caching of sensitive data
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }
    
    // Add custom security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    next();
  });
}

/**
 * Sanitize HTML content to prevent XSS
 * This should be used when rendering user-generated content
 */
export function sanitizeHTML(html: string): string {
  // Basic HTML sanitization - removes script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror\s*=/gi, "")
    .replace(/onclick\s*=/gi, "")
    .replace(/onload\s*=/gi, "");
}
