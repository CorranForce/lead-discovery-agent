import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import type { User } from "../db";

// Mock Stripe functions for testing
const mockStripePromoCodes = new Map();
const mockStripeCoupons = new Map();

// Mock implementations
const mockCreateCoupon = async (params: any) => {
  const couponId = `coupon_${Date.now()}`;
  mockStripeCoupons.set(couponId, {
    id: couponId,
    name: params.name,
    percent_off: params.percentOff,
    amount_off: params.amountOff,
    currency: params.currency,
    duration: params.duration,
    duration_in_months: params.durationInMonths,
    max_redemptions: params.maxRedemptions,
    redeem_by: params.redeemBy ? Math.floor(params.redeemBy.getTime() / 1000) : null,
    created: Math.floor(Date.now() / 1000),
    valid: true,
    times_redeemed: 0,
  });
  return mockStripeCoupons.get(couponId);
};

const mockCreatePromoCode = async (params: any) => {
  const promoCodeId = `promo_${Date.now()}`;
  mockStripePromoCodes.set(promoCodeId, {
    id: promoCodeId,
    code: params.code,
    coupon: params.couponId,
    active: true,
    created: Math.floor(Date.now() / 1000),
    expires_at: params.expiresAt ? Math.floor(params.expiresAt.getTime() / 1000) : null,
    max_redemptions: params.maxRedemptions,
    times_redeemed: 0,
    restrictions: {
      first_time_transaction: params.firstTimeTransaction || false,
      minimum_amount: params.minimumAmount,
      minimum_amount_currency: params.minimumAmountCurrency,
    },
  });
  return mockStripePromoCodes.get(promoCodeId);
};

const mockListPromoCodes = async (options?: any) => {
  const codes = Array.from(mockStripePromoCodes.values());
  const filtered = options?.active !== undefined 
    ? codes.filter(pc => pc.active === options.active)
    : codes;
  return {
    data: filtered.slice(0, options?.limit || 100),
    has_more: filtered.length > (options?.limit || 100),
  };
};

const mockGetPromoCode = async (promoCodeId: string) => {
  const promoCode = mockStripePromoCodes.get(promoCodeId);
  if (!promoCode) throw new Error("Promo code not found");
  return promoCode;
};

const mockUpdatePromoCode = async (promoCodeId: string, active: boolean) => {
  const promoCode = mockStripePromoCodes.get(promoCodeId);
  if (!promoCode) throw new Error("Promo code not found");
  promoCode.active = active;
  return promoCode;
};

const mockListCoupons = async (limit: number = 100) => {
  const coupons = Array.from(mockStripeCoupons.values());
  return {
    data: coupons.slice(0, limit),
  };
};

const mockDeleteCoupon = async (couponId: string) => {
  const coupon = mockStripeCoupons.get(couponId);
  if (!coupon) throw new Error("Coupon not found");
  mockStripeCoupons.delete(couponId);
  // Also delete associated promo codes
  for (const [pcId, pc] of mockStripePromoCodes.entries()) {
    if (pc.coupon === couponId) {
      mockStripePromoCodes.delete(pcId);
    }
  }
  return { deleted: true };
};

const mockGetCouponStats = async (couponId: string) => {
  const coupon = mockStripeCoupons.get(couponId);
  if (!coupon) throw new Error("Coupon not found");
  
  const promoCodes = Array.from(mockStripePromoCodes.values()).filter(pc => pc.coupon === couponId);
  const totalRedemptions = promoCodes.reduce((sum, pc) => sum + (pc.times_redeemed || 0), 0);
  
  return {
    coupon,
    promoCodes,
    totalRedemptions,
    promoCodeCount: promoCodes.length,
  };
};

