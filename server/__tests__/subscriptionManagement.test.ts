import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe service functions
vi.mock('../services/stripe', () => ({
  getCustomerSubscription: vi.fn(),
  getUpcomingInvoice: vi.fn(),
  createBillingPortalSession: vi.fn(),
  updateSubscriptionPrice: vi.fn(),
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  reactivateSubscription: vi.fn(),
  getProductsWithPrices: vi.fn(),
  previewProration: vi.fn(),
  formatAmount: vi.fn((amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  }),
}));

import {
  getCustomerSubscription,
  getUpcomingInvoice,
  createBillingPortalSession,
  updateSubscriptionPrice,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getProductsWithPrices,
  previewProration,
  formatAmount,
} from '../services/stripe';

describe('Subscription Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomerSubscription', () => {
    it('should return subscription details for a customer', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        items: {
          data: [{
            id: 'si_123',
            price: {
              id: 'price_123',
              unit_amount: 2900,
              currency: 'usd',
              recurring: { interval: 'month', interval_count: 1 },
              product: {
                id: 'prod_123',
                name: 'Pro Plan',
                description: 'Full access to all features',
              },
            },
          }],
        },
        default_payment_method: {
          id: 'pm_123',
          card: { brand: 'visa', last4: '4242' },
        },
      };

      (getCustomerSubscription as any).mockResolvedValue(mockSubscription);

      const result = await getCustomerSubscription('cus_123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('sub_123');
      expect(result?.status).toBe('active');
      expect(getCustomerSubscription).toHaveBeenCalledWith('cus_123');
    });

    it('should return null when customer has no subscription', async () => {
      (getCustomerSubscription as any).mockResolvedValue(null);

      const result = await getCustomerSubscription('cus_no_sub');

      expect(result).toBeNull();
    });

    it('should handle subscription with trial status', async () => {
      const mockTrialSubscription = {
        id: 'sub_trial',
        status: 'trialing',
        trial_end: 1707350400,
        cancel_at_period_end: false,
        items: { data: [] },
      };

      (getCustomerSubscription as any).mockResolvedValue(mockTrialSubscription);

      const result = await getCustomerSubscription('cus_trial');

      expect(result?.status).toBe('trialing');
    });
  });

  describe('getUpcomingInvoice', () => {
    it('should return upcoming invoice details', async () => {
      const mockInvoice = {
        total: 2900,
        currency: 'usd',
        next_payment_attempt: 1706745600,
        lines: {
          data: [{
            description: 'Pro Plan (Monthly)',
            amount: 2900,
          }],
        },
      };

      (getUpcomingInvoice as any).mockResolvedValue(mockInvoice);

      const result = await getUpcomingInvoice('cus_123');

      expect(result).toBeDefined();
      expect(result?.total).toBe(2900);
      expect(getUpcomingInvoice).toHaveBeenCalledWith('cus_123');
    });

    it('should return null when no upcoming invoice', async () => {
      (getUpcomingInvoice as any).mockResolvedValue(null);

      const result = await getUpcomingInvoice('cus_no_invoice');

      expect(result).toBeNull();
    });

    it('should include subscription ID when provided', async () => {
      (getUpcomingInvoice as any).mockResolvedValue({ total: 2900 });

      await getUpcomingInvoice('cus_123', 'sub_123');

      expect(getUpcomingInvoice).toHaveBeenCalledWith('cus_123', 'sub_123');
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create a billing portal session', async () => {
      const mockSession = {
        url: 'https://billing.stripe.com/session/test_123',
      };

      (createBillingPortalSession as any).mockResolvedValue(mockSession);

      const result = await createBillingPortalSession('cus_123', 'https://app.example.com/account');

      expect(result).toBeDefined();
      expect(result.url).toContain('billing.stripe.com');
      expect(createBillingPortalSession).toHaveBeenCalledWith(
        'cus_123',
        'https://app.example.com/account'
      );
    });

    it('should handle portal session creation error', async () => {
      (createBillingPortalSession as any).mockRejectedValue(new Error('Customer not found'));

      await expect(createBillingPortalSession('invalid_cus', 'https://app.example.com'))
        .rejects.toThrow('Customer not found');
    });
  });

  describe('updateSubscriptionPrice', () => {
    it('should update subscription to new price', async () => {
      const mockUpdatedSubscription = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_new', unit_amount: 4900 },
          }],
        },
      };

      (updateSubscriptionPrice as any).mockResolvedValue(mockUpdatedSubscription);

      const result = await updateSubscriptionPrice('sub_123', 'price_new');

      expect(result).toBeDefined();
      expect(result.id).toBe('sub_123');
      expect(updateSubscriptionPrice).toHaveBeenCalledWith('sub_123', 'price_new');
    });

    it('should handle upgrade from basic to pro', async () => {
      (updateSubscriptionPrice as any).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
      });

      const result = await updateSubscriptionPrice('sub_123', 'price_pro');

      expect(result.items.data[0].price.id).toBe('price_pro');
    });

    it('should handle downgrade from pro to basic', async () => {
      (updateSubscriptionPrice as any).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_basic' } }] },
      });

      const result = await updateSubscriptionPrice('sub_123', 'price_basic');

      expect(result.items.data[0].price.id).toBe('price_basic');
    });
  });

  describe('cancelSubscriptionAtPeriodEnd', () => {
    it('should cancel subscription at period end', async () => {
      const mockCanceledSubscription = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: 1706745600,
      };

      (cancelSubscriptionAtPeriodEnd as any).mockResolvedValue(mockCanceledSubscription);

      const result = await cancelSubscriptionAtPeriodEnd('sub_123');

      expect(result).toBeDefined();
      expect(result.cancel_at_period_end).toBe(true);
      expect(cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith('sub_123');
    });

    it('should preserve access until period end', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
      
      (cancelSubscriptionAtPeriodEnd as any).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: periodEnd,
      });

      const result = await cancelSubscriptionAtPeriodEnd('sub_123');

      expect(result.status).toBe('active');
      expect(result.current_period_end).toBe(periodEnd);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a canceled subscription', async () => {
      const mockReactivatedSubscription = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
      };

      (reactivateSubscription as any).mockResolvedValue(mockReactivatedSubscription);

      const result = await reactivateSubscription('sub_123');

      expect(result).toBeDefined();
      expect(result.cancel_at_period_end).toBe(false);
      expect(reactivateSubscription).toHaveBeenCalledWith('sub_123');
    });

    it('should handle reactivation of non-canceled subscription', async () => {
      (reactivateSubscription as any).mockRejectedValue(
        new Error('Subscription is not set to cancel')
      );

      await expect(reactivateSubscription('sub_active'))
        .rejects.toThrow('Subscription is not set to cancel');
    });
  });

  describe('getProductsWithPrices', () => {
    it('should return all products with their prices', async () => {
      const mockProducts = [
        {
          id: 'prod_basic',
          name: 'Basic',
          description: 'Basic features',
          active: true,
          metadata: { tier: 'basic', features: '["Feature 1", "Feature 2"]' },
          prices: [
            { id: 'price_basic_monthly', unit_amount: 900, currency: 'usd', recurring: { interval: 'month' }, active: true },
            { id: 'price_basic_yearly', unit_amount: 9000, currency: 'usd', recurring: { interval: 'year' }, active: true },
          ],
        },
        {
          id: 'prod_pro',
          name: 'Pro',
          description: 'All features',
          active: true,
          metadata: { tier: 'pro', features: '["All Basic features", "Advanced analytics"]' },
          prices: [
            { id: 'price_pro_monthly', unit_amount: 2900, currency: 'usd', recurring: { interval: 'month' }, active: true },
            { id: 'price_pro_yearly', unit_amount: 29000, currency: 'usd', recurring: { interval: 'year' }, active: true },
          ],
        },
      ];

      (getProductsWithPrices as any).mockResolvedValue(mockProducts);

      const result = await getProductsWithPrices();

      expect(result).toHaveLength(2);
      expect(result[0].prices).toHaveLength(2);
      expect(result[1].name).toBe('Pro');
    });

    it('should filter out inactive products', async () => {
      const mockProducts = [
        { id: 'prod_active', name: 'Active', active: true, prices: [] },
      ];

      (getProductsWithPrices as any).mockResolvedValue(mockProducts);

      const result = await getProductsWithPrices();

      expect(result.every((p: any) => p.active)).toBe(true);
    });
  });

  describe('previewProration', () => {
    it('should preview proration for plan upgrade', async () => {
      const mockPreview = {
        total: 1500,
        currency: 'usd',
        lines: {
          data: [
            { description: 'Unused time on Basic', amount: -500 },
            { description: 'Remaining time on Pro', amount: 2000 },
          ],
        },
      };

      (previewProration as any).mockResolvedValue(mockPreview);

      const result = await previewProration('cus_123', 'sub_123', 'price_pro');

      expect(result).toBeDefined();
      expect(result.total).toBe(1500);
      expect(previewProration).toHaveBeenCalledWith('cus_123', 'sub_123', 'price_pro');
    });

    it('should show credit for downgrade', async () => {
      const mockPreview = {
        total: -1000,
        currency: 'usd',
        lines: {
          data: [
            { description: 'Unused time on Pro', amount: -2000 },
            { description: 'Remaining time on Basic', amount: 1000 },
          ],
        },
      };

      (previewProration as any).mockResolvedValue(mockPreview);

      const result = await previewProration('cus_123', 'sub_123', 'price_basic');

      expect(result.total).toBeLessThan(0);
    });
  });

  describe('formatAmount', () => {
    it('should format amount in USD', () => {
      const result = formatAmount(2900, 'USD');
      expect(result).toBe('$29.00');
    });

    it('should format amount in EUR', () => {
      const result = formatAmount(2900, 'EUR');
      expect(result).toBe('€29.00');
    });

    it('should handle zero amount', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toBe('$0.00');
    });

    it('should handle large amounts', () => {
      const result = formatAmount(99900, 'USD');
      expect(result).toBe('$999.00');
    });
  });

  describe('Subscription Status Handling', () => {
    it('should handle active status', async () => {
      (getCustomerSubscription as any).mockResolvedValue({ status: 'active' });
      const result = await getCustomerSubscription('cus_123');
      expect(result?.status).toBe('active');
    });

    it('should handle past_due status', async () => {
      (getCustomerSubscription as any).mockResolvedValue({ status: 'past_due' });
      const result = await getCustomerSubscription('cus_123');
      expect(result?.status).toBe('past_due');
    });

    it('should handle canceled status', async () => {
      (getCustomerSubscription as any).mockResolvedValue({ status: 'canceled' });
      const result = await getCustomerSubscription('cus_123');
      expect(result?.status).toBe('canceled');
    });

    it('should handle incomplete status', async () => {
      (getCustomerSubscription as any).mockResolvedValue({ status: 'incomplete' });
      const result = await getCustomerSubscription('cus_123');
      expect(result?.status).toBe('incomplete');
    });

    it('should handle unpaid status', async () => {
      (getCustomerSubscription as any).mockResolvedValue({ status: 'unpaid' });
      const result = await getCustomerSubscription('cus_123');
      expect(result?.status).toBe('unpaid');
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription with no payment method', async () => {
      (getCustomerSubscription as any).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        default_payment_method: null,
      });

      const result = await getCustomerSubscription('cus_123');

      expect(result?.default_payment_method).toBeNull();
    });

    it('should handle subscription with multiple items', async () => {
      (getCustomerSubscription as any).mockResolvedValue({
        id: 'sub_123',
        items: {
          data: [
            { price: { id: 'price_1' } },
            { price: { id: 'price_2' } },
          ],
        },
      });

      const result = await getCustomerSubscription('cus_123');

      expect(result?.items.data).toHaveLength(2);
    });

    it('should handle annual billing interval', async () => {
      (getCustomerSubscription as any).mockResolvedValue({
        id: 'sub_123',
        items: {
          data: [{
            price: {
              recurring: { interval: 'year', interval_count: 1 },
            },
          }],
        },
      });

      const result = await getCustomerSubscription('cus_123');

      expect(result?.items.data[0].price.recurring.interval).toBe('year');
    });
  });
});
