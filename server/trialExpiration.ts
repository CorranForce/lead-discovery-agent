import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, and, lt, isNull, lte } from "drizzle-orm";
import { sendTrialExpirationWarning, sendTrialExpiredNotification } from "./emailNotifications";

/**
 * Trial Expiration Management System
 * Handles automatic trial-to-free tier conversion and email notifications
 */

/**
 * Check if user trial is expiring in 7 days
 */
export async function isTrialExpiringIn7Days(trialEndsAt: Date | null): Promise<boolean> {
  if (!trialEndsAt) return false;
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return trialEndsAt <= sevenDaysFromNow && trialEndsAt > now;
}

/**
 * Check if user trial has expired
 */
export async function hasTrialExpired(trialEndsAt: Date | null): Promise<boolean> {
  if (!trialEndsAt) return false;
  
  const now = new Date();
  return trialEndsAt <= now;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  
  const now = new Date();
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
}

/**
 * Send trial expiration warning emails to users with trials expiring in 7 days
 * Only sends if:
 * 1. User is on trial
 * 2. Trial expires in 7 days
 * 3. No payment method added
 * 4. Warning not already sent
 */
export async function sendTrialExpirationWarnings(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Trial Expiration] Database not available");
    return;
  }

  try {
    // Find users with trials expiring in 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiringTrials = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.accountStatus, "trial"),
          lte(users.trialEndsAt, sevenDaysFromNow),
          lt(users.trialEndsAt, now), // Not yet expired
          eq(users.hasPaymentMethod, 0), // No payment method
          isNull(users.trialExpirationNotificationSentAt) // Warning not sent yet
        )
      );

    console.log(`[Trial Expiration] Found ${expiringTrials.length} users with expiring trials`);

    for (const user of expiringTrials) {
      try {
        const daysRemaining = getTrialDaysRemaining(user.trialEndsAt);
        
        // Send warning email
        await sendTrialExpirationWarning({
          email: user.email || "",
          name: user.name || "User",
          daysRemaining,
          trialEndsAt: user.trialEndsAt || new Date(),
        });

        // Mark notification as sent
        await db
          .update(users)
          .set({
            trialExpirationNotificationSentAt: new Date(),
          })
          .where(eq(users.id, user.id));

        console.log(`[Trial Expiration] Sent warning email to user ${user.id} (${user.email})`);
      } catch (error) {
        console.error(`[Trial Expiration] Error sending warning to user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Trial Expiration] Error sending trial expiration warnings:", error);
  }
}

/**
 * Auto-downgrade users whose trials have expired
 * Only downgrades if:
 * 1. User is on trial
 * 2. Trial has expired
 * 3. No payment method added
 */
export async function autoDowngradeExpiredTrials(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Trial Expiration] Database not available");
    return;
  }

  try {
    const now = new Date();
    
    // Find users with expired trials and no payment method
    const expiredTrials = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.accountStatus, "trial"),
          lt(users.trialEndsAt, now), // Trial has expired
          eq(users.hasPaymentMethod, 0) // No payment method
        )
      );

    console.log(`[Trial Expiration] Found ${expiredTrials.length} users with expired trials to downgrade`);

    for (const user of expiredTrials) {
      try {
        // Downgrade to free tier
        await db
          .update(users)
          .set({
            accountStatus: "active",
            subscriptionTier: "free",
            billingCycle: "none",
            nextBillingDate: null,
          })
          .where(eq(users.id, user.id));

        // Send expired notification email
        await sendTrialExpiredNotification({
          email: user.email || "",
          name: user.name || "User",
          trialEndsAt: user.trialEndsAt || new Date(),
        });

        console.log(`[Trial Expiration] Downgraded user ${user.id} to free tier after trial expiration`);
      } catch (error) {
        console.error(`[Trial Expiration] Error downgrading user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Trial Expiration] Error auto-downgrading expired trials:", error);
  }
}

/**
 * Check if user has payment method
 */
export async function userHasPaymentMethod(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const user = await db
      .select({ hasPaymentMethod: users.hasPaymentMethod })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user.length > 0 && user[0].hasPaymentMethod === 1;
  } catch (error) {
    console.error(`[Trial Expiration] Error checking payment method for user ${userId}:`, error);
    return false;
  }
}

/**
 * Add payment method for user
 */
export async function addPaymentMethod(userId: number, paymentMethodId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(users)
      .set({
        hasPaymentMethod: 1,
        paymentMethodId,
      })
      .where(eq(users.id, userId));

    console.log(`[Trial Expiration] Added payment method for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[Trial Expiration] Error adding payment method for user ${userId}:`, error);
    return false;
  }
}

/**
 * Remove payment method for user
 */
export async function removePaymentMethod(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(users)
      .set({
        hasPaymentMethod: 0,
        paymentMethodId: null,
      })
      .where(eq(users.id, userId));

    console.log(`[Trial Expiration] Removed payment method for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[Trial Expiration] Error removing payment method for user ${userId}:`, error);
    return false;
  }
}

/**
 * Get trial status for user
 */
export async function getUserTrialStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const user = await db
      .select({
        accountStatus: users.accountStatus,
        trialEndsAt: users.trialEndsAt,
        hasPaymentMethod: users.hasPaymentMethod,
        subscriptionTier: users.subscriptionTier,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) return null;

    const userTrial = user[0];
    const daysRemaining = getTrialDaysRemaining(userTrial.trialEndsAt);
    const isExpiring = await isTrialExpiringIn7Days(userTrial.trialEndsAt);
    const isExpired = await hasTrialExpired(userTrial.trialEndsAt);

    return {
      accountStatus: userTrial.accountStatus,
      trialEndsAt: userTrial.trialEndsAt,
      hasPaymentMethod: userTrial.hasPaymentMethod === 1,
      subscriptionTier: userTrial.subscriptionTier,
      daysRemaining,
      isExpiring,
      isExpired,
    };
  } catch (error) {
    console.error(`[Trial Expiration] Error getting trial status for user ${userId}:`, error);
    return null;
  }
}
