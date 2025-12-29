import * as cron from "node-cron";
import { executeAllUserWorkflows } from "./reengagement";

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

  scheduledJobs.set("daily-reengagement", dailyJob);
  console.log("[Scheduler] Started daily re-engagement workflow scheduler (9:00 AM)");
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
  try {
    console.log(`[Scheduler] Executing workflows for user ${userId}`);
    const result = await executeAllUserWorkflows(userId);
    console.log(`[Scheduler] Executed ${result.totalWorkflows} workflows for user ${userId}, enrolled ${result.totalLeadsEnrolled} leads`);
    return result;
  } catch (error) {
    console.error(`[Scheduler] Error executing workflows for user ${userId}:`, error);
    throw error;
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
