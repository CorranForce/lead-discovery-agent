import { Request, Response } from "express";
import { createEmailOpen, getLeadById, getLeadEmailClicks, getLeadEmailOpens, updateLeadScore } from "./db";
import { calculateLeadScore } from "./leadScoring";

/**
 * 1x1 transparent PNG pixel in base64
 * This is the smallest possible PNG image
 */
const TRACKING_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

/**
 * Handle tracking pixel requests
 * When an email client loads the tracking pixel, we log the open event
 */
export async function handleOpenTracking(req: Request, res: Response) {
  try {
    const { sentEmailId, leadId } = req.query;

    if (!sentEmailId) {
      console.error("[Open Tracker] Missing sentEmailId parameter");
      return res.status(400).send("Missing sentEmailId");
    }

    // Log the email open event
    await createEmailOpen({
      sentEmailId: parseInt(sentEmailId as string),
      leadId: leadId ? parseInt(leadId as string) : null,
      ipAddress: req.ip || req.headers["x-forwarded-for"] as string || null,
      userAgent: req.headers["user-agent"] || null,
    });

    console.log(`[Open Tracker] Email opened - sentEmailId: ${sentEmailId}, leadId: ${leadId || "N/A"}`);

    // Automatically recalculate lead score after open (if leadId provided)
    if (leadId) {
      try {
        const lead = await getLeadById(parseInt(leadId as string), 0); // Pass 0 for userId since this is public endpoint
        if (lead) {
          const clicks = await getLeadEmailClicks(parseInt(leadId as string));
          const opens = await getLeadEmailOpens(parseInt(leadId as string));
          const emailClicks = clicks.length;
          const emailOpens = opens.length;
          
          const scoringResult = calculateLeadScore(lead, emailOpens, emailClicks);
          await updateLeadScore(parseInt(leadId as string), scoringResult.score);
          console.log(`[Score Update] Lead ${leadId} score updated to ${scoringResult.score} after email open`);
        }
      } catch (error) {
        console.error(`[Score Update] Failed to update score for lead ${leadId}:`, error);
        // Don't fail the pixel if score update fails
      }
    }

    // Return the 1x1 transparent PNG
    res.set({
      "Content-Type": "image/png",
      "Content-Length": TRACKING_PIXEL.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });

    return res.send(TRACKING_PIXEL);
  } catch (error) {
    console.error("[Open Tracker] Error tracking email open:", error);
    
    // Still return the pixel even if tracking fails
    // This prevents broken images in the email
    res.set({
      "Content-Type": "image/png",
      "Content-Length": TRACKING_PIXEL.length,
    });
    return res.send(TRACKING_PIXEL);
  }
}

/**
 * Generate tracking pixel URL for a sent email
 */
export function generateTrackingPixelUrl(baseUrl: string, sentEmailId: number, leadId?: number): string {
  const params = new URLSearchParams({
    sentEmailId: sentEmailId.toString(),
  });

  if (leadId) {
    params.append("leadId", leadId.toString());
  }

  return `${baseUrl}/api/track/open?${params.toString()}`;
}

/**
 * Embed tracking pixel in email HTML
 * Should be placed at the end of the email body
 */
export function embedTrackingPixel(htmlContent: string, trackingPixelUrl: string): string {
  const pixelImg = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;outline:none;" />`;
  
  // Try to insert before closing </body> tag
  if (htmlContent.includes("</body>")) {
    return htmlContent.replace("</body>", `${pixelImg}</body>`);
  }
  
  // Otherwise append to the end
  return htmlContent + pixelImg;
}
