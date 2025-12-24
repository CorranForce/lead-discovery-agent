import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Profile fields
  bio: text("bio"),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  location: varchar("location", { length: 255 }),
  // Preferences
  emailNotifications: int("emailNotifications").default(1), // 1 = enabled, 0 = disabled
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
  useRealData: int("useRealData").default(0).notNull(), // 0 = test/template data, 1 = real Apollo.io data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leads table - stores discovered leads and their information
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  companyName: varchar("companyName", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 255 }),
  companySize: varchar("companySize", { length: 100 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  contactName: varchar("contactName", { length: 255 }),
  contactTitle: varchar("contactTitle", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactLinkedin: varchar("contactLinkedin", { length: 500 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "unqualified", "converted"]).default("new").notNull(),
  score: int("score").default(0), // Lead scoring 0-100
  notes: text("notes"),
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Search history table - tracks user's lead discovery searches
 */
export const searchHistory = mysqlTable("searchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  query: text("query").notNull(), // Natural language search query
  industry: varchar("industry", { length: 255 }), // Selected industry filter
  companySize: varchar("companySize", { length: 100 }), // Selected company size filter
  location: varchar("location", { length: 255 }), // Location filter
  filters: text("filters"), // JSON object with all applied filters
  resultsCount: int("resultsCount").default(0),
  isFavorite: int("isFavorite").default(0).notNull(), // 0 = not favorite, 1 = favorite
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * Enrichment data table - stores additional enriched information about leads
 */
export const enrichmentData = mysqlTable("enrichmentData", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(), // Foreign key to leads table
  dataType: varchar("dataType", { length: 100 }).notNull(), // e.g., "technology", "funding", "social_media"
  dataKey: varchar("dataKey", { length: 255 }).notNull(), // e.g., "tech_stack", "last_funding_round"
  dataValue: text("dataValue").notNull(), // JSON or text value
  source: varchar("source", { length: 255 }), // Where the data came from
  confidence: int("confidence").default(0), // Confidence score 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EnrichmentData = typeof enrichmentData.$inferSelect;
export type InsertEnrichmentData = typeof enrichmentData.$inferInsert;

/**
 * Conversations table - stores sales conversations with leads
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  leadId: int("leadId"), // Optional foreign key to leads table
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "closed", "follow_up_needed", "won", "lost"]).default("active").notNull(),
  sentiment: varchar("sentiment", { length: 50 }), // positive, neutral, negative
  summary: text("summary"), // AI-generated summary
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(), // Foreign key to conversations table
  role: mysqlEnum("role", ["user", "lead", "ai_suggestion"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON for additional data like sentiment, suggestions
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Conversation templates - pre-built sales scripts and templates
 */
export const conversationTemplates = mysqlTable("conversationTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // NULL for system templates, user ID for custom templates
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., "cold_outreach", "follow_up", "closing"
  content: text("content").notNull(), // The template content
  isPublic: int("isPublic").default(0), // 0 = private, 1 = public
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConversationTemplate = typeof conversationTemplates.$inferSelect;
export type InsertConversationTemplate = typeof conversationTemplates.$inferInsert;

/**
 * Email templates - pre-built email templates for outreach
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // NULL for system templates, user ID for custom templates
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }), // e.g., "cold_outreach", "follow_up", "thank_you"
  variables: text("variables"), // JSON array of available variables like {{firstName}}, {{companyName}}
  isPublic: int("isPublic").default(0), // 0 = private, 1 = public
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Sent emails - tracking emails sent from the platform
 */
export const sentEmails = mysqlTable("sentEmails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leadId: int("leadId"), // Optional link to lead
  conversationId: int("conversationId"), // Optional link to conversation
  templateId: int("templateId"), // Optional link to template used
  sequenceId: int("sequenceId"), // Optional link to email sequence
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["sent", "failed", "bounced"]).default("sent").notNull(),
  gmailMessageId: varchar("gmailMessageId", { length: 255 }), // Gmail message ID for tracking
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type SentEmail = typeof sentEmails.$inferSelect;
export type InsertSentEmail = typeof sentEmails.$inferInsert;

/**
 * Email click tracking table
 * Tracks when links in emails are clicked by recipients
 */
export const emailClicks = mysqlTable("emailClicks", {
  id: int("id").autoincrement().primaryKey(),
  sentEmailId: int("sentEmailId").notNull(),
  leadId: int("leadId"),
  originalUrl: text("originalUrl").notNull(),
  clickedAt: timestamp("clickedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type EmailClick = typeof emailClicks.$inferSelect;
export type InsertEmailClick = typeof emailClicks.$inferInsert;

/**
 * Email open tracking table
 * Tracks when emails are opened by recipients via tracking pixel
 */
export const emailOpens = mysqlTable("emailOpens", {
  id: int("id").autoincrement().primaryKey(),
  sentEmailId: int("sentEmailId").notNull(),
  leadId: int("leadId"),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type EmailOpen = typeof emailOpens.$inferSelect;
export type InsertEmailOpen = typeof emailOpens.$inferInsert;

// Email Sequences for automation
export const emailSequences = mysqlTable("emailSequences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: int("isActive").default(1), // 1 = active, 0 = paused
  triggerType: mysqlEnum("triggerType", ["manual", "status_change", "time_based"]).default("manual"),
  triggerCondition: text("triggerCondition"), // JSON: {status: "new"} or {days_after_creation: 1}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

export const sequenceSteps = mysqlTable("sequenceSteps", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  stepOrder: int("stepOrder").notNull(), // 1, 2, 3, etc.
  templateId: int("templateId"), // Reference to emailTemplates
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  delayDays: int("delayDays").default(0), // Days to wait before sending
  delayHours: int("delayHours").default(0), // Additional hours
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type InsertSequenceStep = typeof sequenceSteps.$inferInsert;

export const sequenceEnrollments = mysqlTable("sequenceEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  leadId: int("leadId").notNull(),
  currentStep: int("currentStep").default(0), // 0 = not started, 1+ = step number
  status: mysqlEnum("status", ["active", "completed", "paused", "failed"]).default("active"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  nextEmailScheduledAt: timestamp("nextEmailScheduledAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;
export type InsertSequenceEnrollment = typeof sequenceEnrollments.$inferInsert;