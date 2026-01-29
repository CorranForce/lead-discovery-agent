/**
 * Apollo.io API Configuration and Limits
 * 
 * This file documents the Apollo API plan limits and provides
 * configuration for rate limiting and usage monitoring.
 * 
 * Last Updated: 2026-01-28
 * Plan: Check your Apollo.io dashboard for current plan details
 */

export const APOLLO_CONFIG = {
  /**
   * API Rate Limits
   * Apollo enforces rate limits per API key
   */
  rateLimits: {
    // Requests per second (typical for most plans)
    requestsPerSecond: 2,
    
    // Requests per minute (adjust based on your plan)
    requestsPerMinute: 120,
    
    // Requests per hour
    requestsPerHour: 7200,
    
    // Recommended delay between requests (ms)
    delayBetweenRequests: 500,
  },

  /**
   * Monthly Credits/Limits
   * Update these based on your Apollo plan tier
   */
  monthlyLimits: {
    // Total API credits per month (check your dashboard)
    totalCredits: 10000, // Update this with your actual limit
    
    // Organizations search results per month
    organizationSearches: 10000,
    
    // People/contact enrichment per month
    contactEnrichment: 5000,
    
    // Email credits per month
    emailCredits: 1000,
  },

  /**
   * Alert Thresholds
   * Trigger warnings when usage approaches limits
   */
  alertThresholds: {
    // Send warning at 80% usage
    warning: 0.80,
    
    // Send urgent alert at 90% usage
    urgent: 0.90,
    
    // Send critical alert at 95% usage
    critical: 0.95,
  },

  /**
   * Batch Processing Limits
   * Optimize batch sizes to stay within rate limits
   */
  batchLimits: {
    // Maximum organizations per single request
    maxPerPage: 25,
    
    // Maximum pages to fetch in one batch
    maxPages: 10,
    
    // Maximum total results per batch operation
    maxBatchSize: 250,
    
    // Delay between batch pages (ms)
    batchDelay: 500,
  },

  /**
   * Data Quality Metrics (from batch testing)
   * Based on test results: 2026-01-28
   */
  performance: {
    // Average API response time (ms)
    avgResponseTime: 798,
    
    // Successful batch test results
    batchTestResults: {
      totalCompanies: 84,
      queriesRun: 4,
      avgPerQuery: 21,
      totalDuration: 3190, // ms
    },
  },
};

/**
 * Calculate current usage percentage
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return (used / limit) * 100;
}

/**
 * Determine alert level based on usage percentage
 */
export function getAlertLevel(usagePercent: number): 'normal' | 'warning' | 'urgent' | 'critical' {
  const { alertThresholds } = APOLLO_CONFIG;
  
  if (usagePercent >= alertThresholds.critical * 100) {
    return 'critical';
  } else if (usagePercent >= alertThresholds.urgent * 100) {
    return 'urgent';
  } else if (usagePercent >= alertThresholds.warning * 100) {
    return 'warning';
  }
  
  return 'normal';
}

/**
 * Get recommended delay for next API call based on recent activity
 */
export function getRecommendedDelay(recentCallsInLastSecond: number): number {
  const { rateLimits } = APOLLO_CONFIG;
  
  if (recentCallsInLastSecond >= rateLimits.requestsPerSecond) {
    // Hit rate limit, wait longer
    return 1000;
  }
  
  return rateLimits.delayBetweenRequests;
}

/**
 * Check if we can make another API call without hitting rate limits
 */
export function canMakeApiCall(recentCallsInLastMinute: number): boolean {
  const { rateLimits } = APOLLO_CONFIG;
  return recentCallsInLastMinute < rateLimits.requestsPerMinute;
}
