import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, InsertLead, searchHistory, InsertSearchHistory, enrichmentData, InsertEnrichmentData, conversations, InsertConversation, messages, InsertMessage, conversationTemplates, InsertConversationTemplate, emailTemplates, InsertEmailTemplate, sentEmails, InsertSentEmail, emailSequences, InsertEmailSequence, sequenceSteps, InsertSequenceStep, sequenceEnrollments, InsertSequenceEnrollment, emailClicks, InsertEmailClick, emailOpens, InsertEmailOpen, reengagementWorkflows, InsertReengagementWorkflow, reengagementExecutions } from "../drizzle/schema";
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
