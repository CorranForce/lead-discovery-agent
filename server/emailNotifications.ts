import { notifyOwner } from "./_core/notification";

/**
 * Email notification service for scheduled workflow execution results
 */

export interface WorkflowExecutionResult {
  workflowName: string;
  workflowId: number;
  leadsDetected: number;
  leadsEnrolled: number;
  status: "success" | "failed" | "partial";
  errorMessage?: string;
  executedAt: Date;
  duration?: number; // in milliseconds
}

export interface NotificationPreferences {
  enabled: boolean;
  onSuccess: boolean;
  onFailure: boolean;
  onPartial: boolean;
  batchNotifications: boolean; // Send one email for multiple executions
}

/**
 * Send email notification for workflow execution result
 */
export async function sendWorkflowExecutionNotification(
  userEmail: string,
  userName: string,
  result: WorkflowExecutionResult,
  preferences: NotificationPreferences = {
    enabled: true,
    onSuccess: true,
    onFailure: true,
    onPartial: true,
    batchNotifications: false,
  }
): Promise<boolean> {
  // Check if notifications are enabled
  if (!preferences.enabled) {
    console.log("[Email Notifications] Notifications disabled for user");
    return false;
  }

  // Check if this status should trigger a notification
  const shouldNotify =
    (result.status === "success" && preferences.onSuccess) ||
    (result.status === "failed" && preferences.onFailure) ||
    (result.status === "partial" && preferences.onPartial);

  if (!shouldNotify) {
    console.log(`[Email Notifications] Skipping notification for status: ${result.status}`);
    return false;
  }

  try {
    const emailContent = generateEmailContent(userName, result);
    
    // Use the built-in owner notification system
    // In a production system, you would use a proper email service like SendGrid, AWS SES, etc.
    const success = await notifyOwner({
      title: emailContent.subject,
      content: emailContent.body,
    });

    if (success) {
      console.log(`[Email Notifications] Sent notification for workflow: ${result.workflowName}`);
    } else {
      console.warn(`[Email Notifications] Failed to send notification for workflow: ${result.workflowName}`);
    }

    return success;
  } catch (error) {
    console.error("[Email Notifications] Error sending notification:", error);
    return false;
  }
}

/**
 * Send batch notification for multiple workflow executions
 */
export async function sendBatchWorkflowNotification(
  userEmail: string,
  userName: string,
  results: WorkflowExecutionResult[],
  preferences: NotificationPreferences
): Promise<boolean> {
  if (!preferences.enabled || !preferences.batchNotifications) {
    return false;
  }

  if (results.length === 0) {
    return false;
  }

  try {
    const emailContent = generateBatchEmailContent(userName, results);
    
    const success = await notifyOwner({
      title: emailContent.subject,
      content: emailContent.body,
    });

    if (success) {
      console.log(`[Email Notifications] Sent batch notification for ${results.length} workflows`);
    }

    return success;
  } catch (error) {
    console.error("[Email Notifications] Error sending batch notification:", error);
    return false;
  }
}

/**
 * Generate email content for single workflow execution
 */
function generateEmailContent(
  userName: string,
  result: WorkflowExecutionResult
): { subject: string; body: string } {
  const statusEmoji = {
    success: "✅",
    failed: "❌",
    partial: "⚠️",
  };

  const emoji = statusEmoji[result.status];
  const subject = `${emoji} Workflow "${result.workflowName}" ${result.status === "success" ? "Completed Successfully" : result.status === "failed" ? "Failed" : "Completed with Issues"}`;

  const successRate = result.leadsDetected > 0
    ? Math.round((result.leadsEnrolled / result.leadsDetected) * 100)
    : 0;

  let body = `Hi ${userName},\n\n`;
  body += `Your scheduled workflow "${result.workflowName}" has completed execution.\n\n`;
  
  body += `📊 Execution Summary:\n`;
  body += `- Status: ${result.status.toUpperCase()}\n`;
  body += `- Leads Detected: ${result.leadsDetected}\n`;
  body += `- Leads Enrolled: ${result.leadsEnrolled}\n`;
  body += `- Success Rate: ${successRate}%\n`;
  body += `- Executed At: ${result.executedAt.toLocaleString()}\n`;
  
  if (result.duration) {
    const durationSeconds = Math.round(result.duration / 1000);
    body += `- Duration: ${durationSeconds}s\n`;
  }

  if (result.status === "failed" && result.errorMessage) {
    body += `\n❌ Error Details:\n`;
    body += `${result.errorMessage}\n`;
    body += `\nPlease check your workflow configuration and try again.\n`;
  } else if (result.status === "partial") {
    body += `\n⚠️ Some leads could not be enrolled. Please check the execution logs for details.\n`;
  } else if (result.status === "success") {
    body += `\n✅ All leads were successfully enrolled in the re-engagement sequence!\n`;
  }

  body += `\n📈 View detailed execution history in your Admin Dashboard.\n`;
  body += `\nBest regards,\nLead Discovery & Prospecting AI Agent`;

  return { subject, body };
}

/**
 * Generate email content for batch workflow executions
 */
function generateBatchEmailContent(
  userName: string,
  results: WorkflowExecutionResult[]
): { subject: string; body: string } {
  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed").length;
  const partialCount = results.filter(r => r.status === "partial").length;

  const totalLeadsDetected = results.reduce((sum, r) => sum + r.leadsDetected, 0);
  const totalLeadsEnrolled = results.reduce((sum, r) => sum + r.leadsEnrolled, 0);

  const subject = `📊 Daily Workflow Summary: ${results.length} workflows executed`;

  let body = `Hi ${userName},\n\n`;
  body += `Here's your daily summary of scheduled workflow executions.\n\n`;
  
  body += `📊 Overall Statistics:\n`;
  body += `- Total Workflows: ${results.length}\n`;
  body += `- Successful: ${successCount} ✅\n`;
  body += `- Failed: ${failedCount} ❌\n`;
  body += `- Partial: ${partialCount} ⚠️\n`;
  body += `- Total Leads Detected: ${totalLeadsDetected}\n`;
  body += `- Total Leads Enrolled: ${totalLeadsEnrolled}\n`;

  if (results.length > 0) {
    body += `\n📋 Individual Workflow Results:\n\n`;
    
    results.forEach((result, index) => {
      const statusEmoji = result.status === "success" ? "✅" : result.status === "failed" ? "❌" : "⚠️";
      body += `${index + 1}. ${statusEmoji} ${result.workflowName}\n`;
      body += `   - Detected: ${result.leadsDetected}, Enrolled: ${result.leadsEnrolled}\n`;
      
      if (result.status === "failed" && result.errorMessage) {
        body += `   - Error: ${result.errorMessage}\n`;
      }
      
      body += `\n`;
    });
  }

  body += `📈 View detailed execution history in your Admin Dashboard.\n`;
  body += `\nBest regards,\nLead Discovery & Prospecting AI Agent`;

  return { subject, body };
}

/**
 * Get default notification preferences
 */
export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    enabled: true,
    onSuccess: true,
    onFailure: true,
    onPartial: true,
    batchNotifications: false,
  };
}

/**
 * Validate notification preferences
 */
export function validateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): NotificationPreferences {
  const defaults = getDefaultNotificationPreferences();
  
  return {
    enabled: preferences.enabled ?? defaults.enabled,
    onSuccess: preferences.onSuccess ?? defaults.onSuccess,
    onFailure: preferences.onFailure ?? defaults.onFailure,
    onPartial: preferences.onPartial ?? defaults.onPartial,
    batchNotifications: preferences.batchNotifications ?? defaults.batchNotifications,
  };
}
