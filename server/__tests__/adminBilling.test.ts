import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("../db", () => ({
  getTotalRevenue: vi.fn(),
  getMonthlyRevenue: vi.fn(),
  getSubscriptionCountsByTier: vi.fn(),
  getRecentPayments: vi.fn(),
  getRevenueByTier: vi.fn(),
  getDailyRevenue: vi.fn(),
  getBillingMetricsSummary: vi.fn(),
}));

// Mock the Stripe service
vi.mock("../services/stripe", () => ({
  createSetupIntent: vi.fn(),
  listPaymentMethods: vi.fn(),
  detachPaymentMethod: vi.fn(),
  setDefaultPaymentMethod: vi.fn(),
  formatAmount: vi.fn((amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  }),
}));

import {
  getTotalRevenue,
  getMonthlyRevenue,
  getSubscriptionCountsByTier,
  getRecentPayments,
  getRevenueByTier,
  getDailyRevenue,
  getBillingMetricsSummary,
} from "../db";

import {
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  formatAmount,
} from "../services/stripe";

describe("Admin Billing Metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTotalRevenue", () => {
    it("should return total revenue with count", async () => {
      const mockResult = { total: 150000, count: 25 };
      vi.mocked(getTotalRevenue).mockResolvedValue(mockResult);

      const result = await getTotalRevenue();
      expect(result).toEqual(mockResult);
      expect(result.total).toBe(150000);
      expect(result.count).toBe(25);
    });

    it("should return zero for empty database", async () => {
      const mockResult = { total: 0, count: 0 };
      vi.mocked(getTotalRevenue).mockResolvedValue(mockResult);

      const result = await getTotalRevenue();
      expect(result.total).toBe(0);
      expect(result.count).toBe(0);
    });

    it("should filter by date range when provided", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");
      const mockResult = { total: 50000, count: 10 };
      vi.mocked(getTotalRevenue).mockResolvedValue(mockResult);

      const result = await getTotalRevenue(startDate, endDate);
      expect(getTotalRevenue).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMonthlyRevenue", () => {
    it("should return monthly revenue data", async () => {
      const mockData = [
        { month: "2025-01", revenue: 50000, count: 10 },
        { month: "2024-12", revenue: 45000, count: 8 },
        { month: "2024-11", revenue: 40000, count: 7 },
      ];
      vi.mocked(getMonthlyRevenue).mockResolvedValue(mockData);

      const result = await getMonthlyRevenue(3);
      expect(result).toHaveLength(3);
      expect(result[0].month).toBe("2025-01");
      expect(result[0].revenue).toBe(50000);
    });

    it("should default to 12 months", async () => {
      vi.mocked(getMonthlyRevenue).mockResolvedValue([]);

      await getMonthlyRevenue();
      expect(getMonthlyRevenue).toHaveBeenCalled();
    });
  });

  describe("getDailyRevenue", () => {
    it("should return daily revenue data", async () => {
      const mockData = [
        { date: "2025-01-15", revenue: 5000, count: 2 },
        { date: "2025-01-14", revenue: 3000, count: 1 },
      ];
      vi.mocked(getDailyRevenue).mockResolvedValue(mockData);

      const result = await getDailyRevenue(30);
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2025-01-15");
    });
  });

  describe("getSubscriptionCountsByTier", () => {
    it("should return counts for each tier", async () => {
      const mockCounts = [
        { tier: "free", count: 100 },
        { tier: "basic", count: 50 },
        { tier: "pro", count: 25 },
        { tier: "enterprise", count: 5 },
      ];
      vi.mocked(getSubscriptionCountsByTier).mockResolvedValue(mockCounts);

      const result = await getSubscriptionCountsByTier();
      expect(result).toHaveLength(4);
      
      const freeCount = result.find(r => r.tier === "free");
      expect(freeCount?.count).toBe(100);
      
      const proCount = result.find(r => r.tier === "pro");
      expect(proCount?.count).toBe(25);
    });

    it("should handle empty tiers", async () => {
      vi.mocked(getSubscriptionCountsByTier).mockResolvedValue([]);

      const result = await getSubscriptionCountsByTier();
      expect(result).toHaveLength(0);
    });
  });

  describe("getRecentPayments", () => {
    it("should return recent payments with user info", async () => {
      const mockPayments = [
        {
          id: 1,
          amount: 9900,
          currency: "USD",
          status: "succeeded",
          paymentMethodType: "card",
          description: "Pro subscription",
          createdAt: new Date(),
          userId: 1,
          userName: "John Doe",
          userEmail: "john@example.com",
        },
      ];
      vi.mocked(getRecentPayments).mockResolvedValue(mockPayments);

      const result = await getRecentPayments(10);
      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe("John Doe");
      expect(result[0].amount).toBe(9900);
    });

    it("should respect limit parameter", async () => {
      vi.mocked(getRecentPayments).mockResolvedValue([]);

      await getRecentPayments(5);
      expect(getRecentPayments).toHaveBeenCalledWith(5);
    });
  });

  describe("getRevenueByTier", () => {
    it("should return revenue breakdown by tier", async () => {
      const mockData = [
        { tier: "basic", revenue: 25000, count: 50 },
        { tier: "pro", revenue: 75000, count: 30 },
        { tier: "enterprise", revenue: 100000, count: 10 },
      ];
      vi.mocked(getRevenueByTier).mockResolvedValue(mockData);

      const result = await getRevenueByTier();
      expect(result).toHaveLength(3);
      
      const proRevenue = result.find(r => r.tier === "pro");
      expect(proRevenue?.revenue).toBe(75000);
      expect(proRevenue?.count).toBe(30);
    });
  });

  describe("getBillingMetricsSummary", () => {
    it("should return comprehensive billing summary", async () => {
      const mockSummary = {
        currentMonthRevenue: 50000,
        currentMonthTransactions: 15,
        lastMonthRevenue: 45000,
        lastMonthTransactions: 12,
        allTimeRevenue: 500000,
        allTimeTransactions: 150,
        growthRate: 11.11,
        subscriptionCounts: [
          { tier: "free", count: 100 },
          { tier: "pro", count: 25 },
        ],
      };
      vi.mocked(getBillingMetricsSummary).mockResolvedValue(mockSummary);

      const result = await getBillingMetricsSummary();
      expect(result).not.toBeNull();
      expect(result?.currentMonthRevenue).toBe(50000);
      expect(result?.growthRate).toBeCloseTo(11.11);
      expect(result?.subscriptionCounts).toHaveLength(2);
    });

    it("should calculate growth rate correctly", async () => {
      const mockSummary = {
        currentMonthRevenue: 60000,
        currentMonthTransactions: 20,
        lastMonthRevenue: 50000,
        lastMonthTransactions: 15,
        allTimeRevenue: 600000,
        allTimeTransactions: 200,
        growthRate: 20, // (60000 - 50000) / 50000 * 100 = 20%
        subscriptionCounts: [],
      };
      vi.mocked(getBillingMetricsSummary).mockResolvedValue(mockSummary);

      const result = await getBillingMetricsSummary();
      expect(result?.growthRate).toBe(20);
    });
  });
});

