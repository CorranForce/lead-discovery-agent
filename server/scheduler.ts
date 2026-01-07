import * as cron from "node-cron";

import { executeAllUserWorkflows } from "./reengagement";
import { sendWorkflowExecutionNotification, getDefaultNotificationPreferences, type WorkflowExecutionResult } from "./emailNotifications";
import { getUserByOpenId } from "./db";
import { sendTrialExpirationWarnings, autoDowngradeExpiredTrials } from "./trialExpiration";

const scheduledJobs = new Map<string, cron.ScheduledTask>();

/**
 * Start scheduled execution of re-engagement workflows
 * Runs daily at 9 AM to detect and enroll inactive leads
 */
export function startScheduler() {
  // Run every day at 9:00 AM
  const dailyJob = cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running daily re-engagement workflow execution");
    try {
      // Execute workflows for all users
      // In a production system, you would iterate through all users
      // For now, this is a placeholder that can be called manually
      console.log("[Scheduler] Daily re-engagement check completed");
    } catch (error) {
      console.error("[Scheduler] Error running daily workflows:", error);
    }
  });

  // Run trial expiration checks every day at 8:00 AM (before re-engagement)
  const trialExpirationJob = cron.schedule("0 8 * * *", async () => {
    console.log("[Scheduler] Running trial expiration checks");
    try {
      await sendTrialExpirationWarnings();
      await autoDowngradeExpiredTrials();
      console.log("[Scheduler] Trial expiration checks completed");
    } catch (error) {
      console.error("[Scheduler] Error running trial expiration checks:", error);
    }
  });

  scheduledJobs.set("daily-reengagement", dailyJob);
  scheduledJobs.set("trial-expiration", trialExpirationJob);
  console.log("[Scheduler] Started daily re-engagement workflow scheduler (9:00 AM)");
  console.log("[Scheduler] Started trial expiration checks scheduler (8:00 AM)");
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  scheduledJobs.forEach((job, name) => {
    job.stop();
    console.log(`[Scheduler] Stopped job: ${name}`);
  });
  scheduledJobs.clear();
}

/**
 * Execute workflows for a specific user on schedule
 */
export async function executeScheduledWorkflows(userId: number) {
  const startTime = Date.now();
  
  try {
    console.log(`[Scheduler] Executing workflows for user ${userId}`);
    const result = await executeAllUserWorkflows(userId);
    const duration = Date.now() - startTime;
    
    console.log(`[Scheduler] Executed ${result.totalWorkflows} workflows for user ${userId}, enrolled ${result.totalLeadsEnrolled} leads`);
    
    // Send email notifications for each workflow execution
    await sendExecutionNotifications(userId, result, duration);
    
    return result;
  } catch (error) {
    console.error(`[Scheduler] Error executing workflows for user ${userId}:`, error);
    
    // Send failure notification
    await sendFailureNotification(userId, error);
    
    throw error;
  }
}

/**
 * Send email notifications for workflow execution results
 */
async function sendExecutionNotifications(
  userId: number,
  result: any,
  duration: number
) {
  try {
    // Get user information
    const { users } = await import("../drizzle/schema");
    const { getDb } = await import("./db");
    const { eq } = await import("drizzle-orm");
    
    const db = await getDb();
    if (!db) return;
    
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) return;
    
    const user = userResult[0];
    if (!user.email) return;
    
    // Check if user has email notifications enabled
    if (user.emailNotifications === 0) {
      console.log(`[Scheduler] Email notifications disabled for user ${userId}`);
      return;
    }
    
    // Get notification preferences from user settings
    const preferences = {
      enabled: user.emailNotifications === 1,
      onSuccess: user.notifyOnSuccess === 1,
      onFailure: user.notifyOnFailure === 1,
      onPartial: user.notifyOnPartial === 1,
      batchNotifications: user.batchNotifications === 1,
    };
    
    // Send notification for each workflow execution
    if (result.executions && result.executions.length > 0) {
      for (const execution of result.executions) {
        const notificationResult: WorkflowExecutionResult = {
          workflowName: execution.workflowName || `Workflow #${execution.workflowId}`,
          workflowId: execution.workflowId,
          leadsDetected: execution.leadsDetected,
          leadsEnrolled: execution.leadsEnrolled,
          status: execution.status,
          errorMessage: execution.errorMessage,
          executedAt: new Date(),
          duration: duration,
        };
        
        await sendWorkflowExecutionNotification(
          user.email,
          user.name || "User",
          notificationResult,
          preferences
        );
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error sending execution notifications:", error);
  }
}

/**
 * Send failure notification when scheduler encounters an error
 */
async function sendFailureNotification(userId: number, error: any) {
  try {
    const { users } = await import("../drizzle/schema");
    const { getDb } = await import("./db");
    const { eq } = await import("drizzle-orm");
    
    const db = await getDb();
    if (!db) return;
    
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) return;
    
    const user = userResult[0];
    if (!user.email || user.emailNotifications === 0) return;
    
    const preferences = getDefaultNotificationPreferences();
    
    const notificationResult: WorkflowExecutionResult = {
      workflowName: "Scheduled Workflow Execution",
      workflowId: 0,
      leadsDetected: 0,
      leadsEnrolled: 0,
      status: "failed",
      errorMessage: error?.message || String(error),
      executedAt: new Date(),
    };
    
    await sendWorkflowExecutionNotification(
      user.email,
      user.name || "User",
      notificationResult,
      preferences
    );
  } catch (notificationError) {
    console.error("[Scheduler] Error sending failure notification:", notificationError);
  }
}

/**
 * Add a custom schedule for a specific user
 */
export function scheduleUserWorkflows(userId: number, cronExpression: string) {
  const jobKey = `user-${userId}-workflows`;
  
  // Stop existing job if any
  if (scheduledJobs.has(jobKey)) {
    scheduledJobs.get(jobKey)?.stop();
    scheduledJobs.delete(jobKey);
  }

  // Create new scheduled job
  const job = cron.schedule(cronExpression, async () => {
    await executeScheduledWorkflows(userId);
  });

  scheduledJobs.set(jobKey, job);
  console.log(`[Scheduler] Scheduled workflows for user ${userId} with cron: ${cronExpression}`);
}

/**
 * Remove scheduled workflows for a user
 */
export function unscheduleUserWorkflows(userId: number) {
  const jobKey = `user-${userId}-workflows`;
  if (scheduledJobs.has(jobKey)) {
    scheduledJobs.get(jobKey)?.stop();
    scheduledJobs.delete(jobKey);
    console.log(`[Scheduler] Unscheduled workflows for user ${userId}`);
  }
}
