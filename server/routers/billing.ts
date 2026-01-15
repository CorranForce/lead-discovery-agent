import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserInvoices,
  getActiveSubscriptionPlans,
  updateUserStripeCustomerId,
  createInvoice,
  createPayment,
  getUserPayments,
  getTotalRevenue,
  getMonthlyRevenue,
  getSubscriptionCountsByTier,
  getRecentPayments,
  getRevenueByTier,
  getDailyRevenue,
  getBillingMetricsSummary,
} from "../db";
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  listCustomerInvoices,
  formatAmount,
  getInvoicePdfUrl,
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  setDefaultPaymentMethod,
} from "../services/stripe";
import { TRPCError } from "@trpc/server";

export const billingRouter = router({
  /**
   * Get user's invoices
   */
  getInvoices: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const invoices = await getUserInvoices(ctx.user.id, input?.limit || 50);
        return {
          success: true,
          invoices: invoices.map((inv) => ({
            id: inv.id,
            stripeInvoiceId: inv.stripeInvoiceId,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
            paidAt: inv.paidAt,
            dueDate: inv.dueDate,
            description: inv.description,
            downloadUrl: inv.downloadUrl,
            createdAt: inv.createdAt,
            formattedAmount: formatAmount(inv.amount, inv.currency),
          })),
        };
      } catch (error) {
        console.error("[Billing] Error fetching invoices:", error);
        return {
          success: false,
          error: "Failed to fetch invoices",
          invoices: [],
        };
      }
    }),

  /**
   * Get subscription plans
   */
  getSubscriptionPlans: protectedProcedure.query(async () => {
    try {
      const plans = await getActiveSubscriptionPlans();
      return {
        success: true,
        plans: plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          tier: plan.tier,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          features: plan.features ? JSON.parse(plan.features) : [],
          maxLeads: plan.maxLeads,
          maxEmails: plan.maxEmails,
          maxSequences: plan.maxSequences,
          formattedMonthlyPrice: formatAmount(plan.monthlyPrice),
          formattedYearlyPrice: formatAmount(plan.yearlyPrice),
        })),
      };
    } catch (error) {
      console.error("[Billing] Error fetching subscription plans:", error);
      return {
        success: false,
        error: "Failed to fetch subscription plans",
        plans: [],
      };
    }
  }),

  /**
   * Create checkout session for subscription
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get or create Stripe customer
        const customer = await getOrCreateStripeCustomer(
          ctx.user.id,
          ctx.user.email || "",
          ctx.user.name || undefined
        );

        // Update user with Stripe customer ID
        await updateUserStripeCustomerId(ctx.user.id, customer.id);

        // Get origin for redirect URLs
        const origin = process.env.VITE_APP_ID ? "https://manus.space" : "http://localhost:3000";

        // Create checkout session
        const session = await createCheckoutSession(
          customer.id,
          input.priceId,
          `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
          `${origin}/billing`,
          {
            userId: ctx.user.id.toString(),
            billingCycle: input.billingCycle,
          }
        );

        return {
          success: true,
          checkoutUrl: session.url || "",
          sessionId: session.id,
        };
      } catch (error) {
        console.error("[Billing] Error creating checkout session:", error);
        return {
          success: false,
          error: "Failed to create checkout session",
          checkoutUrl: "",
          sessionId: "",
        };
      }
    }),

  /**
   * Get user's payments
   */
  getPayments: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const payments = await getUserPayments(ctx.user.id, input?.limit || 50);
        return {
          success: true,
          payments: payments.map((payment) => ({
            id: payment.id,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethodType: payment.paymentMethodType,
            description: payment.description,
            createdAt: payment.createdAt,
            formattedAmount: formatAmount(payment.amount, payment.currency),
          })),
        };
      } catch (error) {
        console.error("[Billing] Error fetching payments:", error);
        return {
          success: false,
          error: "Failed to fetch payments",
          payments: [],
        };
      }
    }),

  /**
   * Sync invoices from Stripe
   */
  syncInvoices: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = ctx.user;

      // Check if user has Stripe customer ID
      if (!user.paymentMethodId) {
        return {
          success: false,
          error: "No Stripe customer found",
          synced: 0,
        };
      }

      // Fetch invoices from Stripe
      const stripeInvoices = await listCustomerInvoices(user.paymentMethodId, 100);

      let synced = 0;

      // Sync each invoice to database
      for (const stripeInvoice of stripeInvoices) {
        try {
          // Check if invoice already exists
          const existingInvoice = await getUserInvoices(user.id, 1);
          const invoiceExists = existingInvoice.some(
            (inv) => inv.stripeInvoiceId === stripeInvoice.id
          );

          if (!invoiceExists) {
            // Get PDF URL
            const pdfUrl = await getInvoicePdfUrl(stripeInvoice.id);

            // Create invoice record
            await createInvoice({
              userId: user.id,
              stripeInvoiceId: stripeInvoice.id,
              stripeCustomerId: user.paymentMethodId,
              amount: stripeInvoice.total || 0,
              currency: (stripeInvoice.currency || "usd").toUpperCase(),
              status: (stripeInvoice.status as any) || "open",
              paidAt: (stripeInvoice as any).paid_date
                ? new Date((stripeInvoice as any).paid_date * 1000)
                : null,
              dueDate: (stripeInvoice as any).due_date
                ? new Date((stripeInvoice as any).due_date * 1000)
                : null,
              description: stripeInvoice.description || "",
              receiptUrl: (stripeInvoice as any).receipt_url || "",
              downloadUrl: pdfUrl || "",
            });

            synced++;
          }
        } catch (error) {
          console.error("[Billing] Error syncing invoice:", error);
        }
      }

      return {
        success: true,
        synced,
        message: `Synced ${synced} new invoices from Stripe`,
      };
    } catch (error) {
      console.error("[Billing] Error syncing invoices:", error);
      return {
        success: false,
        error: "Failed to sync invoices",
        synced: 0,
      };
    }
  }),

  // ==================== Admin Billing Endpoints ====================

  /**
   * Get billing metrics summary (admin only)
   */
  getMetricsSummary: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    try {
      const summary = await getBillingMetricsSummary();
      return {
        success: true,
        metrics: summary,
      };
    } catch (error) {
      console.error("[Billing] Error fetching metrics summary:", error);
      return {
        success: false,
        error: "Failed to fetch metrics",
        metrics: null,
      };
    }
  }),

  /**
   * Get monthly revenue data (admin only)
   */
  getMonthlyRevenue: protectedProcedure
    .input(z.object({ months: z.number().default(12) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      try {
        const data = await getMonthlyRevenue(input?.months || 12);
        return {
          success: true,
          data: data.map((item) => ({
            month: item.month,
            revenue: item.revenue,
            count: item.count,
            formattedRevenue: formatAmount(item.revenue),
          })),
        };
      } catch (error) {
        console.error("[Billing] Error fetching monthly revenue:", error);
        return {
          success: false,
          error: "Failed to fetch monthly revenue",
          data: [],
        };
      }
    }),

  /**
   * Get daily revenue data (admin only)
   */
  getDailyRevenue: protectedProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      try {
        const data = await getDailyRevenue(input?.days || 30);
        return {
          success: true,
          data: data.map((item) => ({
            date: item.date,
            revenue: item.revenue,
            count: item.count,
            formattedRevenue: formatAmount(item.revenue),
          })),
        };
      } catch (error) {
        console.error("[Billing] Error fetching daily revenue:", error);
        return {
          success: false,
          error: "Failed to fetch daily revenue",
          data: [],
        };
      }
    }),

  /**
   * Get subscription counts by tier (admin only)
   */
  getSubscriptionCounts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    try {
      const counts = await getSubscriptionCountsByTier();
      return {
        success: true,
        counts,
      };
    } catch (error) {
      console.error("[Billing] Error fetching subscription counts:", error);
      return {
        success: false,
        error: "Failed to fetch subscription counts",
        counts: [],
      };
    }
  }),

  /**
   * Get recent payments (admin only)
   */
  getRecentPaymentsAdmin: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      try {
        const payments = await getRecentPayments(input?.limit || 20);
        return {
          success: true,
          payments: payments.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethodType: payment.paymentMethodType,
            description: payment.description,
            createdAt: payment.createdAt,
            userId: payment.userId,
            userName: payment.userName,
            userEmail: payment.userEmail,
            formattedAmount: formatAmount(payment.amount, payment.currency),
          })),
        };
      } catch (error) {
        console.error("[Billing] Error fetching recent payments:", error);
        return {
          success: false,
          error: "Failed to fetch recent payments",
          payments: [],
        };
      }
    }),

  /**
   * Get revenue by tier (admin only)
   */
  getRevenueByTier: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    try {
      const data = await getRevenueByTier();
      return {
        success: true,
        data: data.map((item) => ({
          tier: item.tier,
          revenue: item.revenue,
          count: item.count,
          formattedRevenue: formatAmount(item.revenue),
        })),
      };
    } catch (error) {
      console.error("[Billing] Error fetching revenue by tier:", error);
      return {
        success: false,
        error: "Failed to fetch revenue by tier",
        data: [],
      };
    }
  }),

  // ==================== Payment Methods Endpoints ====================

  /**
   * Create SetupIntent for adding a new payment method
   */
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Get or create Stripe customer
      const customer = await getOrCreateStripeCustomer(
        ctx.user.id,
        ctx.user.email || "",
        ctx.user.name || undefined
      );

      // Update user with Stripe customer ID
      await updateUserStripeCustomerId(ctx.user.id, customer.id);

      // Create SetupIntent
      const setupIntent = await createSetupIntent(customer.id);

      return {
        success: true,
        clientSecret: setupIntent.client_secret || "",
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      console.error("[Billing] Error creating SetupIntent:", error);
      return {
        success: false,
        error: "Failed to create SetupIntent",
        clientSecret: "",
        setupIntentId: "",
      };
    }
  }),

  /**
   * List user's payment methods
   */
  listPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check if user has Stripe customer ID
      if (!ctx.user.paymentMethodId) {
        return {
          success: true,
          paymentMethods: [],
          defaultPaymentMethodId: null,
        };
      }

      const { paymentMethods, defaultPaymentMethodId } = await listPaymentMethods(
        ctx.user.paymentMethodId
      );

      return {
        success: true,
        paymentMethods: paymentMethods.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card
            ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              }
            : null,
          isDefault: pm.id === defaultPaymentMethodId,
        })),
        defaultPaymentMethodId,
      };
    } catch (error) {
      console.error("[Billing] Error listing payment methods:", error);
      return {
        success: false,
        error: "Failed to list payment methods",
        paymentMethods: [],
        defaultPaymentMethodId: null,
      };
    }
  }),

  /**
   * Delete a payment method
   */
  deletePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await detachPaymentMethod(input.paymentMethodId);
        return {
          success: true,
          message: "Payment method deleted successfully",
        };
      } catch (error) {
        console.error("[Billing] Error deleting payment method:", error);
        return {
          success: false,
          error: "Failed to delete payment method",
        };
      }
    }),

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.paymentMethodId) {
          throw new Error("No Stripe customer found");
        }

        await setDefaultPaymentMethod(
          ctx.user.paymentMethodId,
          input.paymentMethodId
        );

        return {
          success: true,
          message: "Default payment method updated",
        };
      } catch (error) {
        console.error("[Billing] Error setting default payment method:", error);
        return {
          success: false,
          error: "Failed to set default payment method",
        };
      }
    }),
});
