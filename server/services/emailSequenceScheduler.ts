import { getDb } from "../db";
import { sendFollowUpEmail } from "./followUpSequence";
import { sql } from "drizzle-orm";

/**
 * Schedule follow-up emails for a new lead
 * Email 1: Day 2 after welcome email
 * Email 2: Day 4 after welcome email
 * Email 3: Day 7 after welcome email
 */
export async function scheduleFollowUpEmails(leadId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Email Sequence] Database not available");
    return;
  }
  
  const now = new Date();
  
  // Schedule Email 1 for 2 days from now
  const email1Date = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  
  // Schedule Email 2 for 4 days from now
  const email2Date = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  
  // Schedule Email 3 for 7 days from now
  const email3Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  try {
    await db.execute(sql`
      INSERT INTO emailSequenceLog (leadId, emailNumber, scheduledFor)
      VALUES 
        (${leadId}, 1, ${email1Date}),
        (${leadId}, 2, ${email2Date}),
        (${leadId}, 3, ${email3Date})
    `);
    
    console.log(`[Email Sequence] Scheduled 3 follow-up emails for lead ${leadId}`);
  } catch (error) {
    console.error("[Email Sequence] Failed to schedule emails:", error);
  }
}

/**
 * Process pending follow-up emails
 * This function should be called periodically (e.g., every hour) by a scheduler
 */
export async function processPendingEmails() {
  const db = await getDb();
  if (!db) {
    console.warn("[Email Sequence] Database not available");
    return;
  }
  
  try {
    // Find all emails scheduled to be sent now or in the past that haven't been sent yet
    const pendingEmails: any = await db.execute(sql`
      SELECT 
        esl.id as logId,
        esl.leadId,
        esl.emailNumber,
        l.contactName,
        l.contactEmail
      FROM emailSequenceLog esl
      INNER JOIN leads l ON esl.leadId = l.id
      WHERE esl.scheduledFor <= NOW()
        AND esl.sentAt IS NULL
        AND l.contactEmail IS NOT NULL
      ORDER BY esl.scheduledFor ASC
      LIMIT 50
    `);
    
    const emails = (pendingEmails.rows || pendingEmails) as any[];
    
    if (emails.length === 0) {
      console.log("[Email Sequence] No pending emails to send");
      return;
    }
    
    console.log(`[Email Sequence] Processing ${emails.length} pending emails`);
    
    for (const email of emails) {
      try {
        // Skip if contact info is missing
        if (!email.contactEmail || !email.contactName) {
          console.warn(`[Email Sequence] Skipping email ${email.emailNumber} for lead ${email.leadId}: missing contact info`);
          continue;
        }
        
        // Send the follow-up email
        const result = await sendFollowUpEmail({
          to: email.contactEmail,
          leadName: email.contactName,
          emailNumber: email.emailNumber as 1 | 2 | 3,
        });
        
        if (result.success) {
          // Mark as sent
          await db.execute(sql`
            UPDATE emailSequenceLog
            SET sentAt = NOW()
            WHERE id = ${email.logId}
          `);
          
          console.log(`[Email Sequence] Sent email ${email.emailNumber} to lead ${email.leadId}`);
        } else {
          console.error(`[Email Sequence] Failed to send email ${email.emailNumber} to lead ${email.leadId}:`, result.error);
        }
        
        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Email Sequence] Error processing email for lead ${email.leadId}:`, error);
      }
    }
    
    console.log(`[Email Sequence] Finished processing ${emails.length} emails`);
    
  } catch (error) {
    console.error("[Email Sequence] Error in processPendingEmails:", error);
  }
}

/**
 * Start the email sequence scheduler
 * Runs every hour to check for pending emails
 */
export function startEmailSequenceScheduler() {
  // Run immediately on startup
  processPendingEmails().catch(console.error);
  
  // Then run every hour
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  setInterval(() => {
    processPendingEmails().catch(console.error);
  }, intervalMs);
  
  console.log("[Email Sequence] Scheduler started (runs every hour)");
}
