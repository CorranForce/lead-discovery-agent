import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, InsertLead, searchHistory, InsertSearchHistory, enrichmentData, InsertEnrichmentData, conversations, InsertConversation, messages, InsertMessage, conversationTemplates, InsertConversationTemplate, emailTemplates, InsertEmailTemplate, sentEmails, InsertSentEmail, emailSequences, InsertEmailSequence, sequenceSteps, InsertSequenceStep, sequenceEnrollments, InsertSequenceEnrollment, emailClicks, InsertEmailClick, emailOpens, InsertEmailOpen, reengagementWorkflows, InsertReengagementWorkflow, reengagementExecutions, invoices, Invoice, InsertInvoice, payments, Payment, InsertPayment, subscriptionPlans, SubscriptionPlan, InsertSubscriptionPlan } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Lead management queries
export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(leads).values(lead);
  return result;
}

export async function getUserLeads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leads).where(eq(leads.userId, userId)).orderBy(leads.createdAt);
}

export async function getLeadById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(leads)
    .where(eq(leads.id, id))
    .limit(1);
  
  // Verify ownership
  if (result.length > 0 && result[0].userId === userId) {
    return result[0];
  }
  return undefined;
}

export async function updateLead(id: number, userId: number, updates: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership before updating
  const lead = await getLeadById(id, userId);
  if (!lead) throw new Error("Lead not found or access denied");
  
  return await db.update(leads)
    .set(updates)
    .where(eq(leads.id, id));
}

export async function deleteLead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership before deleting
  const lead = await getLeadById(id, userId);
  if (!lead) throw new Error("Lead not found or access denied");
  
  return await db.delete(leads).where(eq(leads.id, id));
}

export async function updateLeadScore(id: number, score: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(leads)
    .set({ score, updatedAt: new Date() })
    .where(eq(leads.id, id));
}

// Search history queries
export async function createSearchHistory(search: InsertSearchHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(searchHistory).values(search);
  return result;
}

export async function getUserSearchHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const { desc } = await import("drizzle-orm");
  return await db.select().from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(limit);
}

export async function getUserFavoriteSearches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { desc, and } = await import("drizzle-orm");
  return await db.select().from(searchHistory)
    .where(and(
      eq(searchHistory.userId, userId),
      eq(searchHistory.isFavorite, 1)
    ))
    .orderBy(desc(searchHistory.createdAt));
}

export async function toggleSearchFavorite(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current state
  const result = await db.select().from(searchHistory)
    .where(eq(searchHistory.id, id))
    .limit(1);
  
  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Search not found or access denied");
  }
  
  const newFavoriteState = result[0].isFavorite === 1 ? 0 : 1;
  
  await db.update(searchHistory)
    .set({ isFavorite: newFavoriteState })
    .where(eq(searchHistory.id, id));
  
  return newFavoriteState === 1;
}

export async function deleteSearchHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const result = await db.select().from(searchHistory)
    .where(eq(searchHistory.id, id))
    .limit(1);
  
  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Search not found or access denied");
  }
  
  await db.delete(searchHistory).where(eq(searchHistory.id, id));
  return true;
}

export async function clearUserSearchHistory(userId: number, keepFavorites: boolean = true) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (keepFavorites) {
    const { and } = await import("drizzle-orm");
    await db.delete(searchHistory).where(
      and(
        eq(searchHistory.userId, userId),
        eq(searchHistory.isFavorite, 0)
      )
    );
  } else {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
  }
  return true;
}

// Enrichment data queries
export async function createEnrichmentData(data: InsertEnrichmentData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(enrichmentData).values(data);
}

export async function getLeadEnrichmentData(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(enrichmentData)
    .where(eq(enrichmentData.leadId, leadId))
    .orderBy(enrichmentData.createdAt);
}

// Conversation management queries
export async function createConversation(conversation: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(conversations).values(conversation);
  return result;
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(conversations.updatedAt);
}

