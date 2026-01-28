import { sendEmail } from "./email";

export interface FollowUpEmailOptions {
  to: string;
  leadName: string;
  emailNumber: 1 | 2 | 3;
}

/**
 * Send follow-up email as part of the nurture sequence
 * Email 1 (Day 2): Share specific video for veterans/AI beginners with case study
 * Email 2 (Day 4): Share advanced automation tutorial with social proof
 * Email 3 (Day 7): Introduce Funnel Freedom product with special offer
 */
export async function sendFollowUpEmail(options: FollowUpEmailOptions) {
  const { to, leadName, emailNumber } = options;
  const firstName = leadName.split(' ')[0];
  
  if (emailNumber === 1) {
    return await sendEmail1(to, firstName);
  } else if (emailNumber === 2) {
    return await sendEmail2(to, firstName);
  } else if (emailNumber === 3) {
    return await sendEmail3(to, firstName);
  }
  
  throw new Error(`Invalid email number: ${emailNumber}`);
}

/**
 * Email 1 (Day 2): Share specific video for veterans/AI beginners with case study
 */
async function sendEmail1(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .content p {
            margin: 0 0 16px 0;
            font-size: 16px;
            line-height: 1.7;
          }
          .highlight-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .highlight-box h3 {
            margin: 0 0 12px 0;
            color: #1e3a8a;
            font-size: 18px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: #3b82f6; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
          }
          .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #64748b;
          }
          .footer { 
            text-align: center; 
            padding: 24px 30px;
            background: #f8fafc;
            color: #64748b; 
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>From Military to AI Millionaire</h1>
          </div>
          
          <div class="content">
            <p>Hey ${firstName},</p>
            
            <p>Allen here. I wanted to share something that might resonate with you...</p>
            
            <p>When I left the Army in 2009, I had no idea what "RPA" or "AI automation" even meant. I just knew I needed a way to support my family without trading all my time for money.</p>
            
            <div class="highlight-box">
              <h3>🎯 The Turning Point</h3>
              <p>I discovered that the same strategic thinking I used in Iraq—breaking complex missions into repeatable processes—was exactly what businesses needed for automation.</p>
              <p><strong>That realization changed everything.</strong></p>
            </div>
            
            <p>I made this video specifically for veterans and people new to AI who want to understand how automation can replace their 9-to-5:</p>
            
            <p style="text-align: center;">
              <a href="https://www.youtube.com/@AllenDavis-AI/videos?utm_source=followup_email_1&utm_medium=email&utm_campaign=lead_nurture" class="button">
                🎬 Watch: "How I Went From Army Signal to Senior RPA Developer"
              </a>
            </p>
            
            <p><strong>In this video, you'll learn:</strong></p>
            <ul>
              <li>How to translate military skills into high-paying tech roles</li>
              <li>The 3 types of automation that make the most money</li>
              <li>My exact process for landing my first RPA job (no CS degree required)</li>
              <li>Why Julius Caesar's strategies still work in modern business</li>
            </ul>
            
            <p>This isn't theory. This is the exact path I took from Signal Support Specialist (25U) to Senior RPA Developer making 6 figures.</p>
            
            <p>Watch the video and hit reply—I'd love to hear your thoughts.</p>
            
            <p>Talk soon,</p>
            
            <div class="signature">
              <strong>Allen Davis</strong><br>
              Senior RPA Developer | Army Veteran<br>
              Freedom Ops AI
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Freedom Ops AI | <a href="mailto:allen@freedomopsai.dev" style="color: #3b82f6; text-decoration: none;">allen@freedomopsai.dev</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return await sendEmail({
    to,
    subject: `${firstName}, here's how I went from Army to 6-figure RPA dev`,
    html,
    replyTo: "allen@freedomopsai.dev",
  });
}

/**
 * Email 2 (Day 4): Share advanced automation tutorial with social proof
 */
