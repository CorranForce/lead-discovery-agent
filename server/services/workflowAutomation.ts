import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Workflow Automation Service
 * 
 * Automatically updates lead statuses based on user actions and engagement signals.
 * Tracks all status changes in leadStatusHistory table with metadata and reasoning.
 */

export type LeadStatus = "new" | "contacted" | "qualified" | "nurturing" | "won" | "lost" | "unresponsive";

export type WorkflowTrigger =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "conversation_started"
  | "conversation_replied"
  | "qualified_manually"
  | "won_manually"
  | "lost_manually"
  | "no_response_timeout";

export type TriggeredBy = "user" | "workflow" | "system";

interface WorkflowRule {
  trigger: WorkflowTrigger;
  fromStatus: LeadStatus | LeadStatus[];
  toStatus: LeadStatus;
  priority: number; // Higher priority rules are evaluated first
  description: string;
}

/**
 * Workflow Rules Engine
 * 
 * Defines automatic status transitions based on user actions.
 * Rules are evaluated in priority order (highest first).
 */
const WORKFLOW_RULES: WorkflowRule[] = [
  // Manual override rules (highest priority)
  {
    trigger: "won_manually",
    fromStatus: ["contacted", "qualified", "nurturing"],
    toStatus: "won",
    priority: 200,
    description: "Lead manually marked as won",
  },
  {
    trigger: "lost_manually",
    fromStatus: ["contacted", "qualified", "nurturing", "unresponsive"],
    toStatus: "lost",
    priority: 200,
    description: "Lead manually marked as lost",
  },
  {
    trigger: "qualified_manually",
    fromStatus: ["contacted", "nurturing"],
    toStatus: "qualified",
    priority: 200,
    description: "Lead manually qualified by sales rep",
  },

  // Automatic engagement-based rules
  {
    trigger: "email_sent",
    fromStatus: "new",
    toStatus: "contacted",
    priority: 100,
    description: "First email sent to lead",
  },
  {
    trigger: "conversation_started",
    fromStatus: "new",
    toStatus: "contacted",
    priority: 100,
    description: "Conversation initiated with lead",
  },
  {
    trigger: "email_opened",
    fromStatus: "contacted",
    toStatus: "nurturing",
    priority: 90,
    description: "Lead opened email (showing interest)",
  },
  {
    trigger: "email_clicked",
    fromStatus: "contacted",
    toStatus: "nurturing",
    priority: 90,
    description: "Lead clicked link in email (high engagement)",
  },
  {
    trigger: "conversation_replied",
    fromStatus: "contacted",
    toStatus: "nurturing",
    priority: 90,
    description: "Lead replied to conversation",
  },

  // Timeout/inactivity rules
  {
    trigger: "no_response_timeout",
    fromStatus: ["contacted", "nurturing"],
    toStatus: "unresponsive",
    priority: 50,
    description: "No response after multiple attempts",
  },
];

/**
 * Process a workflow trigger and update lead status if rules match
 */
export async function processWorkflowTrigger(
  leadId: number,
  userId: number,
  trigger: WorkflowTrigger,
  metadata?: Record<string, any>,
  notes?: string
): Promise<{ status: LeadStatus } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current lead
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const currentStatus = lead.status as LeadStatus;

  // Find matching rules (sorted by priority)
  const matchingRules = WORKFLOW_RULES
    .filter((rule) => {
      if (rule.trigger !== trigger) return false;
      
      if (Array.isArray(rule.fromStatus)) {
        return rule.fromStatus.includes(currentStatus);
      }
      return rule.fromStatus === currentStatus;
    })
    .sort((a, b) => b.priority - a.priority);

  if (matchingRules.length === 0) {
    // No matching rule, no status change
    return null;
  }

  // Apply the highest priority rule
  const rule = matchingRules[0];
  const newStatus = rule.toStatus;

  // Update lead status
  await db.update(leads)
    .set({ status: newStatus })
    .where(eq(leads.id, leadId));

  // Record status change in history
  await recordStatusChange(
    leadId,
    userId,
    currentStatus,
    newStatus,
    trigger,
    "workflow",
    metadata,
    notes || rule.description
  );

  console.log(`[Workflow] Lead ${leadId} status changed: ${currentStatus} → ${newStatus} (trigger: ${trigger})`);

  return { status: newStatus };
}

/**
 * Manually update lead status with history tracking
 */
export async function updateLeadStatus(
  leadId: number,
  userId: number,
  newStatus: LeadStatus,
  notes?: string,
  triggeredBy: TriggeredBy = "user"
): Promise<{ status: LeadStatus } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current lead
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const currentStatus = lead.status as LeadStatus;

  // If status hasn't changed, don't create history entry
  if (currentStatus === newStatus) {
    return { status: currentStatus };
  }

  // Update lead status
  await db.update(leads)
    .set({ status: newStatus })
    .where(eq(leads.id, leadId));

  // Record status change in history
  await recordStatusChange(
    leadId,
    userId,
    currentStatus,
    newStatus,
    "manual_update",
    triggeredBy,
    undefined,
    notes
  );

  console.log(`[Workflow] Lead ${leadId} status manually updated: ${currentStatus} → ${newStatus}`);

  return { status: newStatus };
}

/**
 * Get status change history for a lead
 */
export async function getLeadStatusHistory(leadId: number) {
  const db = await getDb();
  if (!db) return [];

  const result: any = await db.execute(
    sql`SELECT 
      id,
      leadId,
      userId,
      previousStatus,
      newStatus,
      changeReason,
      triggeredBy,
      metadata,
      notes,
      changedAt
    FROM leadStatusHistory
    WHERE leadId = ${leadId}
    ORDER BY changedAt ASC`
  );

  return (result.rows as any[]).map((row) => ({
    id: row.id,
    leadId: row.leadId,
    userId: row.userId,
    previousStatus: row.previousStatus,
    newStatus: row.newStatus,
    changeReason: row.changeReason,
    triggeredBy: row.triggeredBy,
    metadata: row.metadata,
    notes: row.notes,
    changedAt: row.changedAt,
  }));
}

/**
 * Internal helper to record status changes in history
 */
async function recordStatusChange(
  leadId: number,
  userId: number,
  previousStatus: LeadStatus,
  newStatus: LeadStatus,
  changeReason: string,
  triggeredBy: TriggeredBy,
  metadata?: Record<string, any>,
  notes?: string
) {
  const db = await getDb();
  if (!db) return;

  await db.execute(
    sql`INSERT INTO leadStatusHistory (
      leadId,
      userId,
      previousStatus,
      newStatus,
      changeReason,
      triggeredBy,
      metadata,
      notes
    ) VALUES (
      ${leadId},
      ${userId},
      ${previousStatus},
      ${newStatus},
      ${changeReason},
      ${triggeredBy},
      ${metadata ? JSON.stringify(metadata) : null},
      ${notes || null}
    )`
  );
}
