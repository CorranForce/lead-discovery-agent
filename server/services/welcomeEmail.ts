import { sendEmail } from "./email";

export interface WelcomeEmailOptions {
  to: string;
  leadName: string;
  leadCompany?: string;
}

/**
 * Send welcome email to new lead introducing Allen's expertise
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions) {
  const { to, leadName, leadCompany } = options;
  
  const firstName = leadName.split(' ')[0];
  const companyMention = leadCompany ? ` at ${leadCompany}` : '';
  
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
          .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
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
          .content p:last-child {
            margin-bottom: 0;
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
          .highlight-box p {
            margin: 0 0 8px 0;
            font-size: 15px;
          }
          .highlight-box p:last-child {
            margin-bottom: 0;
          }
          .cta-section {
            text-align: center;
            margin: 32px 0;
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
            margin: 8px;
            transition: background 0.3s;
          }
          .button:hover {
            background: #2563eb;
          }
          .button-secondary {
            background: #64748b;
          }
          .button-secondary:hover {
            background: #475569;
          }
          .video-links {
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
          }
          .video-links h3 {
            margin: 0 0 16px 0;
            color: #1e293b;
            font-size: 18px;
          }
          .video-link {
            display: block;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            text-decoration: none;
            color: #3b82f6;
            margin-bottom: 12px;
            transition: all 0.2s;
          }
          .video-link:hover {
            border-color: #3b82f6;
            transform: translateX(4px);
          }
          .video-link:last-child {
            margin-bottom: 0;
          }
          .video-title {
            font-weight: 600;
            display: block;
            margin-bottom: 4px;
          }
          .video-desc {
            font-size: 14px;
            color: #64748b;
          }
          .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-name {
            font-weight: 600;
            font-size: 17px;
            margin-bottom: 4px;
          }
          .signature-title {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 12px;
          }
          .signature-links {
            margin-top: 12px;
          }
          .signature-links a {
            color: #3b82f6;
            text-decoration: none;
            margin-right: 16px;
            font-size: 14px;
          }
          .footer { 
            text-align: center; 
            padding: 24px 30px;
            background: #f8fafc;
            color: #64748b; 
            font-size: 13px;
            line-height: 1.6;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Freedom Ops AI</h1>
            <p>Where Ancient Wisdom Meets Modern Automation</p>
          </div>
          
          <div class="content">
            <p>Hey ${firstName},</p>
            
            <p>Allen Davis here. I noticed you${companyMention} might be interested in AI automation and RPA—and I wanted to reach out personally.</p>
            
            <p>Quick background: I'm a Senior RPA Developer and Army veteran (deployed to Iraq 2007-2009, 25U Signal Support). I've spent years in the trenches of automation—both literal and digital—and now I help veterans, military members, and people new to AI build profitable online businesses using automation.</p>
            
            <div class="highlight-box">
              <h3>🎯 Why I Do This</h3>
              <p>After transitioning from the military, I discovered that the same strategic thinking that won battles in ancient Rome (yes, I'm a Julius Caesar nerd) applies perfectly to modern AI and automation.</p>
              <p><strong>My mission:</strong> Help you leverage AI to replace your 9-to-5 and build real freedom—without the tech overwhelm.</p>
            </div>
            
            <p>I've been where you are. The military taught me discipline and systems thinking. RPA taught me how to automate anything. And studying ancient history taught me that timeless strategies still work today.</p>
            
            <div class="video-links">
              <h3>📺 Start Here - My Best Content</h3>
              
              <a href="https://www.youtube.com/@CorranForce" class="video-link">
                <span class="video-title">🎬 Freedom Ops AI YouTube Channel</span>
                <span class="video-desc">AI automation strategies for veterans & beginners</span>
              </a>
              
              <a href="https://www.youtube.com/@CorranForce/videos" class="video-link">
                <span class="video-title">⚡ Latest Videos</span>
                <span class="video-desc">Weekly tutorials on making money online with AI</span>
              </a>
              
              <a href="https://www.facebook.com/phoenixwolf78" class="video-link">
                <span class="video-title">💬 Join the Community</span>
                <span class="video-desc">Connect with other veterans & AI enthusiasts</span>
              </a>
            </div>
            
            <p><strong>What I can help you with:</strong></p>
            <ul style="margin: 16px 0; padding-left: 24px;">
              <li>RPA & AI automation for business processes</li>
              <li>Building profitable online businesses with AI</li>
              <li>Content creation strategies (I'm growing to 1M followers)</li>
              <li>Transitioning military skills to tech careers</li>
              <li>Applying ancient strategic wisdom to modern problems</li>
            </ul>
            
            <div class="cta-section">
              <a href="https://www.youtube.com/@CorranForce?sub_confirmation=1" class="button">
                🎯 Subscribe to My Channel
              </a>
              <br>
              <a href="mailto:allen@freedomopsai.dev" class="button button-secondary">
                📧 Reply to This Email
              </a>
            </div>
            
            <p>I keep things real, practical, and actionable. No fluff. Just strategies that work.</p>
            
            <p>Looking forward to connecting!</p>
            
            <div class="signature">
              <div class="signature-name">Allen Davis</div>
              <div class="signature-title">Senior RPA Developer | Army Veteran | AI Automation Strategist</div>
              <div class="signature-title">Freedom Ops AI</div>
              <div class="signature-links">
                <a href="https://www.youtube.com/@CorranForce">YouTube</a>
                <a href="https://www.facebook.com/phoenixwolf78">Facebook</a>
                <a href="mailto:allen@freedomopsai.dev">Email</a>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>P.S.</strong> I also run World of Warcraft raids and study Julius Caesar in my free time. Because why not? 🎮⚔️</p>
            <p style="margin-top: 16px;">
              © 2026 Freedom Ops AI | <a href="mailto:allen@freedomopsai.dev">allen@freedomopsai.dev</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return await sendEmail({
    to,
    subject: `${firstName}, let's talk AI automation (from a fellow veteran)`,
    html,
    replyTo: "allen@freedomopsai.dev",
  });
}
