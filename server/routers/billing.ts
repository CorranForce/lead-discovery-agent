import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserInvoices,
  getActiveSubscriptionPlans,
  updateUserStripeCustomerId,
  createInvoice,
  createPayment,
  getUserPayments,
} from "../db";
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  listCustomerInvoices,
  formatAmount,
  getInvoicePdfUrl,
} from "../services/stripe";

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
});
