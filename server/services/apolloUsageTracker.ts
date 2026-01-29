/**
 * Apollo.io Usage Tracking Service
 * 
 * Tracks API usage, monitors credits, and sends alerts when approaching limits
 */

import { getDb } from '../db';
import { APOLLO_CONFIG, calculateUsagePercentage, getAlertLevel } from '../apollo-config';
import { sendEmail } from './email';
import { sql } from 'drizzle-orm';

interface ApolloUsageRecord {
  userId: number;
  endpoint: string;
  requestType: string;
  resultsCount: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  creditsUsed: number;
}

interface UsageStats {
  totalCalls: number;
  totalCreditsUsed: number;
  successRate: number;
  avgResponseTime: number;
  callsByEndpoint: Record<string, number>;
}

/**
 * Log an Apollo API call
 */
export async function logApolloUsage(record: ApolloUsageRecord): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[Apollo Usage] Cannot log usage: database not available');
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO apolloUsage (
        userId, endpoint, requestType, resultsCount, responseTime,
        success, errorMessage, creditsUsed
      ) VALUES (
        ${record.userId},
        ${record.endpoint},
        ${record.requestType},
        ${record.resultsCount},
        ${record.responseTime},
        ${record.success ? 1 : 0},
        ${record.errorMessage || null},
        ${record.creditsUsed}
      )
    `);

    // Check if we should send alerts
    await checkUsageAlerts(record.userId);
  } catch (error) {
    console.error('[Apollo Usage] Failed to log usage:', error);
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<UsageStats> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate || new Date();

  try {
    // Get total calls and credits
    const totalsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as totalCalls,
        SUM(creditsUsed) as totalCreditsUsed,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successfulCalls,
        AVG(responseTime) as avgResponseTime
      FROM apolloUsage
      WHERE userId = ${userId}
        AND createdAt >= ${start.toISOString()}
        AND createdAt <= ${end.toISOString()}
    `);

    const totals = (totalsResult as any)[0] || {};

    // Get calls by endpoint
    const endpointResult = await db.execute(sql`
      SELECT endpoint, COUNT(*) as count
      FROM apolloUsage
      WHERE userId = ${userId}
        AND createdAt >= ${start.toISOString()}
        AND createdAt <= ${end.toISOString()}
      GROUP BY endpoint
    `);

    const callsByEndpoint: Record<string, number> = {};
    (endpointResult as any).forEach((row: any) => {
      callsByEndpoint[row.endpoint] = Number(row.count);
    });

    return {
      totalCalls: Number(totals.totalCalls) || 0,
      totalCreditsUsed: Number(totals.totalCreditsUsed) || 0,
      successRate: totals.totalCalls > 0 
        ? (Number(totals.successfulCalls) / Number(totals.totalCalls)) * 100 
        : 100,
      avgResponseTime: Number(totals.avgResponseTime) || 0,
      callsByEndpoint,
    };
  } catch (error) {
    console.error('[Apollo Usage] Failed to get usage stats:', error);
    throw error;
  }
}

/**
 * Get monthly usage for a user
 */
export async function getMonthlyUsage(userId: number): Promise<UsageStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return getUserUsageStats(userId, startOfMonth, endOfMonth);
}

/**
 * Check if usage alerts should be sent
 */
async function checkUsageAlerts(userId: number): Promise<void> {
  try {
    const monthlyUsage = await getMonthlyUsage(userId);
    const usagePercent = calculateUsagePercentage(
      monthlyUsage.totalCreditsUsed,
      APOLLO_CONFIG.monthlyLimits.totalCredits
    );

    const alertLevel = getAlertLevel(usagePercent);

    // Only send alerts for warning, urgent, or critical levels
    if (alertLevel !== 'normal') {
      await sendUsageAlert(userId, usagePercent, alertLevel, monthlyUsage);
    }
  } catch (error) {
    console.error('[Apollo Usage] Failed to check usage alerts:', error);
  }
}

/**
 * Send usage alert email
 */
