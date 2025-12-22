/**
 * AI-Powered Lead Scoring Algorithm
 * Automatically evaluates and prioritizes leads based on multiple factors
 */

import { Lead } from "../drizzle/schema";

export interface ScoringFactors {
  companySize: number;
  industryFit: number;
  contactCompleteness: number;
  engagement: number;
  dataQuality: number;
}

export interface ScoringResult {
  score: number; // 0-100
  priority: "high" | "medium" | "low";
  factors: ScoringFactors;
  explanation: string;
}

/**
 * Calculate lead score based on multiple weighted factors
 */
export function calculateLeadScore(
  lead: Lead,
  emailOpens: number = 0,
  emailClicks: number = 0
): ScoringResult {
  const factors: ScoringFactors = {
    companySize: scoreCompanySize(lead.companySize),
    industryFit: scoreIndustryFit(lead.industry),
    contactCompleteness: scoreContactCompleteness(lead),
    engagement: scoreEngagement(emailOpens, emailClicks),
    dataQuality: scoreDataQuality(lead),
  };

  // Weighted scoring (total = 100)
  const weights = {
    companySize: 0.25,      // 25% - Larger companies = higher value
    industryFit: 0.20,      // 20% - Target industries score higher
    contactCompleteness: 0.25, // 25% - Complete contact info is crucial
    engagement: 0.20,       // 20% - Email engagement shows interest
    dataQuality: 0.10,      // 10% - Overall data completeness
  };

  const score = Math.round(
    factors.companySize * weights.companySize +
    factors.industryFit * weights.industryFit +
    factors.contactCompleteness * weights.contactCompleteness +
    factors.engagement * weights.engagement +
    factors.dataQuality * weights.dataQuality
  );

  const priority = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  const explanation = generateExplanation(factors, score, priority);

  return {
    score,
    priority,
    factors,
    explanation,
  };
}

/**
 * Score based on company size (0-100)
 */
function scoreCompanySize(companySize: string | null): number {
  if (!companySize) return 30; // Unknown size gets neutral score

  const size = companySize.toLowerCase();
  
  // Enterprise and large companies score highest
  if (size.includes("10000+") || size.includes("enterprise")) return 100;
  if (size.includes("1000-5000") || size.includes("5000-10000")) return 90;
  if (size.includes("500-1000")) return 80;
  if (size.includes("200-500")) return 70;
  if (size.includes("50-200")) return 60;
  if (size.includes("10-50")) return 50;
  if (size.includes("1-10") || size.includes("startup")) return 40;

  return 30; // Default for unknown patterns
}

/**
 * Score based on industry fit (0-100)
 * Higher scores for target industries
 */
function scoreIndustryFit(industry: string | null): number {
  if (!industry) return 40; // Unknown industry gets neutral score

  const ind = industry.toLowerCase();

  // High-value industries
  const highValue = [
    "technology", "software", "saas", "fintech", "healthcare",
    "finance", "consulting", "enterprise", "b2b"
  ];
  
  // Medium-value industries
  const mediumValue = [
    "manufacturing", "retail", "e-commerce", "education",
    "marketing", "advertising", "real estate"
  ];

  // Check for high-value industries
  for (const keyword of highValue) {
    if (ind.includes(keyword)) return 90;
  }

  // Check for medium-value industries
  for (const keyword of mediumValue) {
    if (ind.includes(keyword)) return 70;
  }

  return 50; // Other industries get moderate score
}

/**
 * Score based on contact information completeness (0-100)
 */
function scoreContactCompleteness(lead: Lead): number {
  let score = 0;
  let maxScore = 0;

  // Contact name (20 points)
  maxScore += 20;
  if (lead.contactName) score += 20;

  // Contact email (30 points - most important)
  maxScore += 30;
  if (lead.contactEmail) score += 30;

  // Contact title (15 points)
  maxScore += 15;
  if (lead.contactTitle) score += 15;

  // Contact LinkedIn (20 points)
  maxScore += 20;
  if (lead.contactLinkedin) score += 20;

  // Contact phone (15 points)
  maxScore += 15;
  if (lead.contactPhone) score += 15;

  return Math.round((score / maxScore) * 100);
}

/**
 * Score based on engagement signals (0-100)
 */
function scoreEngagement(emailOpens: number, emailClicks: number): number {
  if (emailOpens === 0 && emailClicks === 0) return 0; // No engagement yet

  let score = 0;

  // Email opens (up to 50 points)
  score += Math.min(emailOpens * 10, 50);

  // Email clicks (up to 50 points, weighted higher)
  score += Math.min(emailClicks * 25, 50);

  return Math.min(score, 100);
}

/**
 * Score based on overall data quality (0-100)
 */
function scoreDataQuality(lead: Lead): number {
  let score = 0;
  let fields = 0;

  // Check key fields
  const keyFields = [
    lead.companyName,
    lead.website,
    lead.industry,
    lead.companySize,
    lead.location,
    lead.description,
  ];

  keyFields.forEach(field => {
    fields++;
    if (field && field.trim().length > 0) {
      score++;
    }
  });

  return Math.round((score / fields) * 100);
}

/**
 * Generate human-readable explanation of the score
 */
function generateExplanation(
  factors: ScoringFactors,
  score: number,
  priority: string
): string {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Analyze each factor
  if (factors.companySize >= 70) {
    strengths.push("large company size");
  } else if (factors.companySize < 50) {
    weaknesses.push("small company size");
  }

  if (factors.industryFit >= 70) {
    strengths.push("target industry");
  } else if (factors.industryFit < 50) {
    weaknesses.push("non-target industry");
  }

  if (factors.contactCompleteness >= 70) {
    strengths.push("complete contact information");
  } else if (factors.contactCompleteness < 50) {
    weaknesses.push("incomplete contact details");
  }

  if (factors.engagement > 0) {
    strengths.push("active engagement");
  }

  if (factors.dataQuality >= 80) {
    strengths.push("high data quality");
  } else if (factors.dataQuality < 60) {
    weaknesses.push("missing company information");
  }

  let explanation = `${priority.toUpperCase()} priority lead (score: ${score}/100). `;

  if (strengths.length > 0) {
    explanation += `Strengths: ${strengths.join(", ")}. `;
  }

  if (weaknesses.length > 0) {
    explanation += `Areas to improve: ${weaknesses.join(", ")}.`;
  }

  return explanation.trim();
}

/**
 * Recalculate lead score with fresh engagement data
 * This function should be called whenever engagement changes
 */
export async function recalculateLeadScore(
  lead: Lead,
  getEngagementData: () => Promise<{ opens: number; clicks: number }>
): Promise<ScoringResult> {
  const { opens, clicks } = await getEngagementData();
  return calculateLeadScore(lead, opens, clicks);
}