export async function getConversationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  
  // Verify ownership
  if (result.length > 0 && result[0].userId === userId) {
    return result[0];
  }
  return undefined;
}

export async function updateConversation(id: number, userId: number, updates: Partial<InsertConversation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conversation = await getConversationById(id, userId);
  if (!conversation) throw new Error("Conversation not found or access denied");
  
  return await db.update(conversations)
    .set(updates)
    .where(eq(conversations.id, id));
}

export async function deleteConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conversation = await getConversationById(id, userId);
  if (!conversation) throw new Error("Conversation not found or access denied");
  
  // Delete all messages first
  await db.delete(messages).where(eq(messages.conversationId, id));
  
  return await db.delete(conversations).where(eq(conversations.id, id));
}

// Message management queries
export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(messages).values(message);
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// Template management queries
export async function getPublicTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(conversationTemplates)
    .where(eq(conversationTemplates.isPublic, 1))
    .orderBy(conversationTemplates.createdAt);
}

export async function getUserTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(conversationTemplates)
    .where(eq(conversationTemplates.userId, userId))
    .orderBy(conversationTemplates.createdAt);
}

// Email template management
export async function getPublicEmailTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(emailTemplates)
    .where(eq(emailTemplates.isPublic, 1))
    .orderBy(emailTemplates.createdAt);
}

export async function getUserEmailTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(emailTemplates)
    .where(eq(emailTemplates.userId, userId))
    .orderBy(emailTemplates.createdAt);
}

export async function createEmailTemplate(template: InsertEmailTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(emailTemplates).values(template);
}

// Sent email tracking
export async function createSentEmail(email: InsertSentEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(sentEmails).values(email);
}

export async function getUserSentEmails(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sentEmails)
    .where(eq(sentEmails.userId, userId))
    .orderBy(sentEmails.sentAt)
    .limit(limit);
}

export async function getLeadSentEmails(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sentEmails)
    .where(eq(sentEmails.leadId, leadId))
    .orderBy(sentEmails.sentAt);
}

// Email Sequence helpers
export async function getSequencesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(emailSequences)
    .where(eq(emailSequences.userId, userId))
    .orderBy(emailSequences.createdAt);
}

export async function getSequenceSteps(sequenceId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sequenceSteps)
    .where(eq(sequenceSteps.sequenceId, sequenceId))
    .orderBy(sequenceSteps.stepOrder);
}

export async function getSequenceEnrollments(sequenceId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sequenceEnrollments)
    .where(eq(sequenceEnrollments.sequenceId, sequenceId));
}

export async function getLeadEnrollments(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sequenceEnrollments)
    .where(eq(sequenceEnrollments.leadId, leadId));
}

// Email Click Tracking functions
export async function createEmailClick(click: InsertEmailClick) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(emailClicks).values(click);
}

export async function getEmailClicks(sentEmailId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const clicks = await db.select().from(emailClicks).where(eq(emailClicks.sentEmailId, sentEmailId));
  return clicks;
}

export async function getLeadEmailClicks(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const clicks = await db.select().from(emailClicks).where(eq(emailClicks.leadId, leadId));
  return clicks;
}

export async function getAllEmailClicks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join with sentEmails to filter by userId
  const clicks = await db
    .select({
      id: emailClicks.id,
      sentEmailId: emailClicks.sentEmailId,
      leadId: emailClicks.leadId,
      originalUrl: emailClicks.originalUrl,
      clickedAt: emailClicks.clickedAt,
      ipAddress: emailClicks.ipAddress,
      userAgent: emailClicks.userAgent,
      recipientEmail: sentEmails.recipientEmail,
      subject: sentEmails.subject,
    })
    .from(emailClicks)
    .leftJoin(sentEmails, eq(emailClicks.sentEmailId, sentEmails.id))
    .where(eq(sentEmails.userId, userId));
  
  return clicks;
}

// Email Open Tracking functions
export async function createEmailOpen(open: InsertEmailOpen) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(emailOpens).values(open);
}

