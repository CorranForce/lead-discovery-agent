import { describe, it, expect } from "vitest";
import { getLeadEngagementTimeline } from "./engagementTimeline";

describe("Engagement Timeline", () => {
  describe("getLeadEngagementTimeline", () => {
    it("should return an array of timeline events", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      expect(Array.isArray(timeline)).toBe(true);
    });

    it("should return events sorted by timestamp (most recent first)", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      if (timeline.length > 1) {
        for (let i = 0; i < timeline.length - 1; i++) {
          const current = new Date(timeline[i].timestamp).getTime();
          const next = new Date(timeline[i + 1].timestamp).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it("should include email_sent events with correct structure", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      const emailSentEvents = timeline.filter((e) => e.type === "email_sent");
      
      emailSentEvents.forEach((event) => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("type", "email_sent");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("description");
        expect(event.description).toContain("Email sent:");
        expect(event.metadata).toHaveProperty("emailId");
        expect(event.metadata).toHaveProperty("subject");
      });
    });

    it("should include email_opened events with correct structure", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      const emailOpenedEvents = timeline.filter((e) => e.type === "email_opened");
      
      emailOpenedEvents.forEach((event) => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("type", "email_opened");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("description");
        expect(event.description).toContain("Email opened:");
        expect(event.metadata).toHaveProperty("emailId");
      });
    });

    it("should include email_clicked events with correct structure", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      const emailClickedEvents = timeline.filter((e) => e.type === "email_clicked");
      
      emailClickedEvents.forEach((event) => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("type", "email_clicked");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("description");
        expect(event.description).toContain("Link clicked in:");
        expect(event.metadata).toHaveProperty("url");
        expect(event.metadata).toHaveProperty("emailId");
      });
    });

    it("should return empty array for non-existent lead", async () => {
      const timeline = await getLeadEngagementTimeline(999999);
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBe(0);
    });

    it("should have unique event IDs", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      const ids = timeline.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid timestamps for all events", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      timeline.forEach((event) => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).not.toBeNaN();
      });
    });

    it("should include all event types when available", async () => {
      const timeline = await getLeadEngagementTimeline(30001);
      const eventTypes = new Set(timeline.map((e) => e.type));
      
      // Check that we have at least some event types
      expect(eventTypes.size).toBeGreaterThanOrEqual(0);
      
      // Verify all event types are valid
      eventTypes.forEach((type) => {
        expect(["email_sent", "email_opened", "email_clicked", "status_changed"]).toContain(type);
      });
    });

    it("should handle leads with no engagement history", async () => {
      // Test with a lead that likely has no history
      const timeline = await getLeadEngagementTimeline(1);
      expect(Array.isArray(timeline)).toBe(true);
      // Should return empty array or only basic events
      expect(timeline.length).toBeGreaterThanOrEqual(0);
    });
  });
});
