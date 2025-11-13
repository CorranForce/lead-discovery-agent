import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, InsertLead, searchHistory, InsertSearchHistory, enrichmentData, InsertEnrichmentData } from "../drizzle/schema";
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

// Search history queries
export async function createSearchHistory(search: InsertSearchHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(searchHistory).values(search);
}

export async function getUserSearchHistory(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(searchHistory.createdAt)
    .limit(limit);
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
