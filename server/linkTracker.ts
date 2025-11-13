/**
 * Link tracking utility for email click tracking
 * Wraps URLs in emails with tracking links
 */

const TRACKING_DOMAIN = process.env.VITE_APP_URL || 'http://localhost:3000';

/**
 * Generate a tracking URL for a given original URL
 * @param originalUrl The original destination URL
 * @param sentEmailId The ID of the sent email
 * @param leadId Optional lead ID for attribution
 * @returns Tracking URL that redirects to original after logging click
 */
export function generateTrackingUrl(originalUrl: string, sentEmailId: number, leadId?: number): string {
  const params = new URLSearchParams({
    url: originalUrl,
    eid: sentEmailId.toString(),
  });
  
  if (leadId) {
    params.append('lid', leadId.toString());
  }
  
  return `${TRACKING_DOMAIN}/api/track/click?${params.toString()}`;
}

/**
 * Wrap all links in HTML email body with tracking URLs
 * @param htmlBody The HTML email body
 * @param sentEmailId The ID of the sent email
 * @param leadId Optional lead ID for attribution
 * @returns HTML with wrapped tracking links
 */
export function wrapLinksWithTracking(htmlBody: string, sentEmailId: number, leadId?: number): string {
  // Match all <a href="..."> tags
  const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
  
  return htmlBody.replace(linkRegex, (match, before, url, after) => {
    // Skip if already a tracking link
    if (url.includes('/api/track/click')) {
      return match;
    }
    
    // Skip mailto: and tel: links
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match;
    }
    
    const trackingUrl = generateTrackingUrl(url, sentEmailId, leadId);
    return `<a ${before}href="${trackingUrl}"${after}>`;
  });
}

/**
 * Extract all links from HTML email body
 * @param htmlBody The HTML email body
 * @returns Array of URLs found in the email
 */
export function extractLinks(htmlBody: string): string[] {
  const linkRegex = /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>/gi;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(htmlBody)) !== null) {
    const url = match[1];
    // Skip mailto: and tel: links
    if (!url.startsWith('mailto:') && !url.startsWith('tel:')) {
      links.push(url);
    }
  }
  
  return links;
}