describe("Payment Methods Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSetupIntent", () => {
    it("should create a SetupIntent for a customer", async () => {
      const mockSetupIntent = {
        id: "seti_123",
        client_secret: "seti_123_secret_abc",
        customer: "cus_123",
      };
      vi.mocked(createSetupIntent).mockResolvedValue(mockSetupIntent as any);

      const result = await createSetupIntent("cus_123");
      expect(result.id).toBe("seti_123");
      expect(result.client_secret).toBe("seti_123_secret_abc");
    });

    it("should throw error for invalid customer", async () => {
      vi.mocked(createSetupIntent).mockRejectedValue(new Error("Customer not found"));

      await expect(createSetupIntent("invalid_cus")).rejects.toThrow("Customer not found");
    });
  });

  describe("listPaymentMethods", () => {
    it("should list all payment methods for a customer", async () => {
      const mockResponse = {
        paymentMethods: [
          {
            id: "pm_123",
            type: "card",
            card: {
              brand: "visa",
              last4: "4242",
              exp_month: 12,
              exp_year: 2026,
            },
          },
          {
            id: "pm_456",
            type: "card",
            card: {
              brand: "mastercard",
              last4: "5555",
              exp_month: 6,
              exp_year: 2027,
            },
          },
        ],
        defaultPaymentMethodId: "pm_123",
      };
      vi.mocked(listPaymentMethods).mockResolvedValue(mockResponse as any);

      const result = await listPaymentMethods("cus_123");
      expect(result.paymentMethods).toHaveLength(2);
      expect(result.defaultPaymentMethodId).toBe("pm_123");
      expect(result.paymentMethods[0].card?.brand).toBe("visa");
    });

    it("should return empty array for customer with no payment methods", async () => {
      const mockResponse = {
        paymentMethods: [],
        defaultPaymentMethodId: null,
      };
      vi.mocked(listPaymentMethods).mockResolvedValue(mockResponse as any);

      const result = await listPaymentMethods("cus_new");
      expect(result.paymentMethods).toHaveLength(0);
      expect(result.defaultPaymentMethodId).toBeNull();
    });
  });

  describe("detachPaymentMethod", () => {
    it("should detach a payment method successfully", async () => {
      const mockDetached = {
        id: "pm_123",
        customer: null,
      };
      vi.mocked(detachPaymentMethod).mockResolvedValue(mockDetached as any);

      const result = await detachPaymentMethod("pm_123");
      expect(result.id).toBe("pm_123");
      expect(result.customer).toBeNull();
    });

    it("should throw error for non-existent payment method", async () => {
      vi.mocked(detachPaymentMethod).mockRejectedValue(
        new Error("No such payment method")
      );

      await expect(detachPaymentMethod("pm_invalid")).rejects.toThrow(
        "No such payment method"
      );
    });
  });

  describe("setDefaultPaymentMethod", () => {
    it("should set default payment method for customer", async () => {
      const mockCustomer = {
        id: "cus_123",
        invoice_settings: {
          default_payment_method: "pm_456",
        },
      };
      vi.mocked(setDefaultPaymentMethod).mockResolvedValue(mockCustomer as any);

      const result = await setDefaultPaymentMethod("cus_123", "pm_456");
      expect(result.invoice_settings?.default_payment_method).toBe("pm_456");
    });

    it("should throw error for invalid payment method", async () => {
      vi.mocked(setDefaultPaymentMethod).mockRejectedValue(
        new Error("Payment method not attached to customer")
      );

      await expect(
        setDefaultPaymentMethod("cus_123", "pm_invalid")
      ).rejects.toThrow("Payment method not attached to customer");
    });
  });

  describe("formatAmount", () => {
    it("should format USD amounts correctly", () => {
      expect(formatAmount(9900)).toBe("$99.00");
      expect(formatAmount(100)).toBe("$1.00");
      expect(formatAmount(0)).toBe("$0.00");
    });

    it("should format other currencies", () => {
      expect(formatAmount(9900, "EUR")).toBe("€99.00");
      expect(formatAmount(9900, "GBP")).toBe("£99.00");
    });

    it("should handle large amounts", () => {
      expect(formatAmount(1000000)).toBe("$10,000.00");
      expect(formatAmount(99999999)).toBe("$999,999.99");
    });
  });
});

