import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { sendEmail } from "./email";

interface EmailVerificationToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Generate a secure random token for email verification
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create an email verification token and send verification email
 */
export async function createEmailVerificationToken(userId: number, email: string, name?: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database unavailable" };
  }

  // Generate token
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Store token in database
  await db.execute(sql`
    INSERT INTO emailVerificationTokens (userId, token, expiresAt) 
    VALUES (${userId}, ${token}, ${expiresAt})
  `);

  // Send verification email
  const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email Address</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
      </div>
      
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || "there"},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Thanks for signing up! Please verify your email address to activate your account and start discovering leads.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 14px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px;">
          ${verifyUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
            ⏱️ This link will expire in <strong>24 hours</strong>.
          </p>
          <p style="font-size: 14px; color: #666;">
            🔒 If you didn't create an account, you can safely ignore this email.
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
    subject: "Verify Your Email Address",
    html: emailHtml,
  });

  return { success: true, message: "Verification email sent" };
}

/**
 * Verify an email verification token
 */
export async function verifyEmailToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  const db = await getDb();
  if (!db) {
    return { valid: false };
  }

  const tokens: any = await db.execute(sql`
    SELECT * FROM emailVerificationTokens 
    WHERE token = ${token} AND used = FALSE AND expiresAt > NOW()
  `);

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { valid: false };
  }

  const verificationToken = tokens[0] as EmailVerificationToken;
  return { valid: true, userId: verificationToken.userId };
}

/**
 * Mark a verification token as used and update user's emailVerified status
 */
export async function markEmailAsVerified(token: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  // Mark token as used
  await db.execute(sql`
    UPDATE emailVerificationTokens SET used = TRUE WHERE token = ${token}
  `);

  // Update user's emailVerified status
  await db.execute(sql`
    UPDATE users SET emailVerified = TRUE WHERE id = ${userId}
  `);
}

/**
 * Check if a user's email is verified
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  const result: any = await db.execute(sql`
    SELECT emailVerified FROM users WHERE id = ${userId} LIMIT 1
  `);

  if (!Array.isArray(result) || result.length === 0) {
    return false;
  }

  return result[0].emailVerified === 1 || result[0].emailVerified === true;
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(userId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database unavailable" };
  }

  // Get user details
  const users: any = await db.execute(sql`
    SELECT id, email, name, emailVerified FROM users WHERE id = ${userId} LIMIT 1
  `);

  if (!Array.isArray(users) || users.length === 0) {
    return { success: false, message: "User not found" };
  }

  const user = users[0];

  if (user.emailVerified) {
    return { success: false, message: "Email already verified" };
  }

  // Create new verification token
  return await createEmailVerificationToken(user.id, user.email, user.name);
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredVerificationTokens(): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  await db.execute(sql`
    DELETE FROM emailVerificationTokens WHERE expiresAt < NOW() OR used = TRUE
  `);
}