export async function getEmailOpens(sentEmailId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const opens = await db.select().from(emailOpens).where(eq(emailOpens.sentEmailId, sentEmailId));
  return opens;
}

export async function getLeadEmailOpens(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const opens = await db.select().from(emailOpens).where(eq(emailOpens.leadId, leadId));
  return opens;
}

export async function getAllEmailOpens(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join with sentEmails to filter by userId
  const opens = await db
    .select({
      id: emailOpens.id,
      sentEmailId: emailOpens.sentEmailId,
      leadId: emailOpens.leadId,
      openedAt: emailOpens.openedAt,
      ipAddress: emailOpens.ipAddress,
      userAgent: emailOpens.userAgent,
      recipientEmail: sentEmails.recipientEmail,
      subject: sentEmails.subject,
    })
    .from(emailOpens)
    .leftJoin(sentEmails, eq(emailOpens.sentEmailId, sentEmails.id))
    .where(eq(sentEmails.userId, userId));
  
  return opens;
}


// Re-engagement Workflow functions
export async function getUserReengagementWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const workflows = await db
    .select()
    .from(reengagementWorkflows)
    .where(eq(reengagementWorkflows.userId, userId))
    .orderBy(desc(reengagementWorkflows.createdAt));
  
  return workflows;
}

export async function createReengagementWorkflow(workflow: InsertReengagementWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reengagementWorkflows).values(workflow);
  return result;
}

export async function updateReengagementWorkflow(
  workflowId: number,
  updates: Partial<InsertReengagementWorkflow>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(reengagementWorkflows)
    .set(updates)
    .where(eq(reengagementWorkflows.id, workflowId));
}

export async function deleteReengagementWorkflow(workflowId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(reengagementWorkflows).where(eq(reengagementWorkflows.id, workflowId));
}

export async function getWorkflowExecutions(workflowId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const executions = await db
    .select()
    .from(reengagementExecutions)
    .where(eq(reengagementExecutions.workflowId, workflowId))
    .orderBy(desc(reengagementExecutions.executedAt))
    .limit(10);
  
  return executions;
}


// ============================================
// Scheduled Jobs Functions
// ============================================

/**
 * Get all scheduled jobs for a user
 */
export async function getUserScheduledJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { scheduledJobs } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const jobs = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.userId, userId));
  
  return jobs;
}

/**
 * Get all active scheduled jobs (for scheduler to execute)
 */
export async function getAllActiveScheduledJobs() {
  const db = await getDb();
  if (!db) return [];
  
  const { scheduledJobs } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const jobs = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.isActive, 1));
  
  return jobs;
}

/**
 * Create a new scheduled job
 */
export async function createScheduledJob(job: {
  userId: number;
  jobType: string;
  cronExpression: string;
  isActive?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { scheduledJobs } = await import("../drizzle/schema");
  
  await db.insert(scheduledJobs).values({
    userId: job.userId,
    jobType: job.jobType,
    cronExpression: job.cronExpression,
    isActive: job.isActive ?? 1,
  });
}

/**
 * Update a scheduled job
 */
export async function updateScheduledJob(jobId: number, updates: {
  cronExpression?: string;
  isActive?: number;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  totalExecutions?: number;
  successfulExecutions?: number;
  failedExecutions?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { scheduledJobs } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db
    .update(scheduledJobs)
    .set(updates)
    .where(eq(scheduledJobs.id, jobId));
}

/**
 * Delete a scheduled job
 */
export async function deleteScheduledJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { scheduledJobs } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db
    .delete(scheduledJobs)
    .where(eq(scheduledJobs.id, jobId));
}

/**
 * Get job execution statistics
 */
export async function getJobStatistics(userId: number) {
  const db = await getDb();
  if (!db) return {
    totalJobs: 0,
    activeJobs: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
  };
  
  const { scheduledJobs } = await import("../drizzle/schema");
  const { eq, sum, count } = await import("drizzle-orm");
  
  const jobs = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.userId, userId));
  
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.isActive === 1).length;
  const totalExecutions = jobs.reduce((sum, j) => sum + (j.totalExecutions || 0), 0);
  const successfulExecutions = jobs.reduce((sum, j) => sum + (j.successfulExecutions || 0), 0);
  const failedExecutions = jobs.reduce((sum, j) => sum + (j.failedExecutions || 0), 0);
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
  
  return {
    totalJobs,
    activeJobs,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate: Math.round(successRate * 10) / 10,
  };
}

