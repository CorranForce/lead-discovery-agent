import { eq, and, lte, gte, or, isNull } from "drizzle-orm";
import { announcements, type InsertAnnouncement } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Get all active announcements (considering date range and isActive flag)
 */
export async function getActiveAnnouncements() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  
  const result = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, 1),
        or(
          isNull(announcements.startDate),
          lte(announcements.startDate, now)
        ),
        or(
          isNull(announcements.endDate),
          gte(announcements.endDate, now)
        )
      )
    )
    .orderBy(announcements.createdAt);

  return result;
}

/**
 * Get all announcements (admin view)
 */
export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(announcements)
    .orderBy(announcements.createdAt);

  return result;
}

/**
 * Get announcement by ID
 */
export async function getAnnouncementById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(data: InsertAnnouncement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(announcements).values(data);
  return result;
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(announcements)
    .set(data)
    .where(eq(announcements.id, id));

  return result;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(announcements)
    .where(eq(announcements.id, id));

  return result;
}

/**
 * Toggle announcement active status
 */
export async function toggleAnnouncementStatus(id: number, isActive: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(announcements)
    .set({ isActive })
    .where(eq(announcements.id, id));

  return result;
}