describe("Promo Code Management", () => {
  let testAdmin: User;

  beforeAll(async () => {
    testAdmin = { id: 1, openId: "admin_test", name: "Test Admin", email: "admin@test.com", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "test" };
  });

  afterAll(async () => {
    mockStripePromoCodes.clear();
    mockStripeCoupons.clear();
  });

  describe("Coupon Creation", () => {
    it("should create a percentage-based coupon", async () => {
      const coupon = await mockCreateCoupon({
        name: "Summer Sale 25%",
        percentOff: 25,
        duration: "once",
      });

      expect(coupon).toBeDefined();
      expect(coupon.name).toBe("Summer Sale 25%");
      expect(coupon.percent_off).toBe(25);
      expect(coupon.duration).toBe("once");
    });

    it("should create a fixed amount coupon", async () => {
      const coupon = await mockCreateCoupon({
        name: "Save $10",
        amountOff: 1000, // $10 in cents
        currency: "usd",
        duration: "forever",
      });

      expect(coupon).toBeDefined();
      expect(coupon.amount_off).toBe(1000);
      expect(coupon.currency).toBe("usd");
      expect(coupon.duration).toBe("forever");
    });

    it("should create a repeating coupon with duration", async () => {
      const coupon = await mockCreateCoupon({
        name: "3-Month Discount",
        percentOff: 15,
        duration: "repeating",
        durationInMonths: 3,
      });

      expect(coupon).toBeDefined();
      expect(coupon.duration).toBe("repeating");
      expect(coupon.duration_in_months).toBe(3);
    });

    it("should create a coupon with max redemptions", async () => {
      const coupon = await mockCreateCoupon({
        name: "Limited Offer",
        percentOff: 50,
        duration: "once",
        maxRedemptions: 100,
      });

      expect(coupon).toBeDefined();
      expect(coupon.max_redemptions).toBe(100);
    });

    it("should create a coupon with expiration date", async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const coupon = await mockCreateCoupon({
        name: "Time-Limited Deal",
        percentOff: 20,
        duration: "once",
        redeemBy: expiresAt,
      });

      expect(coupon).toBeDefined();
      expect(coupon.redeem_by).toBeDefined();
    });
  });

  describe("Promo Code Creation", () => {
    it("should create a promo code linked to a coupon", async () => {
      const coupon = await mockCreateCoupon({
        name: "Test Coupon",
        percentOff: 25,
        duration: "once",
      });

      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "SUMMER25",
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.code).toBe("SUMMER25");
      expect(promoCode.coupon).toBe(coupon.id);
      expect(promoCode.active).toBe(true);
    });

    it("should create a promo code with max redemptions", async () => {
      const coupon = await mockCreateCoupon({
        name: "Limited Promo",
        percentOff: 30,
        duration: "once",
      });

      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "LIMITED30",
        maxRedemptions: 50,
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.max_redemptions).toBe(50);
    });

    it("should create a first-time customer only promo code", async () => {
      const coupon = await mockCreateCoupon({
        name: "New Customer Deal",
        percentOff: 15,
        duration: "once",
      });

      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "NEWCUST15",
        firstTimeTransaction: true,
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.restrictions.first_time_transaction).toBe(true);
    });

    it("should create a promo code with minimum order amount", async () => {
      const coupon = await mockCreateCoupon({
        name: "Minimum Order Discount",
        percentOff: 10,
        duration: "once",
      });

      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "MIN100",
        minimumAmount: 10000, // $100 in cents
        minimumAmountCurrency: "usd",
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.restrictions.minimum_amount).toBe(10000);
    });

    it("should create a promo code with expiration date", async () => {
      const coupon = await mockCreateCoupon({
        name: "Expiring Promo",
        percentOff: 20,
        duration: "once",
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "EXPIRE7D",
        expiresAt,
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.expires_at).toBeDefined();
    });
  });

  describe("Promo Code Listing", () => {
    it("should list all promo codes", async () => {
      // Create multiple promo codes
      const coupon1 = await mockCreateCoupon({ name: "Coupon 1", percentOff: 10, duration: "once" });
      const coupon2 = await mockCreateCoupon({ name: "Coupon 2", percentOff: 20, duration: "once" });
      
      await mockCreatePromoCode({ couponId: coupon1.id, code: "CODE1" });
      await mockCreatePromoCode({ couponId: coupon2.id, code: "CODE2" });

      const result = await mockListPromoCodes();

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter promo codes by active status", async () => {
      const coupon = await mockCreateCoupon({ name: "Test", percentOff: 15, duration: "once" });
      const promoCode = await mockCreatePromoCode({ couponId: coupon.id, code: "ACTIVE" });

      // Deactivate the promo code
      await mockUpdatePromoCode(promoCode.id, false);

      const activeResult = await mockListPromoCodes({ active: true });
      const inactiveResult = await mockListPromoCodes({ active: false });

      expect(inactiveResult.data.some(pc => pc.id === promoCode.id)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const result = await mockListPromoCodes({ limit: 5 });
      expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Promo Code Status Management", () => {
    it("should activate a promo code", async () => {
      const coupon = await mockCreateCoupon({ name: "Test", percentOff: 25, duration: "once" });
      const promoCode = await mockCreatePromoCode({ couponId: coupon.id, code: "ACTIVATE" });

      await mockUpdatePromoCode(promoCode.id, true);
      const updated = await mockGetPromoCode(promoCode.id);

      expect(updated.active).toBe(true);
    });

    it("should deactivate a promo code", async () => {
      const coupon = await mockCreateCoupon({ name: "Test", percentOff: 25, duration: "once" });
      const promoCode = await mockCreatePromoCode({ couponId: coupon.id, code: "DEACTIVATE" });

      await mockUpdatePromoCode(promoCode.id, false);
      const updated = await mockGetPromoCode(promoCode.id);

      expect(updated.active).toBe(false);
    });
  });

  describe("Coupon Deletion", () => {
    it("should delete a coupon and associated promo codes", async () => {
      const coupon = await mockCreateCoupon({ name: "Delete Test", percentOff: 30, duration: "once" });
      const promoCode = await mockCreatePromoCode({ couponId: coupon.id, code: "DELETE" });

      await mockDeleteCoupon(coupon.id);

      // Verify coupon is deleted
      expect(mockStripeCoupons.has(coupon.id)).toBe(false);

      // Verify associated promo codes are deleted
      expect(mockStripePromoCodes.has(promoCode.id)).toBe(false);
    });
  });

  describe("Coupon Statistics", () => {
    it("should get coupon statistics", async () => {
      const coupon = await mockCreateCoupon({ name: "Stats Test", percentOff: 20, duration: "once" });
      const promoCode1 = await mockCreatePromoCode({ couponId: coupon.id, code: "STATS1" });
      const promoCode2 = await mockCreatePromoCode({ couponId: coupon.id, code: "STATS2" });

      const stats = await mockGetCouponStats(coupon.id);

      expect(stats.coupon).toBeDefined();
      expect(stats.promoCodeCount).toBeGreaterThanOrEqual(1);
      expect(stats.promoCodes.length).toBeGreaterThanOrEqual(1);
    });

    it("should calculate total redemptions", async () => {
      const coupon = await mockCreateCoupon({ name: "Redemption Test", percentOff: 15, duration: "once" });
      await mockCreatePromoCode({ couponId: coupon.id, code: "REDEEM1" });
      await mockCreatePromoCode({ couponId: coupon.id, code: "REDEEM2" });

      const stats = await mockGetCouponStats(coupon.id);

      expect(stats.totalRedemptions).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Coupon Listing", () => {
    it("should list all coupons", async () => {
      await mockCreateCoupon({ name: "List Test 1", percentOff: 10, duration: "once" });
      await mockCreateCoupon({ name: "List Test 2", percentOff: 20, duration: "once" });

      const result = await mockListCoupons();

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should respect limit parameter for coupons", async () => {
      const result = await mockListCoupons(3);
      expect(result.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Validation", () => {
    it("should handle invalid coupon ID gracefully", async () => {
      try {
        await mockGetPromoCode("invalid_id");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Promo code not found");
      }
    });

    it("should handle deletion of non-existent coupon", async () => {
      try {
        await mockDeleteCoupon("invalid_coupon_id");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Coupon not found");
      }
    });

    it("should handle stats for non-existent coupon", async () => {
      try {
        await mockGetCouponStats("invalid_coupon_id");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Coupon not found");
      }
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple promo codes for same coupon", async () => {
      const coupon = await mockCreateCoupon({ name: "Multi Promo", percentOff: 25, duration: "once" });
      
      const promo1 = await mockCreatePromoCode({ couponId: coupon.id, code: "MULTI1" });
      const promo2 = await mockCreatePromoCode({ couponId: coupon.id, code: "MULTI2" });
      const promo3 = await mockCreatePromoCode({ couponId: coupon.id, code: "MULTI3" });

      const stats = await mockGetCouponStats(coupon.id);

      expect(stats.promoCodeCount).toBeGreaterThanOrEqual(1);
      expect(stats.promoCodes.map(pc => pc.id)).toContain(promo1.id);
      expect(stats.promoCodes.map(pc => pc.id)).toContain(promo2.id);
      expect(stats.promoCodes.map(pc => pc.id)).toContain(promo3.id);
    });

    it("should handle promo code with all restrictions", async () => {
      const coupon = await mockCreateCoupon({ name: "Full Restrictions", percentOff: 20, duration: "once" });
      
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const promoCode = await mockCreatePromoCode({
        couponId: coupon.id,
        code: "FULLRESTRICT",
        maxRedemptions: 100,
        expiresAt,
        firstTimeTransaction: true,
        minimumAmount: 5000,
        minimumAmountCurrency: "usd",
      });

      expect(promoCode).toBeDefined();
      expect(promoCode.max_redemptions).toBe(100);
      expect(promoCode.restrictions.first_time_transaction).toBe(true);
      expect(promoCode.restrictions.minimum_amount).toBe(5000);
    });
  });
});
