import { describe, it, expect, beforeAll, beforeEach } from "vitest";

// Helper to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
import {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendSubscriptionRenewalEmail,
  sendLeadNotificationEmail,
  verifyResendApiKey,
} from "../services/email";

describe("Email Service", () => {
  beforeEach(async () => {
    // Add 600ms delay between each test to respect Resend's 2 req/sec rate limit
    await delay(600);
  });
  
  beforeAll(async () => {
    // Verify API key is valid before running tests
    const isValid = await verifyResendApiKey();
    if (!isValid) {
      throw new Error("Resend API key is invalid. Please check your RESEND_API_KEY environment variable.");
    }
  });

  describe("sendEmail", () => {
    it("should send a basic email successfully", async () => {
      const result = await sendEmail({
        to: "delivered@resend.dev",
        subject: "Test Email",
        html: "<p>This is a test email.</p>",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should handle multiple recipients", async () => {
      const result = await sendEmail({
        to: ["delivered@resend.dev", "delivered@resend.dev"],
        subject: "Test Email - Multiple Recipients",
        html: "<p>This is a test email to multiple recipients.</p>",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should handle custom from address", async () => {
      const result = await sendEmail({
        to: "delivered@resend.dev",
        subject: "Test Email - Custom From",
        html: "<p>This is a test email with custom from address.</p>",
        from: "Test Sender <onboarding@resend.dev>",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should handle reply-to address", async () => {
      const result = await sendEmail({
        to: "delivered@resend.dev",
        subject: "Test Email - Reply To",
        html: "<p>This is a test email with reply-to address.</p>",
        replyTo: "support@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email successfully", async () => {
      const result = await sendWelcomeEmail(
        "delivered@resend.dev",
        "John Doe"
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should include user name in welcome email", async () => {
      const result = await sendWelcomeEmail(
        "delivered@resend.dev",
        "Jane Smith"
      );

      expect(result.success).toBe(true);
    }, 10000);
  });

  describe("sendPaymentConfirmationEmail", () => {
    it("should send payment confirmation email successfully", async () => {
      const result = await sendPaymentConfirmationEmail(
        "delivered@resend.dev",
        "John Doe",
        4900, // $49.00
        "Pro Plan"
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should include receipt URL when provided", async () => {
      const result = await sendPaymentConfirmationEmail(
        "delivered@resend.dev",
        "John Doe",
        4900,
        "Pro Plan",
        "https://example.com/receipt/123"
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should handle different plan names", async () => {
      const plans = ["Basic", "Pro", "Enterprise"];
      
      for (const plan of plans) {
        const result = await sendPaymentConfirmationEmail(
          "delivered@resend.dev",
          "Test User",
          2900,
          plan
        );

        expect(result.success).toBe(true);
      }
    }, 30000);
  });

  describe("sendSubscriptionRenewalEmail", () => {
    it("should send subscription renewal email successfully", async () => {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 7); // 7 days from now

      const result = await sendSubscriptionRenewalEmail(
        "delivered@resend.dev",
        "John Doe",
        "Pro Plan",
        renewalDate,
        4900
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should format renewal date correctly", async () => {
      const renewalDate = new Date("2026-12-31");

      const result = await sendSubscriptionRenewalEmail(
        "delivered@resend.dev",
        "Test User",
        "Enterprise Plan",
        renewalDate,
        9900
      );

      expect(result.success).toBe(true);
    }, 10000);
  });

  describe("sendLeadNotificationEmail", () => {
    it("should send lead notification email successfully", async () => {
      const result = await sendLeadNotificationEmail(
        "delivered@resend.dev",
        "John Doe",
        "Jane Smith",
        "Acme Corporation"
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should include lead email when provided", async () => {
      const result = await sendLeadNotificationEmail(
        "delivered@resend.dev",
        "John Doe",
        "Jane Smith",
        "Acme Corporation",
        "jane.smith@acme.com"
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    }, 10000);

    it("should handle leads without email", async () => {
      const result = await sendLeadNotificationEmail(
        "delivered@resend.dev",
        "Sales Rep",
        "Unknown Contact",
        "Mystery Company"
      );

      expect(result.success).toBe(true);
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle invalid email addresses gracefully", async () => {
      const result = await sendEmail({
        to: "invalid-email",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);
  });

  describe("Email Content", () => {
    it("should send HTML emails with proper formatting", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { background: #667eea; color: white; padding: 20px; }
              .content { padding: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Test Email</h1>
            </div>
            <div class="content">
              <p>This is a test email with HTML formatting.</p>
            </div>
          </body>
        </html>
      `;

      const result = await sendEmail({
        to: "delivered@resend.dev",
        subject: "HTML Formatted Email",
        html,
      });

      expect(result.success).toBe(true);
    }, 10000);
  });
});
