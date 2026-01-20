import { Request, Response } from "express";
import Stripe from "stripe";
import {
  createInvoice,
  createPayment,
  getInvoiceByStripeId,
  updateInvoice,
  getPaymentByStripeId,
  updatePayment,
  updateUserBilling,
  getDb,
} from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Verify Stripe webhook signature
 * Security: Uses Stripe's cryptographic signature verification
 */
function verifyWebhookSignature(
  body: string | Buffer,
  signature: string
): Stripe.Event | null {
  // Security: Validate inputs
  if (!signature || typeof signature !== 'string') {
    console.error("[Security] Webhook missing signature header");
    return null;
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Security] STRIPE_WEBHOOK_SECRET not configured");
    return null;
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Security: Log successful verification for audit trail
    console.log(`[Security] Webhook verified: type=${event.type}, id=${event.id}`);
    
    return event;
  } catch (error) {
    // Security: Log failed verification attempts
    console.error("[Security] Webhook signature verification failed:", error);
    return null;
  }
}

/**
 * Get user by Stripe customer ID
 */
async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.paymentMethodId, stripeCustomerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Handle checkout.session.completed event
 * Triggered when a customer completes a checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe Webhook] Checkout session completed:", session.id);

  const customerId = session.customer as string;
  const metadata = session.metadata || {};
  const userId = metadata.userId ? parseInt(metadata.userId) : null;
  const billingCycle = metadata.billingCycle as "monthly" | "yearly" | undefined;

  if (!userId) {
    console.error("[Stripe Webhook] No userId in checkout session metadata");
    return;
  }

  // Update user subscription based on the checkout
  if (session.mode === "subscription" && session.subscription) {
    try {
      // Retrieve subscription details
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      // Determine subscription tier from price metadata or product
      let subscriptionTier: "free" | "basic" | "pro" | "enterprise" = "basic";
      if (subscription.items.data.length > 0) {
        const priceId = subscription.items.data[0].price.id;
        // Map price ID to tier (you can customize this mapping)
        if (priceId.includes("pro")) subscriptionTier = "pro";
        else if (priceId.includes("enterprise")) subscriptionTier = "enterprise";
        else if (priceId.includes("basic")) subscriptionTier = "basic";
      }

      // Update user billing information
      await updateUserBilling(userId, {
        subscriptionTier,
        billingCycle: billingCycle || "monthly",
        nextBillingDate: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null,
      });

      console.log(
        `[Stripe Webhook] Updated user ${userId} subscription to ${subscriptionTier}`
      );
    } catch (error) {
      console.error("[Stripe Webhook] Error updating subscription:", error);
    }
  }
}

