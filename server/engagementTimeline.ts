import { getDb } from "./db";
import { sentEmails, emailOpens, emailClicks, leads } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export type TimelineEvent = {
  id: string;
  type: "email_sent" | "email_opened" | "email_clicked" | "status_changed";
  timestamp: Date;
  description: string;
  metadata?: Record<string, unknown>;
};

export async function getLeadEngagementTimeline(leadId: number): Promise<TimelineEvent[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const events: TimelineEvent[] = [];

  // Fetch sent emails
  const emails = await db
    .select()
    .from(sentEmails)
    .where(eq(sentEmails.leadId, leadId))
    .orderBy(desc(sentEmails.sentAt));

  for (const email of emails) {
    events.push({
      id: `email-${email.id}`,
      type: "email_sent",
      timestamp: email.sentAt,
      description: `Email sent: ${email.subject}`,
      metadata: {
        emailId: email.id,
        subject: email.subject,
        templateId: email.templateId,
      },
    });
  }

  // Fetch email opens
  const opens = await db
    .select({
      id: emailOpens.id,
      openedAt: emailOpens.openedAt,
      sentEmailId: emailOpens.sentEmailId,
      subject: sentEmails.subject,
    })
    .from(emailOpens)
    .leftJoin(sentEmails, eq(emailOpens.sentEmailId, sentEmails.id))
    .where(eq(emailOpens.leadId, leadId))
    .orderBy(desc(emailOpens.openedAt));

  for (const open of opens) {
    events.push({
      id: `open-${open.id}`,
      type: "email_opened",
      timestamp: open.openedAt,
      description: `Email opened: ${open.subject || "Unknown"}`,
      metadata: {
        emailId: open.sentEmailId,
      },
    });
  }

  // Fetch email clicks
  const clicks = await db
    .select({
      id: emailClicks.id,
      clickedAt: emailClicks.clickedAt,
      originalUrl: emailClicks.originalUrl,
      sentEmailId: emailClicks.sentEmailId,
      subject: sentEmails.subject,
    })
    .from(emailClicks)
    .leftJoin(sentEmails, eq(emailClicks.sentEmailId, sentEmails.id))
    .where(eq(emailClicks.leadId, leadId))
    .orderBy(desc(emailClicks.clickedAt));

  for (const click of clicks) {
    events.push({
      id: `click-${click.id}`,
      type: "email_clicked",
      timestamp: click.clickedAt,
      description: `Link clicked in: ${click.subject || "Unknown"}`,
      metadata: {
        url: click.originalUrl,
        emailId: click.sentEmailId,
      },
    });
  }

  // Sort all events by timestamp (most recent first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}
