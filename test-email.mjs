import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Allen Davis <allen@freedomopsai.dev>',
      to: 'corranforce+test@gmail.com',
      subject: 'Test Email - Lead Discovery Service Verification',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Email Service Test</h1>
              </div>
              <div class="content">
                <p><span class="badge">SUCCESS</span></p>
                <p>Hi Allen,</p>
                <p>This is a test email to verify that the Lead Discovery & Prospecting AI Agent email service is working correctly.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li><strong>Service:</strong> Resend Email API</li>
                  <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                  <li><strong>Environment:</strong> Production</li>
                </ul>
                <p>If you're seeing this email, it means:</p>
                <ul>
                  <li>✅ Email service is properly configured</li>
                  <li>✅ API keys are working</li>
                  <li>✅ Email delivery is functional</li>
                </ul>
                <p>You can now use the Lead Discovery platform to send emails to your leads!</p>
                <p>Best regards,<br>Lead Discovery System</p>
              </div>
              <div class="footer">
                <p>© 2026 Lead Discovery & Prospecting AI Agent</p>
                <p>This is an automated test email</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data?.id);
    process.exit(0);
  } catch (error) {
    console.error('❌ Exception:', error);
    process.exit(1);
  }
}

sendTestEmail();