async function sendUsageAlert(
  userId: number,
  usagePercent: number,
  alertLevel: 'warning' | 'urgent' | 'critical',
  stats: UsageStats
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get user email
    const userResult = await db.execute(sql`
      SELECT email, name FROM users WHERE id = ${userId} LIMIT 1
    `);

    const user = (userResult as any)[0];
    if (!user || !user.email) return;

    const alertEmojis = {
      warning: '⚠️',
      urgent: '🚨',
      critical: '🔴',
    };

    const alertTitles = {
      warning: 'Apollo API Usage Warning',
      urgent: 'Apollo API Usage Urgent Alert',
      critical: 'Apollo API Usage Critical Alert',
    };

    const subject = `${alertEmojis[alertLevel]} ${alertTitles[alertLevel]} - ${usagePercent.toFixed(1)}% Used`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert-box { background: ${alertLevel === 'critical' ? '#fee' : alertLevel === 'urgent' ? '#fef3cd' : '#fff3cd'};
                       border-left: 4px solid ${alertLevel === 'critical' ? '#dc3545' : alertLevel === 'urgent' ? '#fd7e14' : '#ffc107'};
                       padding: 15px; margin: 20px 0; }
          .stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
          .stat-label { font-weight: bold; }
          .progress-bar { width: 100%; height: 30px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin: 10px 0; }
          .progress-fill { height: 100%; background: ${alertLevel === 'critical' ? '#dc3545' : alertLevel === 'urgent' ? '#fd7e14' : '#ffc107'};
                          display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${alertEmojis[alertLevel]} Apollo API Usage Alert</h2>
          
          <div class="alert-box">
            <strong>${alertTitles[alertLevel]}</strong>
            <p>Your Apollo.io API usage has reached <strong>${usagePercent.toFixed(1)}%</strong> of your monthly limit.</p>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(usagePercent, 100)}%">
              ${usagePercent.toFixed(1)}%
            </div>
          </div>

          <div class="stats">
            <h3>Monthly Usage Statistics</h3>
            <div class="stat-row">
              <span class="stat-label">Total API Calls:</span>
              <span>${stats.totalCalls.toLocaleString()}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Credits Used:</span>
              <span>${stats.totalCreditsUsed.toLocaleString()} / ${APOLLO_CONFIG.monthlyLimits.totalCredits.toLocaleString()}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Success Rate:</span>
              <span>${stats.successRate.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Avg Response Time:</span>
              <span>${Math.round(stats.avgResponseTime)}ms</span>
            </div>
          </div>

          <h3>Recommended Actions:</h3>
          <ul>
            ${alertLevel === 'critical' 
              ? '<li><strong>Pause non-essential lead discovery operations</strong></li><li>Review and optimize your search queries</li><li>Consider upgrading your Apollo plan</li>'
              : alertLevel === 'urgent'
              ? '<li>Monitor usage closely for the rest of the month</li><li>Prioritize high-value lead discovery tasks</li><li>Review your monthly usage patterns</li>'
              : '<li>Monitor your usage trends</li><li>Plan your lead discovery activities for the month</li><li>Consider optimizing batch sizes</li>'
            }
          </ul>

          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This alert was automatically generated by your Lead Discovery platform.
            You can view detailed usage statistics in your admin dashboard.
          </p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject,
      html,
    });

    console.log(`[Apollo Usage] Sent ${alertLevel} alert to ${user.email} (${usagePercent.toFixed(1)}% used)`);
  } catch (error) {
    console.error('[Apollo Usage] Failed to send usage alert:', error);
  }
}

/**
 * Get usage summary for dashboard
 */
export async function getUsageSummary(userId: number) {
  const monthlyUsage = await getMonthlyUsage(userId);
  const usagePercent = calculateUsagePercentage(
    monthlyUsage.totalCreditsUsed,
    APOLLO_CONFIG.monthlyLimits.totalCredits
  );
  const alertLevel = getAlertLevel(usagePercent);

  return {
    ...monthlyUsage,
    usagePercent,
    alertLevel,
    remainingCredits: APOLLO_CONFIG.monthlyLimits.totalCredits - monthlyUsage.totalCreditsUsed,
    limit: APOLLO_CONFIG.monthlyLimits.totalCredits,
  };
}
