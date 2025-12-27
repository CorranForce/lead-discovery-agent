import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { leads, emailOpens, emailClicks, reengagementWorkflows, reengagementExecutions, sequenceEnrollments } from "../drizzle/schema";

/**
 * Detect inactive leads based on workflow criteria
 * A lead is considered inactive if they haven't opened or clicked any emails
 * within the specified number of days
 */
export async function detectInactiveLeads(
  userId: number,
  inactivityDays: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

  // Find leads that belong to the user
  const userLeads = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.userId, userId));

  const leadIds = userLeads.map((l) => l.id);

  if (leadIds.length === 0) {
    return [];
  }

  // For each lead, check if they have any recent email activity
  const inactiveLeadIds: number[] = [];

  for (const leadId of leadIds) {
    // Check for recent email opens
    const recentOpens = await db
      .select({ id: emailOpens.id })
      .from(emailOpens)
      .where(
        and(
          eq(emailOpens.leadId, leadId),
          sql`${emailOpens.openedAt} >= ${cutoffDate.toISOString()}`
        )
      )
      .limit(1);

    // Check for recent email clicks
    const recentClicks = await db
      .select({ id: emailClicks.id })
      .from(emailClicks)
      .where(
        and(
          eq(emailClicks.leadId, leadId),
          sql`${emailClicks.clickedAt} >= ${cutoffDate.toISOString()}`
        )
      )
      .limit(1);

    // If no recent opens or clicks, the lead is inactive
    if (recentOpens.length === 0 && recentClicks.length === 0) {
      inactiveLeadIds.push(leadId);
    }
  }

  return inactiveLeadIds;
}

/**
 * Check if a lead is already enrolled in any active sequence
 */
export async function isLeadInActiveSequence(leadId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  const activeEnrollments = await db
    .select({ id: sequenceEnrollments.id })
    .from(sequenceEnrollments)
    .where(
      and(
        eq(sequenceEnrollments.leadId, leadId),
        eq(sequenceEnrollments.status, "active")
      )
    )
    .limit(1);

  return activeEnrollments.length > 0;
}

/**
 * Enroll inactive leads into a re-engagement sequence
 */
export async function enrollInactiveLeads(
  inactiveLeadIds: number[],
  sequenceId: number
): Promise<{ enrolled: number; skipped: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let enrolled = 0;
  let skipped = 0;

  for (const leadId of inactiveLeadIds) {
    // Check if already in an active sequence
    const alreadyEnrolled = await isLeadInActiveSequence(leadId);

    if (alreadyEnrolled) {
      skipped++;
      continue;
    }

    // Enroll the lead in the re-engagement sequence
    try {
      await db.insert(sequenceEnrollments).values({
        leadId,
        sequenceId,
        status: "active",
        currentStep: 0,
        enrolledAt: new Date(),
        nextEmailScheduledAt: new Date(), // Send first email immediately
      });

      enrolled++;
    } catch (error) {
      console.error(`[Re-engagement] Failed to enroll lead ${leadId}:`, error);
      skipped++;
    }
  }

  return { enrolled, skipped };
}

/**
 * Execute a re-engagement workflow
 */
export async function executeReengagementWorkflow(
  workflowId: number
): Promise<{
  success: boolean;
  leadsDetected: number;
  leadsEnrolled: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      leadsDetected: 0,
      leadsEnrolled: 0,
      error: "Database not available",
    };
  }

  try {
    // Get workflow details
    const workflow = await db
      .select()
      .from(reengagementWorkflows)
      .where(eq(reengagementWorkflows.id, workflowId))
      .limit(1);

    if (workflow.length === 0) {
      return {
        success: false,
        leadsDetected: 0,
        leadsEnrolled: 0,
        error: "Workflow not found",
      };
    }

    const workflowData = workflow[0];

    if (!workflowData.isActive) {
      return {
        success: false,
        leadsDetected: 0,
        leadsEnrolled: 0,
        error: "Workflow is not active",
      };
    }

    if (!workflowData.sequenceId) {
      return {
        success: false,
        leadsDetected: 0,
        leadsEnrolled: 0,
        error: "No sequence configured for this workflow",
      };
    }

    // Detect inactive leads
    const inactiveLeadIds = await detectInactiveLeads(
      workflowData.userId,
      workflowData.inactivityDays
    );

    // Enroll inactive leads
    const { enrolled, skipped } = await enrollInactiveLeads(
      inactiveLeadIds,
      workflowData.sequenceId
    );

    // Log the execution
    await db.insert(reengagementExecutions).values({
      workflowId,
      leadsDetected: inactiveLeadIds.length,
      leadsEnrolled: enrolled,
      status: "success",
    });

    // Update workflow's lastRunAt
    await db
      .update(reengagementWorkflows)
      .set({ lastRunAt: new Date() })
      .where(eq(reengagementWorkflows.id, workflowId));

    console.log(
      `[Re-engagement] Workflow ${workflowId} executed: ${inactiveLeadIds.length} inactive leads detected, ${enrolled} enrolled, ${skipped} skipped`
    );

    return {
      success: true,
      leadsDetected: inactiveLeadIds.length,
      leadsEnrolled: enrolled,
    };
  } catch (error) {
    console.error(`[Re-engagement] Workflow ${workflowId} failed:`, error);

    // Log the failed execution
    await db.insert(reengagementExecutions).values({
      workflowId,
      leadsDetected: 0,
      leadsEnrolled: 0,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      leadsDetected: 0,
      leadsEnrolled: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute all active re-engagement workflows for a user
 */
export async function executeAllUserWorkflows(
  userId: number
): Promise<{
  totalWorkflows: number;
  successful: number;
  failed: number;
  totalLeadsEnrolled: number;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all active workflows for the user
  const workflows = await db
    .select()
    .from(reengagementWorkflows)
    .where(
      and(
        eq(reengagementWorkflows.userId, userId),
        eq(reengagementWorkflows.isActive, 1)
      )
    );

  let successful = 0;
  let failed = 0;
  let totalLeadsEnrolled = 0;

  for (const workflow of workflows) {
    const result = await executeReengagementWorkflow(workflow.id);

    if (result.success) {
      successful++;
      totalLeadsEnrolled += result.leadsEnrolled;
    } else {
      failed++;
    }
  }

  return {
    totalWorkflows: workflows.length,
    successful,
    failed,
    totalLeadsEnrolled,
  };
}
