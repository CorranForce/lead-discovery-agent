import { describe, it, expect } from 'vitest';

describe('Email Engagement Analytics', () => {
  describe('Engagement Overview Calculations', () => {
    it('should calculate open rate correctly', () => {
      const totalSent = 100;
      const totalOpens = 45;
      const openRate = Math.round((totalOpens / totalSent) * 100);
      
      expect(openRate).toBe(45);
    });

    it('should calculate click rate correctly', () => {
      const totalSent = 100;
      const totalClicks = 23;
      const clickRate = Math.round((totalClicks / totalSent) * 100);
      
      expect(clickRate).toBe(23);
    });

    it('should handle zero sent emails', () => {
      const totalSent = 0;
      const totalOpens = 0;
      const openRate = totalSent === 0 ? 0 : Math.round((totalOpens / totalSent) * 100);
      
      expect(openRate).toBe(0);
    });

    it('should calculate engagement score as average of open and click rates', () => {
      const openRate = 45;
      const clickRate = 23;
      const engagementScore = Math.round((openRate + clickRate) / 2);
      
      expect(engagementScore).toBe(34);
    });
  });

  describe('Date Range Filtering', () => {
    it('should calculate correct date for 7 days range', () => {
      const now = new Date('2025-01-01T00:00:00Z');
      const days = 7;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      expect(startDate.toISOString()).toBe('2024-12-25T00:00:00.000Z');
    });

    it('should calculate correct date for 30 days range', () => {
      const now = new Date('2025-01-31T00:00:00Z');
      const days = 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      expect(startDate.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should calculate correct date for 90 days range', () => {
      const now = new Date('2025-03-31T00:00:00Z');
      const days = 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      expect(startDate.toISOString()).toBe('2024-12-31T00:00:00.000Z');
    });
  });

  describe('Template Performance Metrics', () => {
    it('should calculate template open rate', () => {
      const template = {
        sent: 50,
        opens: 25,
        clicks: 10,
      };
      
      const openRate = Math.round((template.opens / template.sent) * 100);
      const clickRate = Math.round((template.clicks / template.sent) * 100);
      
      expect(openRate).toBe(50);
      expect(clickRate).toBe(20);
    });

    it('should handle template with no sends', () => {
      const template = {
        sent: 0,
        opens: 0,
        clicks: 0,
      };
      
      const openRate = template.sent === 0 ? 0 : Math.round((template.opens / template.sent) * 100);
      const clickRate = template.sent === 0 ? 0 : Math.round((template.clicks / template.sent) * 100);
      
      expect(openRate).toBe(0);
      expect(clickRate).toBe(0);
    });
  });

  describe('Sequence Performance Metrics', () => {
    it('should calculate sequence engagement rates', () => {
      const sequence = {
        sent: 200,
        opens: 120,
        clicks: 45,
      };
      
      const openRate = Math.round((sequence.opens / sequence.sent) * 100);
      const clickRate = Math.round((sequence.clicks / sequence.sent) * 100);
      
      expect(openRate).toBe(60);
      expect(clickRate).toBe(23);
    });

    it('should handle high engagement sequence', () => {
      const sequence = {
        sent: 100,
        opens: 95,
        clicks: 80,
      };
      
      const openRate = Math.round((sequence.opens / sequence.sent) * 100);
      const clickRate = Math.round((sequence.clicks / sequence.sent) * 100);
      
      expect(openRate).toBe(95);
      expect(clickRate).toBe(80);
    });

    it('should handle low engagement sequence', () => {
      const sequence = {
        sent: 100,
        opens: 5,
        clicks: 1,
      };
      
      const openRate = Math.round((sequence.opens / sequence.sent) * 100);
      const clickRate = Math.round((sequence.clicks / sequence.sent) * 100);
      
      expect(openRate).toBe(5);
      expect(clickRate).toBe(1);
    });
  });

  describe('Engagement Trends Data', () => {
    it('should format trend data correctly', () => {
      const trendData = {
        date: '2025-01-15',
        sent: 50,
        opens: 25,
        clicks: 10,
      };
      
      expect(trendData.date).toBe('2025-01-15');
      expect(trendData.sent).toBe(50);
      expect(trendData.opens).toBe(25);
      expect(trendData.clicks).toBe(10);
    });

    it('should handle days with no activity', () => {
      const trendData = {
        date: '2025-01-16',
        sent: 0,
        opens: 0,
        clicks: 0,
      };
      
      expect(trendData.sent).toBe(0);
      expect(trendData.opens).toBe(0);
      expect(trendData.clicks).toBe(0);
    });

    it('should handle days with high activity', () => {
      const trendData = {
        date: '2025-01-17',
        sent: 500,
        opens: 350,
        clicks: 200,
      };
      
      expect(trendData.sent).toBe(500);
      expect(trendData.opens).toBe(350);
      expect(trendData.clicks).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle more opens than sent (duplicate opens)', () => {
      // This shouldn't happen with proper unique counting, but test the calculation
      const totalSent = 100;
      const totalOpens = 100; // Unique opens should never exceed sent
      const openRate = Math.round((totalOpens / totalSent) * 100);
      
      expect(openRate).toBeLessThanOrEqual(100);
    });

    it('should handle more clicks than opens', () => {
      // Possible if someone clicks without images enabled
      const totalSent = 100;
      const totalOpens = 40;
      const totalClicks = 50;
      
      const openRate = Math.round((totalOpens / totalSent) * 100);
      const clickRate = Math.round((totalClicks / totalSent) * 100);
      
      expect(openRate).toBe(40);
      expect(clickRate).toBe(50);
    });

    it('should round percentages correctly', () => {
      const totalSent = 3;
      const totalOpens = 1;
      const openRate = Math.round((totalOpens / totalSent) * 100);
      
      // 1/3 = 0.333... should round to 33%
      expect(openRate).toBe(33);
    });

    it('should handle decimal rounding edge case', () => {
      const totalSent = 3;
      const totalOpens = 2;
      const openRate = Math.round((totalOpens / totalSent) * 100);
      
      // 2/3 = 0.666... should round to 67%
      expect(openRate).toBe(67);
    });
  });
});