/**
 * Get execution history for all workflows (for admin dashboard)
 */
export async function getAllExecutionHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const { reengagementExecutions, reengagementWorkflows } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");
  
  const executions = await db
    .select({
      id: reengagementExecutions.id,
      workflowId: reengagementExecutions.workflowId,
      workflowName: reengagementWorkflows.name,
      leadsDetected: reengagementExecutions.leadsDetected,
      leadsEnrolled: reengagementExecutions.leadsEnrolled,
      executedAt: reengagementExecutions.executedAt,
      status: reengagementExecutions.status,
      errorMessage: reengagementExecutions.errorMessage,
    })
    .from(reengagementExecutions)
    .leftJoin(reengagementWorkflows, eq(reengagementExecutions.workflowId, reengagementWorkflows.id))
    .where(eq(reengagementWorkflows.userId, userId))
    .orderBy(desc(reengagementExecutions.executedAt))
    .limit(limit);
  
  return executions;
}


// ===== Account Management =====

export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserAccountStatus(
  userId: number,
  status: "active" | "inactive" | "suspended" | "trial"
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update account status: database not available");
    return false;
  }
  
  const updates: Record<string, any> = {
    accountStatus: status,
  };
  
  if (status === "active") {
    updates.accountActivatedAt = new Date();
    updates.accountDeactivatedAt = null;
  } else if (status === "inactive" || status === "suspended") {
    updates.accountDeactivatedAt = new Date();
  }
  
  await db.update(users).set(updates).where(eq(users.id, userId));
  return true;
}

export async function updateUserBilling(
  userId: number,
  data: {
    billingCycle?: "monthly" | "yearly" | "none";
    nextBillingDate?: Date | null;
    subscriptionTier?: "free" | "basic" | "pro" | "enterprise";
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update billing: database not available");
    return false;
  }
  
  await db.update(users).set(data).where(eq(users.id, userId));
  return true;
}


// ============================================
// BILLING & INVOICE FUNCTIONS
// ============================================

/**
 * Create or update a Stripe customer ID for a user
 */
export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ 
    paymentMethodId: stripeCustomerId,
    hasPaymentMethod: 1
  }).where(eq(users.id, userId));
}

/**
 * Create an invoice record
 */
export async function createInvoice(invoice: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(invoices).values(invoice);
  return result;
}

/**
 * Get user invoices
 */
export async function getUserInvoices(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt))
    .limit(limit);
}

/**
 * Get a specific invoice
 */
export async function getInvoiceById(invoiceId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  
  if (result.length > 0 && result[0].userId === userId) {
    return result[0];
  }
  return undefined;
}

/**
 * Get invoice by Stripe ID
 */
export async function getInvoiceByStripeId(stripeInvoiceId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(invoices)
    .where(eq(invoices.stripeInvoiceId, stripeInvoiceId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update invoice
 */
export async function updateInvoice(invoiceId: number, updates: Partial<Invoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(invoices).set(updates).where(eq(invoices.id, invoiceId));
}

/**
 * Create a payment record
 */
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values(payment);
  return result;
}

/**
 * Get user payments
 */
export async function getUserPayments(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

/**
 * Get payment by Stripe ID
 */
export async function getPaymentByStripeId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update payment
 */
export async function updatePayment(paymentId: number, updates: Partial<Payment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments).set(updates).where(eq(payments.id, paymentId));
}

/**
 * Get subscription plan by tier
 */
export async function getSubscriptionPlanByTier(tier: "free" | "basic" | "pro" | "enterprise") {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.tier, tier))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all active subscription plans
 */
export async function getActiveSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, 1));
}

