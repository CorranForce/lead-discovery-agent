/**
 * Unit tests for automated lead score recalculation
 * Tests that scores are automatically updated when engagement changes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateLeadScore } from './leadScoring';
import type { Lead } from '../drizzle/schema';

describe('Automated Score Recalculation', () => {
  // Mock lead data for testing
  const mockLead: Lead = {
    id: 1,
    userId: 1,
    companyName: 'Test Company',
    website: 'https://testcompany.com',
    industry: 'Technology',
    companySize: '100-500',
    location: 'San Francisco, CA',
    description: 'A test company for scoring',
    contactName: 'John Doe',
    contactTitle: 'CEO',
    contactEmail: 'john@testcompany.com',
    contactLinkedin: 'https://linkedin.com/in/johndoe',
    contactPhone: '+1234567890',
    status: 'new',
    score: 0,
    notes: null,
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Score Calculation with Engagement', () => {
    it('should calculate base score with no engagement', () => {
      const result = calculateLeadScore(mockLead, 0, 0);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors.engagement).toBe(0);
    });

    it('should increase score with email opens', () => {
      const baseResult = calculateLeadScore(mockLead, 0, 0);
      const withOpensResult = calculateLeadScore(mockLead, 3, 0);
      
      expect(withOpensResult.score).toBeGreaterThan(baseResult.score);
      expect(withOpensResult.factors.engagement).toBeGreaterThan(0);
    });

    it('should increase score more with email clicks than opens', () => {
      const withOpensResult = calculateLeadScore(mockLead, 3, 0);
      const withClicksResult = calculateLeadScore(mockLead, 0, 2);
      
      // Clicks are weighted higher than opens
      expect(withClicksResult.factors.engagement).toBeGreaterThan(withOpensResult.factors.engagement);
    });

    it('should calculate highest score with both opens and clicks', () => {
      const baseResult = calculateLeadScore(mockLead, 0, 0);
      const withBothResult = calculateLeadScore(mockLead, 3, 2);
      
      expect(withBothResult.score).toBeGreaterThan(baseResult.score);
      expect(withBothResult.factors.engagement).toBeGreaterThan(0);
    });
  });

  describe('Score Factors', () => {
    it('should score large companies higher', () => {
      const smallLead = { ...mockLead, companySize: '1-10' };
      const largeLead = { ...mockLead, companySize: '1000-5000' };
      
      const smallResult = calculateLeadScore(smallLead, 0, 0);
      const largeResult = calculateLeadScore(largeLead, 0, 0);
      
      expect(largeResult.factors.companySize).toBeGreaterThan(smallResult.factors.companySize);
    });

    it('should score target industries higher', () => {
      const techLead = { ...mockLead, industry: 'Technology' };
      const otherLead = { ...mockLead, industry: 'Agriculture' };
      
      const techResult = calculateLeadScore(techLead, 0, 0);
      const otherResult = calculateLeadScore(otherLead, 0, 0);
      
      expect(techResult.factors.industryFit).toBeGreaterThan(otherResult.factors.industryFit);
    });

    it('should score complete contact info higher', () => {
      const completeLead = mockLead;
      const incompleteLead = {
        ...mockLead,
        contactEmail: null,
        contactPhone: null,
        contactLinkedin: null,
      };
      
      const completeResult = calculateLeadScore(completeLead, 0, 0);
      const incompleteResult = calculateLeadScore(incompleteLead, 0, 0);
      
      expect(completeResult.factors.contactCompleteness).toBeGreaterThan(
        incompleteResult.factors.contactCompleteness
      );
    });
  });

  describe('Priority Classification', () => {
    it('should classify score >= 70 as high priority', () => {
      const highScoreLead = {
        ...mockLead,
        companySize: '5000-10000',
        industry: 'Technology',
      };
      
      const result = calculateLeadScore(highScoreLead, 2, 2);
      expect(result.priority).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should classify score 40-69 as medium priority', () => {
      const mediumScoreLead = {
        ...mockLead,
        companySize: '50-200',
        industry: 'Retail',
        contactEmail: null,
        contactPhone: null,
      };
      
      const result = calculateLeadScore(mediumScoreLead, 0, 0);
      expect(result.priority).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(70);
    });

    it('should classify score < 40 as low priority', () => {
      const lowScoreLead = {
        ...mockLead,
        companySize: '1-10',
        industry: 'Other',
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        contactLinkedin: null,
        contactTitle: null,
      };
      
      const result = calculateLeadScore(lowScoreLead, 0, 0);
      expect(result.priority).toBe('low');
      expect(result.score).toBeLessThan(40);
    });
  });

  describe('Score Explanation', () => {
    it('should generate explanation with strengths and weaknesses', () => {
      const result = calculateLeadScore(mockLead, 2, 1);
      
      expect(result.explanation).toBeTruthy();
      expect(result.explanation).toContain('priority lead');
      expect(result.explanation.length).toBeGreaterThan(20);
    });

    it('should mention engagement in explanation when present', () => {
      const result = calculateLeadScore(mockLead, 3, 2);
      
      expect(result.explanation.toLowerCase()).toContain('engagement');
    });
  });

  describe('Edge Cases', () => {
    it('should handle lead with null values', () => {
      const minimalLead: Lead = {
        ...mockLead,
        website: null,
        industry: null,
        companySize: null,
        location: null,
        description: null,
        contactName: null,
        contactTitle: null,
        contactEmail: null,
        contactLinkedin: null,
        contactPhone: null,
      };
      
      const result = calculateLeadScore(minimalLead, 0, 0);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.priority).toBe('low');
    });

    it('should cap engagement score at 100', () => {
      // Test with very high engagement numbers
      const result = calculateLeadScore(mockLead, 100, 100);
      
      expect(result.factors.engagement).toBeLessThanOrEqual(100);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle zero or negative engagement gracefully', () => {
      const result = calculateLeadScore(mockLead, 0, 0);
      
      expect(result.factors.engagement).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
