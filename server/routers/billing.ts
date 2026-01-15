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
  getCustomerSubscription,
  getUpcomingInvoice,
  createBillingPortalSession,
  updateSubscriptionPrice,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getProductsWithPrices,
  previewProration,
  getStripeInvoice,
} from "../services/stripe";
import { generateInvoicePdf, stripeInvoiceToInvoiceData } from "../services/invoicePdf";
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

  // ==================== Subscription Management ====================

  /**
   * Get current subscription details
   */
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user.paymentMethodId) {
        return {
          success: true,
          subscription: null,
          message: "No subscription found",
        };
      }

      const subscription = await getCustomerSubscription(ctx.user.paymentMethodId);

      if (!subscription) {
        return {
          success: true,
          subscription: null,
          message: "No active subscription",
        };
      }

      // Extract product info from subscription items
      const item = subscription.items.data[0];
      const price = item?.price;
      const product = price?.product as any;

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
          plan: {
            id: price?.id || "",
            productId: product?.id || "",
            name: product?.name || "Unknown Plan",
            description: product?.description || "",
            amount: price?.unit_amount || 0,
            currency: price?.currency?.toUpperCase() || "USD",
            interval: price?.recurring?.interval || "month",
            intervalCount: price?.recurring?.interval_count || 1,
            formattedAmount: formatAmount(price?.unit_amount || 0, price?.currency || "usd"),
          },
          defaultPaymentMethod: subscription.default_payment_method
            ? {
                id: (subscription.default_payment_method as any).id,
                brand: (subscription.default_payment_method as any).card?.brand,
                last4: (subscription.default_payment_method as any).card?.last4,
              }
            : null,
        },
      };
    } catch (error) {
      console.error("[Billing] Error getting subscription:", error);
      return {
        success: false,
        error: "Failed to get subscription details",
        subscription: null,
      };
    }
  }),

  /**
   * Get upcoming invoice
   */
  getUpcomingInvoice: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user.paymentMethodId) {
        return {
          success: true,
          upcomingInvoice: null,
        };
      }

      const invoice = await getUpcomingInvoice(ctx.user.paymentMethodId);

      if (!invoice) {
        return {
          success: true,
          upcomingInvoice: null,
        };
      }

      return {
        success: true,
        upcomingInvoice: {
          amount: invoice.total || 0,
          currency: (invoice.currency || "usd").toUpperCase(),
          formattedAmount: formatAmount(invoice.total || 0, invoice.currency || "usd"),
          dueDate: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : null,
          lineItems: invoice.lines?.data?.map((line: any) => ({
            description: line.description || "",
            amount: line.amount || 0,
            formattedAmount: formatAmount(line.amount || 0, invoice.currency || "usd"),
          })) || [],
        },
      };
    } catch (error) {
      console.error("[Billing] Error getting upcoming invoice:", error);
      return {
        success: false,
        error: "Failed to get upcoming invoice",
        upcomingInvoice: null,
      };
    }
  }),

  /**
   * Get available plans from Stripe
   */
  getAvailablePlans: protectedProcedure.query(async () => {
    try {
      const products = await getProductsWithPrices();

      const plans = products
        .filter((product) => product.active)
        .map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description || "",
          features: product.metadata?.features
            ? JSON.parse(product.metadata.features)
            : [],
          prices: product.prices
            .filter((price) => price.active)
            .map((price) => ({
              id: price.id,
              amount: price.unit_amount || 0,
              currency: (price.currency || "usd").toUpperCase(),
              interval: price.recurring?.interval || "month",
              intervalCount: price.recurring?.interval_count || 1,
              formattedAmount: formatAmount(
                price.unit_amount || 0,
                price.currency || "usd"
              ),
            }))
            .sort((a, b) => a.amount - b.amount),
          metadata: product.metadata || {},
        }))
        .sort((a, b) => {
          // Sort by tier order if available in metadata
          const tierOrder: Record<string, number> = { free: 0, basic: 1, pro: 2, enterprise: 3 };
          const tierA = a.metadata?.tier || "basic";
          const tierB = b.metadata?.tier || "basic";
          return (tierOrder[tierA] || 1) - (tierOrder[tierB] || 1);
        });

      return {
        success: true,
        plans,
      };
    } catch (error) {
      console.error("[Billing] Error getting available plans:", error);
      return {
        success: false,
        error: "Failed to get available plans",
        plans: [],
      };
    }
  }),

  /**
   * Create billing portal session
   */
  createBillingPortal: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user.paymentMethodId) {
        throw new Error("No Stripe customer found");
      }

      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const session = await createBillingPortalSession(
        ctx.user.paymentMethodId,
        `${origin}/account`
      );

      return {
        success: true,
        url: session.url,
      };
    } catch (error) {
      console.error("[Billing] Error creating billing portal:", error);
      return {
        success: false,
        error: "Failed to create billing portal session",
        url: "",
      };
    }
  }),

  /**
   * Preview proration for plan change
   */
  previewPlanChange: protectedProcedure
    .input(z.object({ newPriceId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user.paymentMethodId) {
          throw new Error("No Stripe customer found");
        }

        const subscription = await getCustomerSubscription(ctx.user.paymentMethodId);
        if (!subscription) {
          throw new Error("No active subscription");
        }

        const preview = await previewProration(
          ctx.user.paymentMethodId,
          subscription.id,
          input.newPriceId
        );

        return {
          success: true,
          preview: {
            immediateCharge: preview.total || 0,
            formattedCharge: formatAmount(preview.total || 0, preview.currency || "usd"),
            lineItems: preview.lines?.data?.map((line: any) => ({
              description: line.description || "",
              amount: line.amount || 0,
              formattedAmount: formatAmount(line.amount || 0, preview.currency || "usd"),
            })) || [],
          },
        };
      } catch (error) {
        console.error("[Billing] Error previewing plan change:", error);
        return {
          success: false,
          error: "Failed to preview plan change",
          preview: null,
        };
      }
    }),

  /**
   * Change subscription plan
   */
  changePlan: protectedProcedure
    .input(z.object({ newPriceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.paymentMethodId) {
          throw new Error("No Stripe customer found");
        }

        const subscription = await getCustomerSubscription(ctx.user.paymentMethodId);
        if (!subscription) {
          throw new Error("No active subscription");
        }

        const updatedSubscription = await updateSubscriptionPrice(
          subscription.id,
          input.newPriceId
        );

        return {
          success: true,
          message: "Subscription updated successfully",
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
          },
        };
      } catch (error) {
        console.error("[Billing] Error changing plan:", error);
        return {
          success: false,
          error: "Failed to change plan",
        };
      }
    }),

  /**
   * Cancel subscription at period end
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user.paymentMethodId) {
        throw new Error("No Stripe customer found");
      }

      const subscription = await getCustomerSubscription(ctx.user.paymentMethodId);
      if (!subscription) {
        throw new Error("No active subscription");
      }

      const canceledSubscription = await cancelSubscriptionAtPeriodEnd(subscription.id);

      return {
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        cancelAt: (canceledSubscription as any).current_period_end
          ? new Date((canceledSubscription as any).current_period_end * 1000)
          : null,
      };
    } catch (error) {
      console.error("[Billing] Error canceling subscription:", error);
      return {
        success: false,
        error: "Failed to cancel subscription",
      };
    }
  }),

  /**
   * Reactivate canceled subscription
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user.paymentMethodId) {
        throw new Error("No Stripe customer found");
      }

      const subscription = await getCustomerSubscription(ctx.user.paymentMethodId);
      if (!subscription) {
        throw new Error("No subscription found");
      }

      if (!subscription.cancel_at_period_end) {
        throw new Error("Subscription is not set to cancel");
      }

      const reactivatedSubscription = await reactivateSubscription(subscription.id);

      return {
        success: true,
        message: "Subscription reactivated successfully",
        subscription: {
          id: reactivatedSubscription.id,
          status: reactivatedSubscription.status,
        },
      };
    } catch (error) {
      console.error("[Billing] Error reactivating subscription:", error);
      return {
        success: false,
        error: "Failed to reactivate subscription",
      };
    }
  }),

  /**
   * Generate branded PDF invoice
   * Security: Validates invoice ID format, verifies ownership, rate-limited by tRPC
   */
  generateInvoicePdf: protectedProcedure
    .input(z.object({ 
      invoiceId: z.string()
        .min(1, "Invoice ID is required")
        .max(100, "Invoice ID too long")
        .regex(/^in_[a-zA-Z0-9]+$/, "Invalid invoice ID format")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Security: Log access attempt for audit trail
        console.log(`[Security] Invoice PDF request: user=${ctx.user.id}, invoice=${input.invoiceId}`);
        
        // Get the Stripe invoice
        const stripeInvoice = await getStripeInvoice(input.invoiceId);
        
        if (!stripeInvoice) {
          // Security: Don't reveal if invoice exists for other users
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found or access denied",
          });
        }

        // Security: Verify the invoice belongs to this user's customer
        const customerId = typeof stripeInvoice.customer === 'string' 
          ? stripeInvoice.customer 
          : stripeInvoice.customer?.id;
          
        if (!ctx.user.paymentMethodId || customerId !== ctx.user.paymentMethodId) {
          // Security: Log unauthorized access attempt
          console.warn(`[Security] Unauthorized invoice access attempt: user=${ctx.user.id}, invoice=${input.invoiceId}`);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invoice not found or access denied",
          });
        }

        // Company info for the invoice
        const companyInfo = {
          name: "Lead Discovery AI",
          address: "123 Innovation Drive\nSan Francisco, CA 94102\nUnited States",
          email: "billing@leaddiscovery.ai",
          phone: "+1 (555) 123-4567",
          website: "https://leaddiscovery.ai",
          taxId: "US-123456789",
        };

        // Convert Stripe invoice to our format
        const invoiceData = stripeInvoiceToInvoiceData(stripeInvoice, companyInfo);

        // Generate PDF
        const pdfBuffer = await generateInvoicePdf(invoiceData);

        // Convert to base64 for transmission
        const pdfBase64 = pdfBuffer.toString("base64");

        return {
          success: true,
          pdf: pdfBase64,
          filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
          contentType: "application/pdf",
        };
      } catch (error) {
        console.error("[Billing] Error generating invoice PDF:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate invoice PDF",
        });
      }
    }),

  /**
   * Get test invoice PDF (for test mode)
   */
  getTestInvoicePdf: protectedProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if test mode is enabled
        const useTestData = ctx.user.useRealData !== 1;
        
        if (!useTestData) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Test invoices are only available in test mode",
          });
        }

        const { getTestData } = await import("../services/testData");
        const testData = getTestData();
        const testInvoice = testData.invoices.find(inv => inv.id === input.invoiceId);

        if (!testInvoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Test invoice not found",
          });
        }

        // Company info for the invoice
        const companyInfo = {
          name: "Lead Discovery AI",
          address: "123 Innovation Drive\nSan Francisco, CA 94102\nUnited States",
          email: "billing@leaddiscovery.ai",
          phone: "+1 (555) 123-4567",
          website: "https://leaddiscovery.ai",
          taxId: "US-123456789",
        };

        // Convert test invoice to our format
        const invoiceData = {
          invoiceNumber: testInvoice.invoiceNumber,
          invoiceDate: testInvoice.createdAt,
          dueDate: testInvoice.dueDate,
          status: testInvoice.status as 'paid' | 'open' | 'void' | 'uncollectible',
          
          companyName: companyInfo.name,
          companyAddress: companyInfo.address,
          companyEmail: companyInfo.email,
          companyPhone: companyInfo.phone,
          companyWebsite: companyInfo.website,
          companyTaxId: companyInfo.taxId,
          
          customerName: ctx.user.name || "Customer",
          customerEmail: ctx.user.email || "",
          
          lineItems: testInvoice.lineItems.map(item => ({
            description: item.description,
            quantity: 1,
            unitPrice: item.amount,
            amount: item.amount,
          })),
          
          subtotal: testInvoice.amount,
          total: testInvoice.amount,
          amountPaid: testInvoice.status === 'paid' ? testInvoice.amount : 0,
          amountDue: testInvoice.status === 'paid' ? 0 : testInvoice.amount,
          currency: testInvoice.currency,
          
          paymentDate: testInvoice.paidAt || undefined,
          transactionId: testInvoice.stripeInvoiceId,
          
          notes: "This is a test invoice generated for demonstration purposes.",
          terms: "Payment is due within 30 days of invoice date. Late payments may be subject to additional fees.",
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePdf(invoiceData);

        // Convert to base64 for transmission
        const pdfBase64 = pdfBuffer.toString("base64");

        return {
          success: true,
          pdf: pdfBase64,
          filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
          contentType: "application/pdf",
        };
      } catch (error) {
        console.error("[Billing] Error generating test invoice PDF:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate test invoice PDF",
        });
      }
    }),
});
