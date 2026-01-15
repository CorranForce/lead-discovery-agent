import Stripe from 'stripe';
import { ENV } from '../_core/env';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover' as any,
});

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: number, email: string, name?: string) {
  try {
    // Search for existing customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId: userId.toString(),
      },
    });

    return customer;
  } catch (error) {
    console.error('[Stripe] Error creating/retrieving customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    return session;
  } catch (error) {
    console.error('[Stripe] Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a one-time payment checkout session
 */
export async function createPaymentCheckoutSession(
  customerId: string,
  amount: number,
  currency: string,
  description: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    return session;
  } catch (error) {
    console.error('[Stripe] Error creating payment checkout session:', error);
    throw error;
  }
}

/**
 * Retrieve invoice from Stripe
 */
export async function getStripeInvoice(invoiceId: string) {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice;
  } catch (error) {
    console.error('[Stripe] Error retrieving invoice:', error);
    throw error;
  }
}

/**
 * List invoices for a customer
 */
export async function listCustomerInvoices(customerId: string, limit: number = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('[Stripe] Error listing invoices:', error);
    throw error;
  }
}

/**
 * Get payment intent
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('[Stripe] Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event | null {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    return event;
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Format amount from cents to dollars
 */
export function formatAmount(amountInCents: number, currency: string = 'USD'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Get invoice PDF URL
 */
export async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    const pdfUrl = (invoice as any).pdf || (invoice as any).hosted_invoice_url;
    return pdfUrl || null;
  } catch (error) {
    console.error('[Stripe] Error getting invoice PDF URL:', error);
    return null;
  }
}


// ==================== Payment Methods Management ====================

/**
 * Create a SetupIntent for adding a new payment method
 */
export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('[Stripe] Error creating SetupIntent:', error);
    throw error;
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = (customer as Stripe.Customer).invoice_settings?.default_payment_method as string | null;

    return {
      paymentMethods: paymentMethods.data,
      defaultPaymentMethodId,
    };
  } catch (error) {
    console.error('[Stripe] Error listing payment methods:', error);
    throw error;
  }
}

/**
 * Detach (delete) a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string) {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('[Stripe] Error detaching payment method:', error);
    throw error;
  }
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    return customer;
  } catch (error) {
    console.error('[Stripe] Error setting default payment method:', error);
    throw error;
  }
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    return paymentMethod;
  } catch (error) {
    console.error('[Stripe] Error attaching payment method:', error);
    throw error;
  }
}

/**
 * Get Stripe customer
 */
export async function getStripeCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error) {
    console.error('[Stripe] Error retrieving customer:', error);
    throw error;
  }
}


// ==================== Subscription Management ====================

/**
 * Get customer's active subscription
 */
export async function getCustomerSubscription(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
      expand: ['data.default_payment_method', 'data.latest_invoice'],
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    return subscriptions.data[0];
  } catch (error) {
    console.error('[Stripe] Error getting customer subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details with expanded data
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'latest_invoice', 'items.data.price.product'],
    });
    return subscription;
  } catch (error) {
    console.error('[Stripe] Error getting subscription details:', error);
    throw error;
  }
}

/**
 * Get upcoming invoice for a subscription
 */
export async function getUpcomingInvoice(customerId: string, subscriptionId?: string) {
  try {
    const params: any = {
      customer: customerId,
    };
    if (subscriptionId) {
      params.subscription = subscriptionId;
    }
    // Use the upcoming invoice endpoint
    const invoice = await (stripe.invoices as any).retrieveUpcoming(params);
    return invoice;
  } catch (error) {
    // No upcoming invoice is not an error - customer may not have a subscription
    if ((error as any).code === 'invoice_upcoming_none') {
      return null;
    }
    console.error('[Stripe] Error getting upcoming invoice:', error);
    throw error;
  }
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('[Stripe] Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Update subscription to a new price (upgrade/downgrade)
 */
export async function updateSubscriptionPrice(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Get the current subscription item
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error('No subscription item found');
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    return updatedSubscription;
  } catch (error) {
    console.error('[Stripe] Error updating subscription price:', error);
    throw error;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    console.error('[Stripe] Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return subscription;
  } catch (error) {
    console.error('[Stripe] Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription immediately
 */
export async function cancelSubscriptionImmediately(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[Stripe] Error canceling subscription immediately:', error);
    throw error;
  }
}

/**
 * Get all products with prices for plan comparison
 */
export async function getProductsWithPrices() {
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Get all prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        return {
          ...product,
          prices: prices.data,
        };
      })
    );

    return productsWithPrices;
  } catch (error) {
    console.error('[Stripe] Error getting products with prices:', error);
    throw error;
  }
}

/**
 * Preview proration for subscription change
 */
export async function previewProration(
  customerId: string,
  subscriptionId: string,
  newPriceId: string
) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error('No subscription item found');
    }

    const invoice = await (stripe.invoices as any).retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
    });

    return invoice;
  } catch (error) {
    console.error('[Stripe] Error previewing proration:', error);
    throw error;
  }
}
