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
  filters: text("filters"), // JSON object with applied filters
  resultsCount: int("resultsCount").default(0),
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