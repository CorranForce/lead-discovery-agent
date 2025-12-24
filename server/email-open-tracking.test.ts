/**
 * Unit tests for email open tracking functionality
 * Tests tracking pixel generation, embedding, and score updates
 */

import { describe, it, expect } from 'vitest';
import { generateTrackingPixelUrl, embedTrackingPixel } from './openTracker';

describe('Email Open Tracking', () => {
  describe('Tracking Pixel URL Generation', () => {
    it('should generate tracking pixel URL with sentEmailId', () => {
      const baseUrl = 'https://example.com';
      const sentEmailId = 123;
      
      const url = generateTrackingPixelUrl(baseUrl, sentEmailId);
      
      expect(url).toContain('/api/track/open');
      expect(url).toContain('sentEmailId=123');
    });

    it('should generate tracking pixel URL with sentEmailId and leadId', () => {
      const baseUrl = 'https://example.com';
      const sentEmailId = 123;
      const leadId = 456;
      
      const url = generateTrackingPixelUrl(baseUrl, sentEmailId, leadId);
      
      expect(url).toContain('/api/track/open');
      expect(url).toContain('sentEmailId=123');
      expect(url).toContain('leadId=456');
    });

    it('should handle different base URLs correctly', () => {
      const baseUrl = 'http://localhost:3000';
      const sentEmailId = 789;
      
      const url = generateTrackingPixelUrl(baseUrl, sentEmailId);
      
      expect(url.startsWith('http://localhost:3000/api/track/open')).toBe(true);
    });
  });

  describe('Tracking Pixel Embedding', () => {
    it('should embed tracking pixel before closing body tag', () => {
      const htmlContent = '<html><body><p>Hello World</p></body></html>';
      const trackingUrl = 'https://example.com/api/track/open?sentEmailId=123';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      expect(result).toContain('<img src="https://example.com/api/track/open?sentEmailId=123"');
      expect(result).toContain('width="1" height="1"');
      expect(result).toContain('</body>');
      expect(result.indexOf('<img')).toBeLessThan(result.indexOf('</body>'));
    });

    it('should append tracking pixel if no body tag exists', () => {
      const htmlContent = '<p>Simple HTML without body tag</p>';
      const trackingUrl = 'https://example.com/api/track/open?sentEmailId=456';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      expect(result).toContain('<img src="https://example.com/api/track/open?sentEmailId=456"');
      expect(result.endsWith('/>')).toBe(true);
    });

    it('should create invisible pixel with correct attributes', () => {
      const htmlContent = '<html><body>Test</body></html>';
      const trackingUrl = 'https://example.com/track';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      expect(result).toContain('width="1"');
      expect(result).toContain('height="1"');
      expect(result).toContain('alt=""');
      expect(result).toContain('display:block');
      expect(result).toContain('border:0');
      expect(result).toContain('outline:none');
    });

    it('should handle HTML with multiple body tags (use first)', () => {
      const htmlContent = '<html><body><p>First</p></body><body><p>Second</p></body></html>';
      const trackingUrl = 'https://example.com/track';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      // Should only add one tracking pixel before the first </body>
      const matches = result.match(/<img[^>]*>/g);
      expect(matches).toHaveLength(1);
    });

    it('should preserve original HTML content', () => {
      const htmlContent = '<html><body><h1>Title</h1><p>Content</p></body></html>';
      const trackingUrl = 'https://example.com/track';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Content</p>');
    });

    it('should handle special characters in tracking URL', () => {
      const htmlContent = '<html><body>Test</body></html>';
      const trackingUrl = 'https://example.com/track?id=123&lead=456';
      
      const result = embedTrackingPixel(htmlContent, trackingUrl);
      
      expect(result).toContain('src="https://example.com/track?id=123&lead=456"');
    });
  });

  describe('Integration Scenarios', () => {
    it('should generate and embed tracking pixel in complete workflow', () => {
      const baseUrl = 'https://app.example.com';
      const sentEmailId = 999;
      const leadId = 888;
      const emailHtml = '<html><body><p>Dear Customer,</p><p>Thank you!</p></body></html>';
      
      // Generate tracking URL
      const trackingUrl = generateTrackingPixelUrl(baseUrl, sentEmailId, leadId);
      
      // Embed in email
      const trackedEmail = embedTrackingPixel(emailHtml, trackingUrl);
      
      // Verify complete integration
      expect(trackedEmail).toContain('Dear Customer');
      expect(trackedEmail).toContain('Thank you!');
      expect(trackedEmail).toContain('<img src="https://app.example.com/api/track/open?sentEmailId=999&leadId=888"');
      expect(trackedEmail).toContain('width="1" height="1"');
    });

    it('should handle minimal email content', () => {
      const baseUrl = 'https://example.com';
      const sentEmailId = 1;
      const emailHtml = 'Plain text email';
      
      const trackingUrl = generateTrackingPixelUrl(baseUrl, sentEmailId);
      const trackedEmail = embedTrackingPixel(emailHtml, trackingUrl);
      
      expect(trackedEmail).toContain('Plain text email');
      expect(trackedEmail).toContain('<img src="https://example.com/api/track/open?sentEmailId=1"');
    });

    it('should handle complex HTML with nested elements', () => {
      const baseUrl = 'https://example.com';
      const sentEmailId = 555;
      const emailHtml = `
        <html>
          <head><title>Email</title></head>
          <body>
            <div class="container">
              <header><h1>Newsletter</h1></header>
              <main>
                <article>
                  <p>Content here</p>
                </article>
              </main>
              <footer>Unsubscribe</footer>
            </div>
          </body>
        </html>
      `;
      
      const trackingUrl = generateTrackingPixelUrl(baseUrl, sentEmailId);
      const trackedEmail = embedTrackingPixel(emailHtml, trackingUrl);
      
      expect(trackedEmail).toContain('Newsletter');
      expect(trackedEmail).toContain('Content here');
      expect(trackedEmail).toContain('Unsubscribe');
      expect(trackedEmail).toContain('<img src="https://example.com/api/track/open?sentEmailId=555"');
      
      // Pixel should be after all content but before </body>
      const pixelIndex = trackedEmail.indexOf('<img');
      const footerIndex = trackedEmail.indexOf('Unsubscribe');
      const bodyCloseIndex = trackedEmail.indexOf('</body>');
      
      expect(pixelIndex).toBeGreaterThan(footerIndex);
      expect(pixelIndex).toBeLessThan(bodyCloseIndex);
    });
  });
});