/**
 * Create subscription plan
 */
export async function createSubscriptionPlan(plan: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(subscriptionPlans).values(plan);
  return result;
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(planId: number, updates: Partial<SubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, planId));
}


// ==================== Admin Billing Metrics ====================

/**
 * Get total revenue for a date range
 */
export async function getTotalRevenue(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { total: 0, count: 0 };
  
  let query = db.select({
    total: sql<number>`COALESCE(SUM(amount), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(payments).where(eq(payments.status, "succeeded"));
  
  if (startDate && endDate) {
    query = db.select({
      total: sql<number>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(payments).where(
      and(
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate)
      )
    );
  }
  
  const result = await query;
  return result[0] || { total: 0, count: 0 };
}

/**
 * Get monthly revenue for the last N months
 */
export async function getMonthlyRevenue(months: number = 12) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
    revenue: sql<number>`COALESCE(SUM(amount), 0)`,
    count: sql<number>`COUNT(*)`,
  })
    .from(payments)
    .where(
      and(
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, sql`DATE_SUB(NOW(), INTERVAL ${months} MONTH)`)
      )
    )
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`);
  
  return result;
}

/**
 * Get subscription counts by tier
 */
export async function getSubscriptionCountsByTier() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    tier: users.subscriptionTier,
    count: sql<number>`COUNT(*)`,
  })
    .from(users)
    .groupBy(users.subscriptionTier);
  
  return result;
}

/**
 * Get recent payments with user info
 */
export async function getRecentPayments(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: payments.id,
    amount: payments.amount,
    currency: payments.currency,
    status: payments.status,
    paymentMethodType: payments.paymentMethodType,
    description: payments.description,
    createdAt: payments.createdAt,
    userId: payments.userId,
    userName: users.name,
    userEmail: users.email,
  })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
  
  return result;
}

/**
 * Get revenue by subscription tier
 */
export async function getRevenueByTier() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    tier: users.subscriptionTier,
    revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
    count: sql<number>`COUNT(DISTINCT ${payments.id})`,
  })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .where(eq(payments.status, "succeeded"))
    .groupBy(users.subscriptionTier);
  
  return result;
}

/**
 * Get daily revenue for the last N days
 */
export async function getDailyRevenue(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    date: sql<string>`DATE(createdAt)`,
    revenue: sql<number>`COALESCE(SUM(amount), 0)`,
    count: sql<number>`COUNT(*)`,
  })
    .from(payments)
    .where(
      and(
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, sql`DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
      )
    )
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
  
  return result;
}

/**
 * Get billing metrics summary
 */
export async function getBillingMetricsSummary() {
  const db = await getDb();
  if (!db) return null;
  
  // Get current month dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Get current month revenue
  const currentMonthRevenue = await getTotalRevenue(startOfMonth, now);
  
  // Get last month revenue
  const lastMonthRevenue = await getTotalRevenue(startOfLastMonth, endOfLastMonth);
  
  // Get all-time revenue
  const allTimeRevenue = await getTotalRevenue();
  
  // Get subscription counts
  const subscriptionCounts = await getSubscriptionCountsByTier();
  
  // Calculate growth rate
  const growthRate = lastMonthRevenue.total > 0 
    ? ((currentMonthRevenue.total - lastMonthRevenue.total) / lastMonthRevenue.total) * 100 
    : 0;
  
  return {
    currentMonthRevenue: currentMonthRevenue.total,
    currentMonthTransactions: currentMonthRevenue.count,
    lastMonthRevenue: lastMonthRevenue.total,
    lastMonthTransactions: lastMonthRevenue.count,
    allTimeRevenue: allTimeRevenue.total,
    allTimeTransactions: allTimeRevenue.count,
    growthRate,
    subscriptionCounts,
  };
}
