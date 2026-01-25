import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || "Allen Davis <allen@freedomopsai.dev>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[Email] Failed to send email:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Email sent successfully:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Exception while sending email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(to: string, userName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Lead Discovery!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to Lead Discovery & Prospecting AI Agent! We're excited to have you on board.</p>
            <p>Here's what you can do to get started:</p>
            <ul>
              <li><strong>Discover Leads:</strong> Use our AI-powered search to find qualified B2B leads</li>
              <li><strong>Create Sequences:</strong> Set up automated email outreach campaigns</li>
              <li><strong>Track Conversations:</strong> Manage all your sales conversations in one place</li>
              <li><strong>Analyze Performance:</strong> Monitor your sales metrics and optimize your approach</li>
            </ul>
            <p style="text-align: center;">
              <a href="https://lead-discovery-agent.manus.space/dashboard" class="button">Go to Dashboard</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy prospecting!<br>The Lead Discovery Team</p>
          </div>
          <div class="footer">
            <p>© 2026 Lead Discovery & Prospecting AI Agent. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "Welcome to Lead Discovery!",
    html,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  userName: string,
  amount: number,
  planName: string,
  receiptUrl?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .invoice-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for your payment! Your subscription has been activated.</p>
            <div class="invoice-box">
              <div class="invoice-row">
                <span>Plan:</span>
                <span><strong>${planName}</strong></span>
              </div>
              <div class="invoice-row total">
                <span>Amount Paid:</span>
                <span>$${(amount / 100).toFixed(2)}</span>
              </div>
            </div>
            ${
              receiptUrl
                ? `<p style="text-align: center;">
                     <a href="${receiptUrl}" class="button">View Receipt</a>
                   </p>`
                : ""
            }
            <p>Your subscription is now active and you have full access to all ${planName} features.</p>
            <p>If you have any questions about your subscription, visit your billing page or contact our support team.</p>
            <p>Thank you for choosing Lead Discovery!<br>The Lead Discovery Team</p>
          </div>
          <div class="footer">
            <p>© 2026 Lead Discovery & Prospecting AI Agent. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Payment Confirmed - ${planName} Subscription`,
    html,
  });
}

/**
 * Send subscription renewal reminder email
 */
export async function sendSubscriptionRenewalEmail(
  to: string,
  userName: string,
  planName: string,
  renewalDate: Date,
  amount: number
) {
  const formattedDate = renewalDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Renewal Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>This is a friendly reminder that your <strong>${planName}</strong> subscription will renew soon.</p>
            <div class="info-box">
              <p><strong>Renewal Date:</strong> ${formattedDate}</p>
              <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
              <p><strong>Plan:</strong> ${planName}</p>
            </div>
            <p>Your subscription will automatically renew using your saved payment method. No action is required from you.</p>
            <p style="text-align: center;">
              <a href="https://lead-discovery-agent.manus.space/account?tab=subscription" class="button">Manage Subscription</a>
            </p>
            <p>If you have any questions or wish to make changes to your subscription, please visit your account settings.</p>
            <p>Thank you for being a valued customer!<br>The Lead Discovery Team</p>
          </div>
          <div class="footer">
            <p>© 2026 Lead Discovery & Prospecting AI Agent. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Your ${planName} Subscription Renews on ${formattedDate}`,
    html,
  });
}

/**
 * Send lead notification email to user
 */
export async function sendLeadNotificationEmail(
  to: string,
  userName: string,
  leadName: string,
  leadCompany: string,
  leadEmail?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .lead-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Lead Discovered!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! We've discovered a new lead that matches your criteria.</p>
            <div class="lead-box">
              <h3>${leadName}</h3>
              <p><strong>Company:</strong> ${leadCompany}</p>
              ${leadEmail ? `<p><strong>Email:</strong> ${leadEmail}</p>` : ""}
            </div>
            <p style="text-align: center;">
              <a href="https://lead-discovery-agent.manus.space/leads" class="button">View Lead Details</a>
            </p>
            <p>Don't miss this opportunity to connect and start a conversation!</p>
            <p>Happy prospecting!<br>The Lead Discovery Team</p>
          </div>
          <div class="footer">
            <p>© 2026 Lead Discovery & Prospecting AI Agent. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `New Lead: ${leadName} at ${leadCompany}`,
    html,
  });
}

/**
 * Verify Resend API key is valid
 */
export async function verifyResendApiKey(): Promise<boolean> {
  try {
    // Send a test email to verify the API key
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "delivered@resend.dev", // Resend's test email address
      subject: "API Key Verification",
      html: "<p>This is a test email to verify the Resend API key.</p>",
    });

    if (error) {
      console.error("[Email] API key verification failed:", error);
      return false;
    }

    console.log("[Email] API key verified successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("[Email] Exception during API key verification:", error);
    return false;
  }
}
