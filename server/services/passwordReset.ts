import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { sendEmail } from "./email";
import { ENV } from "../_core/env";

interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a password reset token and send email
 */
export async function createPasswordResetToken(email: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database unavailable" };
  }

  // Find user by email
  const users: any = await db.execute(sql`SELECT id, name, email FROM users WHERE email = ${email}`);
  
  if (!Array.isArray(users) || users.length === 0) {
    // Don't reveal if email exists or not (security best practice)
    return { success: true, message: "If an account exists with that email, a reset link has been sent." };
  }

  const user = users[0] as any;

  // Generate token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Store token in database
  await db.execute(sql`
    INSERT INTO passwordResetTokens (userId, token, expiresAt) 
    VALUES (${user.id}, ${token}, ${expiresAt})
  `);

  // Send reset email
  const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>
      
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name || "there"},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 14px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px;">
          ${resetUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
            ⏱️ This link will expire in <strong>1 hour</strong>.
          </p>
          <p style="font-size: 14px; color: #666;">
            🔒 If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2025 Lead Discovery & Prospecting AI Agent. All rights reserved.</p>
        <p>Powered by Freedom Ops AI</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: emailHtml,
  });

  return { success: true, message: "If an account exists with that email, a reset link has been sent." };
}

/**
 * Verify a password reset token
 */
export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  const db = await getDb();
  if (!db) {
    return { valid: false };
  }

  const tokens: any = await db.execute(sql`
    SELECT * FROM passwordResetTokens 
    WHERE token = ${token} AND used = FALSE AND expiresAt > NOW()
  `);

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { valid: false };
  }

  const resetToken = tokens[0] as PasswordResetToken;
  return { valid: true, userId: resetToken.userId };
}

/**
 * Mark a reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  await db.execute(sql`
    UPDATE passwordResetTokens SET used = TRUE WHERE token = ${token}
  `);
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  await db.execute(sql`
    DELETE FROM passwordResetTokens WHERE expiresAt < NOW() OR used = TRUE
  `);
}
