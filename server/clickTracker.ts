/**
 * Public click tracking endpoint
 * This handles /api/track/click requests and logs clicks before redirecting
 */

import { Request, Response } from "express";
import { createEmailClick, getLeadById, getLeadEmailClicks, updateLeadScore } from "./db";
import { calculateLeadScore } from "./leadScoring";

export async function handleClickTracking(req: Request, res: Response) {
  try {
    const { url, eid, lid } = req.query;
    
    if (!url || !eid) {
      return res.status(400).send("Missing required parameters");
    }
    
    const originalUrl = decodeURIComponent(url as string);
    const sentEmailId = parseInt(eid as string, 10);
    const leadId = lid ? parseInt(lid as string, 10) : undefined;
    
    // Log the click
    await createEmailClick({
      sentEmailId,
      leadId,
      originalUrl,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });
    
    // Automatically recalculate lead score after click (if leadId provided)
    if (leadId) {
      try {
        const lead = await getLeadById(leadId, 0); // Pass 0 for userId since this is public endpoint
        if (lead) {
          const clicks = await getLeadEmailClicks(leadId);
          const emailClicks = clicks.length;
          const emailOpens = 0; // TODO: Track opens when available
          
          const scoringResult = calculateLeadScore(lead, emailOpens, emailClicks);
          await updateLeadScore(leadId, scoringResult.score);
          console.log(`[Score Update] Lead ${leadId} score updated to ${scoringResult.score} after click`);
        }
      } catch (error) {
        console.error(`[Score Update] Failed to update score for lead ${leadId}:`, error);
        // Don't fail the redirect if score update fails
      }
    }
    
    // Redirect to the original URL
    res.redirect(originalUrl);
  } catch (error) {
    console.error("[Click Tracking] Error:", error);
    res.status(500).send("Error tracking click");
  }
}