/**
 * Handle payment_intent.succeeded event
 * Triggered when a payment is successfully completed
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe Webhook] Payment intent succeeded:", paymentIntent.id);

  const customerId = paymentIntent.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(
      "[Stripe Webhook] No user found for customer:",
      customerId
    );
    return;
  }

  // Check if payment already exists
  const existingPayment = await getPaymentByStripeId(paymentIntent.id);
  if (existingPayment) {
    // Update existing payment
    await updatePayment(existingPayment.id, {
      status: "succeeded",
    });
    console.log(`[Stripe Webhook] Updated payment ${existingPayment.id} to succeeded`);
  } else {
    // Create new payment record
    try {
      await createPayment({
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: "succeeded",
        paymentMethodType: paymentIntent.payment_method_types?.[0] || "card",
        description: paymentIntent.description || "Payment",
      });
      console.log(`[Stripe Webhook] Created payment record for ${paymentIntent.id}`);
      
      // Send payment confirmation email
      if (user.email) {
        try {
          const { sendPaymentConfirmationEmail } = await import("../services/email");
          await sendPaymentConfirmationEmail(
            user.email,
            user.name || "there",
            paymentIntent.amount / 100,
            paymentIntent.description || "Payment",
            (paymentIntent as any).charges?.data?.[0]?.receipt_url || undefined
          );
          console.log("[Stripe Webhook] Payment confirmation email sent to", user.email);
        } catch (emailError) {
          console.error("[Stripe Webhook] Failed to send payment confirmation email:", emailError);
        }
      }
    } catch (error) {
      console.error("[Stripe Webhook] Error creating payment:", error);
    }
  }
}

/**
 * Handle invoice.paid event
 * Triggered when an invoice is successfully paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Stripe Webhook] Invoice paid:", invoice.id);

  const customerId = invoice.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error("[Stripe Webhook] No user found for customer:", customerId);
    return;
  }

  // Check if invoice already exists
  const existingInvoice = await getInvoiceByStripeId(invoice.id);
  if (existingInvoice) {
    // Update existing invoice
    await updateInvoice(existingInvoice.id, {
      status: "paid",
      paidAt: new Date(),
    });
    console.log(`[Stripe Webhook] Updated invoice ${existingInvoice.id} to paid`);
  } else {
    // Create new invoice record
    try {
      await createInvoice({
        userId: user.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId,
        amount: invoice.total || 0,
        currency: (invoice.currency || "usd").toUpperCase(),
        status: "paid",
        paidAt: new Date(),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        description: invoice.description || "Subscription invoice",
        receiptUrl: (invoice as any).receipt_url || "",
        downloadUrl: (invoice as any).hosted_invoice_url || "",
      });
      console.log(`[Stripe Webhook] Created invoice record for ${invoice.id}`);
      
      // Send payment confirmation email for subscription invoices
      if (user.email) {
        try {
          const { sendPaymentConfirmationEmail } = await import("../services/email");
          await sendPaymentConfirmationEmail(
            user.email,
            user.name || "there",
            (invoice.total || 0) / 100,
            invoice.description || "Subscription",
            (invoice as any).hosted_invoice_url || undefined
          );
          console.log("[Stripe Webhook] Invoice payment confirmation email sent to", user.email);
        } catch (emailError) {
          console.error("[Stripe Webhook] Failed to send invoice confirmation email:", emailError);
        }
      }
    } catch (error) {
      console.error("[Stripe Webhook] Error creating invoice:", error);
    }
  }
}

/**
 * Handle invoice.payment_failed event
 * Triggered when an invoice payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Stripe Webhook] Invoice payment failed:", invoice.id);

  const existingInvoice = await getInvoiceByStripeId(invoice.id);
  if (existingInvoice) {
    await updateInvoice(existingInvoice.id, {
      status: "open", // Keep as open for retry
    });
    console.log(`[Stripe Webhook] Marked invoice ${existingInvoice.id} as open (payment failed)`);
  }

  // Optionally: Send notification to user about failed payment
  // await notifyOwner({ title: "Payment Failed", content: `Invoice ${invoice.id} payment failed` });
}

/**
 * Handle customer.subscription.updated event
 * Triggered when a subscription is updated (e.g., plan change, cancellation)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Stripe Webhook] Subscription updated:", subscription.id);

  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error("[Stripe Webhook] No user found for customer:", customerId);
    return;
  }

  // Handle subscription cancellation
  if (subscription.status === "canceled") {
    await updateUserBilling(user.id, {
      subscriptionTier: "free",
      billingCycle: "none",
      nextBillingDate: null,
    });
    console.log(`[Stripe Webhook] Downgraded user ${user.id} to free tier`);
  } else if (subscription.status === "active") {
    // Update next billing date
    await updateUserBilling(user.id, {
      nextBillingDate: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : null,
    });
  }
}

/**
 * Handle customer.subscription.deleted event
 * Triggered when a subscription is deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Stripe Webhook] Subscription deleted:", subscription.id);

  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error("[Stripe Webhook] No user found for customer:", customerId);
    return;
  }

  // Downgrade user to free tier
  await updateUserBilling(user.id, {
    subscriptionTier: "free",
    billingCycle: "none",
    nextBillingDate: null,
  });
  console.log(`[Stripe Webhook] User ${user.id} subscription deleted, downgraded to free`);
}

/**
 * Main webhook handler
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    console.error("[Stripe Webhook] No signature provided");
    return res.status(400).json({ error: "No signature provided" });
  }

  // Verify webhook signature
  const event = verifyWebhookSignature(req.body, signature);

  if (!event) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // Handle test events for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  try {
    // Route event to appropriate handler
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Return success response
    return res.json({ received: true, event: event.type });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
