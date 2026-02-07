import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { emailSequences, sequenceEnrollments } from "../../drizzle/schema";

/**
 * Enroll a user in all active sequences with signup trigger
 */
export async function enrollInSignupSequences(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[SequenceEnrollment] Database not available");
    return;
  }

  try {
    // Find all active sequences with signup trigger
    const signupSequences = await db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.triggerType, "signup"));

    if (signupSequences.length === 0) {
      console.log("[SequenceEnrollment] No active signup sequences found");
      return;
    }

    // Enroll user in each signup sequence
    for (const sequence of signupSequences) {
      try {
        await db.insert(sequenceEnrollments).values({
          sequenceId: sequence.id,
          leadId: userId, // Using userId as leadId for now
          currentStep: 0,
          status: "active",
          enrolledAt: new Date(),
        });
        console.log(`[SequenceEnrollment] Enrolled user ${userId} in sequence ${sequence.id} (${sequence.name})`);
      } catch (enrollError) {
        // Skip if already enrolled (duplicate key error)
        console.warn(`[SequenceEnrollment] Could not enroll user ${userId} in sequence ${sequence.id}:`, enrollError);
      }
    }
  } catch (error) {
    console.error("[SequenceEnrollment] Failed to enroll in signup sequences:", error);
    throw error;
  }
}
