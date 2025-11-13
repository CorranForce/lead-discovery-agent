/**
 * Public click tracking endpoint
 * This handles /api/track/click requests and logs clicks before redirecting
 */

import { Request, Response } from "express";
import { createEmailClick } from "./db";

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
    
    // Redirect to the original URL
    res.redirect(originalUrl);
  } catch (error) {
    console.error("[Click Tracking] Error:", error);
    res.status(500).send("Error tracking click");
  }
}
