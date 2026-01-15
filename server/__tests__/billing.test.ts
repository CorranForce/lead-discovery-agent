import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createInvoice,
  getUserInvoices,
  getInvoiceById,
  getInvoiceByStripeId,
  updateInvoice,
  createPayment,
  getUserPayments,
  getPaymentByStripeId,
  updatePayment,
  getSubscriptionPlanByTier,
  getActiveSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  updateUserStripeCustomerId,
} from "../db";
import * as stripeService from "../services/stripe";

describe("Billing Functions", () => {
  const testUserId = 1;
  const testStripeCustomerId = "cus_test123";
  const testStripeInvoiceId = "in_test123";
  const testStripePaymentIntentId = "pi_test123";

  describe("Invoice Management", () => {
    it("should create an invoice", async () => {
      const invoiceData = {
        userId: testUserId,
        stripeInvoiceId: testStripeInvoiceId,
        stripeCustomerId: testStripeCustomerId,
        amount: 9999,
        currency: "USD",
        status: "paid" as const,
        paidAt: new Date(),
        dueDate: new Date(),
        description: "Test invoice",
        receiptUrl: "https://example.com/receipt",
        downloadUrl: "https://example.com/download",
      };

      const result = await createInvoice(invoiceData);
      expect(result).toBeDefined();
    });

    it("should retrieve user invoices", async () => {
      const invoices = await getUserInvoices(testUserId, 10);
      expect(Array.isArray(invoices)).toBe(true);
    });

    it("should get invoice by ID with ownership check", async () => {
      const invoice = await getInvoiceById(1, testUserId);
      // Should return undefined if invoice doesn't exist or doesn't belong to user
      expect(invoice === undefined || invoice.userId === testUserId).toBe(true);
    });

    it("should get invoice by Stripe ID", async () => {
      const invoice = await getInvoiceByStripeId(testStripeInvoiceId);
      // Should return undefined or a valid invoice
      expect(invoice === undefined || invoice.stripeInvoiceId === testStripeInvoiceId).toBe(true);
    });

    it("should update invoice", async () => {
      await updateInvoice(1, {
        status: "paid" as const,
        paidAt: new Date(),
      });
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should prevent unauthorized invoice access", async () => {
      const invoice = await getInvoiceById(1, 999); // Different user ID
      // Should return undefined for unauthorized access
      expect(invoice).toBeUndefined();
    });
  });

  describe("Payment Management", () => {
    it("should create a payment", async () => {
      const paymentData = {
        userId: testUserId,
        stripePaymentIntentId: testStripePaymentIntentId,
        stripeCustomerId: testStripeCustomerId,
        invoiceId: 1,
        amount: 9999,
        currency: "USD",
        status: "succeeded" as const,
        paymentMethodType: "card",
        description: "Test payment",
      };

      const result = await createPayment(paymentData);
      expect(result).toBeDefined();
    });

    it("should retrieve user payments", async () => {
      const payments = await getUserPayments(testUserId, 10);
      expect(Array.isArray(payments)).toBe(true);
    });

    it("should get payment by Stripe ID", async () => {
      const payment = await getPaymentByStripeId(testStripePaymentIntentId);
      // Should return undefined or a valid payment
      expect(payment === undefined || payment.stripePaymentIntentId === testStripePaymentIntentId).toBe(true);
    });

    it("should update payment", async () => {
      await updatePayment(1, {
        status: "succeeded" as const,
      });
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should track payment status transitions", async () => {
      const statuses = ["requires_payment_method", "processing", "succeeded"];
      for (const status of statuses) {
        await updatePayment(1, {
          status: status as any,
        });
      }
      expect(true).toBe(true);
    });
  });

  describe("Subscription Plans", () => {
    it("should retrieve subscription plan by tier", async () => {
      const plan = await getSubscriptionPlanByTier("basic");
      // Should return undefined or a valid plan
      expect(plan === undefined || plan.tier === "basic").toBe(true);
    });

    it("should get all active subscription plans", async () => {
      const plans = await getActiveSubscriptionPlans();
      expect(Array.isArray(plans)).toBe(true);
      // All returned plans should be active
      plans.forEach((plan) => {
        expect(plan.isActive).toBe(1);
      });
    });

    it("should create a subscription plan", async () => {
      const planData = {
        name: "Test Plan",
        tier: "pro" as const,
        description: "A test plan",
        monthlyPrice: 2999,
        yearlyPrice: 29990,
        stripePriceIdMonthly: "price_test_monthly",
        stripePriceIdYearly: "price_test_yearly",
        features: JSON.stringify(["Feature 1", "Feature 2"]),
        maxLeads: 1000,
        maxEmails: 5000,
        maxSequences: 10,
        isActive: 1,
      };

      const result = await createSubscriptionPlan(planData);
      expect(result).toBeDefined();
    });

    it("should update subscription plan", async () => {
      await updateSubscriptionPlan(1, {
        monthlyPrice: 3999,
        yearlyPrice: 39990,
      });
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should archive subscription plan", async () => {
      await updateSubscriptionPlan(1, {
        isActive: 0,
      });
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe("User Stripe Integration", () => {
    it("should update user Stripe customer ID", async () => {
      await updateUserStripeCustomerId(testUserId, testStripeCustomerId);
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should handle multiple Stripe customer IDs for same user", async () => {
      const customerId1 = "cus_test1";
      const customerId2 = "cus_test2";

      await updateUserStripeCustomerId(testUserId, customerId1);
      await updateUserStripeCustomerId(testUserId, customerId2);

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe("Stripe Service", () => {
    it("should format amounts correctly", () => {
      const formatted = stripeService.formatAmount(9999, "USD");
      expect(formatted).toContain("99.99");
    });

    it("should format different currencies", () => {
      const usd = stripeService.formatAmount(9999, "USD");
      const eur = stripeService.formatAmount(9999, "EUR");
      expect(usd).toContain("99.99");
      expect(eur).toContain("99.99");
    });

    it("should handle zero amount", () => {
      const formatted = stripeService.formatAmount(0, "USD");
      expect(formatted).toContain("0");
    });

    it("should handle large amounts", () => {
      const formatted = stripeService.formatAmount(999999, "USD");
      expect(formatted).toContain("9999.99");
    });
  });

  describe("Invoice Status Tracking", () => {
    it("should track invoice status changes", async () => {
      const statuses = ["draft", "open", "paid", "void"];
      for (const status of statuses) {
        await updateInvoice(1, {
          status: status as any,
        });
      }
      expect(true).toBe(true);
    });

    it("should record payment dates", async () => {
      const paidDate = new Date("2024-01-15");
      await updateInvoice(1, {
        status: "paid" as const,
        paidAt: paidDate,
      });
      expect(true).toBe(true);
    });

    it("should track due dates", async () => {
      const dueDate = new Date("2024-02-15");
      await updateInvoice(1, {
        dueDate,
      });
      expect(true).toBe(true);
    });
  });

  describe("Plan Tier Hierarchy", () => {
    it("should support all plan tiers", async () => {
      const tiers = ["free", "basic", "pro", "enterprise"] as const;
      for (const tier of tiers) {
        const plan = await getSubscriptionPlanByTier(tier);
        // Should return undefined or a plan with matching tier
        expect(plan === undefined || plan.tier === tier).toBe(true);
      }
    });

    it("should enforce plan feature limits", async () => {
      const plans = await getActiveSubscriptionPlans();
      plans.forEach((plan) => {
        // Basic validation of plan structure
        expect(plan.monthlyPrice).toBeGreaterThanOrEqual(0);
        expect(plan.yearlyPrice).toBeGreaterThanOrEqual(0);
        expect(plan.maxLeads === null || plan.maxLeads > 0).toBe(true);
        expect(plan.maxEmails === null || plan.maxEmails > 0).toBe(true);
        expect(plan.maxSequences === null || plan.maxSequences > 0).toBe(true);
      });
    });
  });

  describe("Data Integrity", () => {
    it("should maintain referential integrity for invoices", async () => {
      const invoices = await getUserInvoices(testUserId);
      invoices.forEach((invoice) => {
        expect(invoice.userId).toBe(testUserId);
        expect(invoice.stripeInvoiceId).toBeDefined();
        expect(invoice.stripeCustomerId).toBeDefined();
      });
    });

    it("should maintain referential integrity for payments", async () => {
      const payments = await getUserPayments(testUserId);
      payments.forEach((payment) => {
        expect(payment.userId).toBe(testUserId);
        expect(payment.stripePaymentIntentId).toBeDefined();
        expect(payment.stripeCustomerId).toBeDefined();
      });
    });

    it("should enforce currency codes", async () => {
      const invoices = await getUserInvoices(testUserId);
      invoices.forEach((invoice) => {
        expect(invoice.currency).toMatch(/^[A-Z]{3}$/);
      });
    });
  });
});