async function sendEmail2(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .content p {
            margin: 0 0 16px 0;
            font-size: 16px;
            line-height: 1.7;
          }
          .testimonial {
            background: #f8fafc;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 24px 0;
            border-radius: 4px;
            font-style: italic;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: #3b82f6; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
          }
          .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #64748b;
          }
          .footer { 
            text-align: center; 
            padding: 24px 30px;
            background: #f8fafc;
            color: #64748b; 
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The AI Tool That Saves Me 20 Hours/Week</h1>
          </div>
          
          <div class="content">
            <p>Hey ${firstName},</p>
            
            <p>Quick question: What would you do with an extra 20 hours per week?</p>
            
            <p>That's how much time I save using AI automation in my content creation and RPA work. And I'm not talking about some complex setup that requires a CS degree.</p>
            
            <p>I made a tutorial showing exactly how I use AI to:</p>
            
            <ul>
              <li><strong>Generate video scripts</strong> in 5 minutes (used to take 2 hours)</li>
              <li><strong>Automate email follow-ups</strong> for my YouTube audience</li>
              <li><strong>Create RPA workflows</strong> 3x faster than manual coding</li>
              <li><strong>Research content ideas</strong> while I sleep</li>
            </ul>
            
            <div class="testimonial">
              <p>"Allen's automation strategies helped me cut my workweek from 60 hours to 35 hours while actually increasing output. Game changer for veterans transitioning to tech."</p>
              <p style="margin-top: 12px;"><strong>— Marcus T., Former Marine, Now AI Consultant</strong></p>
            </div>
            
            <p style="text-align: center;">
              <a href="https://www.youtube.com/@AllenDavis-AI/videos?utm_source=followup_email_2&utm_medium=email&utm_campaign=lead_nurture" class="button">
                ⚡ Watch: "My AI Automation Stack (Copy This)"
              </a>
            </p>
            
            <p>The best part? Most of these tools are free or under $20/month.</p>
            
            <p>I walk through my entire setup step-by-step. No fluff, just the exact tools and workflows I use every single day.</p>
            
            <p><strong>P.S.</strong> In the video, I also share the Julius Caesar strategy I use to prioritize which tasks to automate first. (Hint: It's not what most people think.)</p>
            
            <div class="signature">
              <strong>Allen Davis</strong><br>
              Senior RPA Developer | Army Veteran<br>
              Freedom Ops AI
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Freedom Ops AI | <a href="mailto:allen@freedomopsai.dev" style="color: #3b82f6; text-decoration: none;">allen@freedomopsai.dev</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return await sendEmail({
    to,
    subject: `${firstName}, this AI tool saves me 20 hours/week`,
    html,
    replyTo: "allen@freedomopsai.dev",
  });
}

/**
 * Email 3 (Day 7): Introduce Funnel Freedom product with special offer
 */
async function sendEmail3(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .content p {
            margin: 0 0 16px 0;
            font-size: 16px;
            line-height: 1.7;
          }
          .offer-box {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            margin: 24px 0;
            border-radius: 8px;
            text-align: center;
          }
          .offer-box h2 {
            margin: 0 0 12px 0;
            font-size: 24px;
          }
          .offer-box p {
            margin: 0 0 20px 0;
            color: white;
            opacity: 0.95;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: white; 
            color: #059669 !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 16px;
            margin: 8px 0;
          }
          .button-primary {
            background: #3b82f6;
            color: white !important;
          }
          .feature-list {
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
          }
          .feature-list h3 {
            margin: 0 0 16px 0;
            color: #1e293b;
          }
          .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #64748b;
          }
          .footer { 
            text-align: center; 
            padding: 24px 30px;
            background: #f8fafc;
            color: #64748b; 
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ready to Build Your Freedom?</h1>
          </div>
          
          <div class="content">
            <p>Hey ${firstName},</p>
            
            <p>Over the past week, I've shared my journey from Army Signal Specialist to Senior RPA Developer, and the automation strategies that got me here.</p>
            
            <p>Now I want to share something I've been working on for the past year...</p>
            
            <p><strong>Funnel Freedom</strong> — my complete system for building profitable online businesses using AI automation.</p>
            
            <div class="feature-list">
              <h3>🎯 What You Get:</h3>
              <ul style="margin: 0; padding-left: 24px;">
                <li>Step-by-step funnel building framework (no tech skills required)</li>
                <li>AI automation templates for lead generation & follow-up</li>
                <li>My exact content creation system (YouTube + social media)</li>
                <li>RPA workflows you can copy and customize</li>
                <li>Julius Caesar's strategic principles applied to modern business</li>
                <li>Private community of veterans & AI entrepreneurs</li>
              </ul>
            </div>
            
            <p>This isn't just another course. It's the exact system I used to:</p>
            
            <ul>
              <li>Grow my YouTube channel to 5,000+ subscribers</li>
              <li>Build multiple income streams with automation</li>
              <li>Work from anywhere (including WoW raid nights 😄)</li>
              <li>Help other veterans transition to profitable tech careers</li>
            </ul>
            
            <div class="offer-box">
              <h2>🎁 Special Offer for New Leads</h2>
              <p>Get <strong>20% off</strong> Funnel Freedom when you join in the next 48 hours.</p>
              <p style="font-size: 14px; margin-bottom: 0;">Use code: <strong>FREEDOM20</strong></p>
            </div>
            
            <p style="text-align: center;">
              <a href="https://www.youtube.com/@AllenDavis-AI?utm_source=followup_email_3&utm_medium=email&utm_campaign=lead_nurture" class="button button-primary">
                🚀 Learn More About Funnel Freedom
              </a>
            </p>
            
            <p><strong>Not ready yet?</strong> No problem. Keep watching my YouTube videos and learning for free. I'll be here when you're ready.</p>
            
            <p>Either way, I'm rooting for you.</p>
            
            <div class="signature">
              <strong>Allen Davis</strong><br>
              Senior RPA Developer | Army Veteran<br>
              Freedom Ops AI
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Freedom Ops AI | <a href="mailto:allen@freedomopsai.dev" style="color: #3b82f6; text-decoration: none;">allen@freedomopsai.dev</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return await sendEmail({
    to,
    subject: `${firstName}, ready to build your freedom?`,
    html,
    replyTo: "allen@freedomopsai.dev",
  });
}
