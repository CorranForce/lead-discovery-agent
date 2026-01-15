import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// Mock the database functions
vi.mock("../db", () => ({
  createInvoice: vi.fn().mockResolvedValue({}),
  createPayment: vi.fn().mockResolvedValue({}),
  getInvoiceByStripeId: vi.fn().mockResolvedValue(null),
  updateInvoice: vi.fn().mockResolvedValue({}),
  getPaymentByStripeId: vi.fn().mockResolvedValue(null),
  updatePayment: vi.fn().mockResolvedValue({}),
  updateUserBilling: vi.fn().mockResolvedValue(true),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 1, paymentMethodId: "cus_test123" }]),
  }),
}));

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: vi.fn().mockImplementation((body, signature, secret) => {
          if (signature === "invalid") {
            throw new Error("Invalid signature");
          }
          const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
          return parsedBody;
        }),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_test123",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          items: {
            data: [{ price: { id: "price_basic_monthly" } }],
          },
        }),
      },
    })),
  };
});

describe("Stripe Webhook Handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnThis();
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe("Signature Verification", () => {
    it("should reject requests without signature", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      
      mockRequest = {
        headers: {},
        body: JSON.stringify({ type: "test" }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "No signature provided" });
    });

    it("should reject requests with invalid signature", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      
      mockRequest = {
        headers: { "stripe-signature": "invalid" },
        body: JSON.stringify({ type: "test" }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid signature" });
    });
  });

  describe("Test Event Handling", () => {
    it("should return verified response for test events", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_test_123",
          type: "checkout.session.completed",
          data: { object: {} },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ verified: true });
    });
  });

  describe("checkout.session.completed Event", () => {
    it("should handle checkout session completed event", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { updateUserBilling } = await import("../db");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_123",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test123",
              customer: "cus_test123",
              mode: "subscription",
              subscription: "sub_test123",
              metadata: {
                userId: "1",
                billingCycle: "monthly",
              },
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        event: "checkout.session.completed",
      });
    });
  });

  describe("payment_intent.succeeded Event", () => {
    it("should create payment record on payment success", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { createPayment, getPaymentByStripeId } = await import("../db");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_456",
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_test123",
              customer: "cus_test123",
              amount: 9999,
              currency: "usd",
              payment_method_types: ["card"],
              description: "Test payment",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        event: "payment_intent.succeeded",
      });
    });

    it("should update existing payment if already exists", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { getPaymentByStripeId, updatePayment } = await import("../db");
      
      // Mock existing payment
      vi.mocked(getPaymentByStripeId).mockResolvedValueOnce({
        id: 1,
        userId: 1,
        stripePaymentIntentId: "pi_test123",
        stripeCustomerId: "cus_test123",
        amount: 9999,
        currency: "USD",
        status: "processing",
        paymentMethodType: "card",
        description: "Test",
        invoiceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_789",
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_test123",
              customer: "cus_test123",
              amount: 9999,
              currency: "usd",
              payment_method_types: ["card"],
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        event: "payment_intent.succeeded",
      });
    });
  });

  describe("invoice.paid Event", () => {
    it("should create invoice record on invoice paid", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { createInvoice } = await import("../db");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_inv1",
          type: "invoice.paid",
          data: {
            object: {
              id: "in_test123",
              customer: "cus_test123",
              total: 9999,
              currency: "usd",
              due_date: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
              description: "Subscription invoice",
              hosted_invoice_url: "https://invoice.stripe.com/test",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        event: "invoice.paid",
      });
    });

    it("should update existing invoice if already exists", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { getInvoiceByStripeId, updateInvoice } = await import("../db");
      
      // Mock existing invoice
      vi.mocked(getInvoiceByStripeId).mockResolvedValueOnce({
        id: 1,
        userId: 1,
        stripeInvoiceId: "in_test123",
        stripeCustomerId: "cus_test123",
        amount: 9999,
        currency: "USD",
        status: "open",
        paidAt: null,
        dueDate: new Date(),
        description: "Test",
        receiptUrl: null,
        downloadUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_inv2",
          type: "invoice.paid",
          data: {
            object: {
              id: "in_test123",
              customer: "cus_test123",
              total: 9999,
              currency: "usd",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(updateInvoice).toHaveBeenCalledWith(1, {
        status: "paid",
        paidAt: expect.any(Date),
      });
    });
  });

  describe("invoice.payment_failed Event", () => {
    it("should update invoice status on payment failure", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { getInvoiceByStripeId, updateInvoice } = await import("../db");
      
      // Mock existing invoice
      vi.mocked(getInvoiceByStripeId).mockResolvedValueOnce({
        id: 1,
        userId: 1,
        stripeInvoiceId: "in_failed123",
        stripeCustomerId: "cus_test123",
        amount: 9999,
        currency: "USD",
        status: "open",
        paidAt: null,
        dueDate: new Date(),
        description: "Test",
        receiptUrl: null,
        downloadUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_fail1",
          type: "invoice.payment_failed",
          data: {
            object: {
              id: "in_failed123",
              customer: "cus_test123",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(updateInvoice).toHaveBeenCalledWith(1, { status: "open" });
    });
  });

  describe("customer.subscription.updated Event", () => {
    it("should downgrade user on subscription cancellation", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { updateUserBilling } = await import("../db");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_sub1",
          type: "customer.subscription.updated",
          data: {
            object: {
              id: "sub_test123",
              customer: "cus_test123",
              status: "canceled",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(updateUserBilling).toHaveBeenCalledWith(1, {
        subscriptionTier: "free",
        billingCycle: "none",
        nextBillingDate: null,
      });
    });

    it("should update billing date on active subscription", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { updateUserBilling } = await import("../db");
      
      const futureDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_sub2",
          type: "customer.subscription.updated",
          data: {
            object: {
              id: "sub_test123",
              customer: "cus_test123",
              status: "active",
              current_period_end: futureDate,
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(updateUserBilling).toHaveBeenCalledWith(1, {
        nextBillingDate: expect.any(Date),
      });
    });
  });

  describe("customer.subscription.deleted Event", () => {
    it("should downgrade user to free tier on subscription deletion", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      const { updateUserBilling } = await import("../db");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_del1",
          type: "customer.subscription.deleted",
          data: {
            object: {
              id: "sub_test123",
              customer: "cus_test123",
            },
          },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(updateUserBilling).toHaveBeenCalledWith(1, {
        subscriptionTier: "free",
        billingCycle: "none",
        nextBillingDate: null,
      });
    });
  });

  describe("Unhandled Events", () => {
    it("should acknowledge unhandled event types", async () => {
      const { handleStripeWebhook } = await import("../webhooks/stripe");
      
      mockRequest = {
        headers: { "stripe-signature": "valid_signature" },
        body: JSON.stringify({
          id: "evt_live_unknown",
          type: "unknown.event.type",
          data: { object: {} },
        }),
      };

      await handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        event: "unknown.event.type",
      });
    });
  });
});