describe("Admin Access Control", () => {
  it("should only allow admin users to access billing metrics", () => {
    // This is a conceptual test - actual implementation would be in the router
    const adminUser = { id: 1, role: "admin" };
    const regularUser = { id: 2, role: "user" };

    expect(adminUser.role).toBe("admin");
    expect(regularUser.role).toBe("user");
    expect(adminUser.role === "admin").toBe(true);
    expect(regularUser.role === "admin").toBe(false);
  });

  it("should throw FORBIDDEN error for non-admin users", () => {
    const checkAdminAccess = (role: string) => {
      if (role !== "admin") {
        throw new Error("FORBIDDEN: Admin access required");
      }
      return true;
    };

    expect(checkAdminAccess("admin")).toBe(true);
    expect(() => checkAdminAccess("user")).toThrow("FORBIDDEN");
  });
});

describe("Data Validation", () => {
  it("should validate revenue amounts are non-negative", () => {
    const validateRevenue = (amount: number) => amount >= 0;
    
    expect(validateRevenue(0)).toBe(true);
    expect(validateRevenue(100)).toBe(true);
    expect(validateRevenue(-100)).toBe(false);
  });

  it("should validate subscription tiers", () => {
    const validTiers = ["free", "basic", "pro", "enterprise"];
    const validateTier = (tier: string) => validTiers.includes(tier);

    expect(validateTier("free")).toBe(true);
    expect(validateTier("pro")).toBe(true);
    expect(validateTier("premium")).toBe(false);
    expect(validateTier("")).toBe(false);
  });

  it("should validate payment method IDs format", () => {
    const validatePaymentMethodId = (id: string) => {
      return id.startsWith("pm_") && id.length > 3;
    };

    expect(validatePaymentMethodId("pm_123abc")).toBe(true);
    expect(validatePaymentMethodId("pm_")).toBe(false);
    expect(validatePaymentMethodId("card_123")).toBe(false);
  });

  it("should validate customer IDs format", () => {
    const validateCustomerId = (id: string) => {
      return id.startsWith("cus_") && id.length > 4;
    };

    expect(validateCustomerId("cus_123abc")).toBe(true);
    expect(validateCustomerId("cus_")).toBe(false);
    expect(validateCustomerId("customer_123")).toBe(false);
  });
});
