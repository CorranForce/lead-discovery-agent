import { sendWelcomeEmail } from './server/services/welcomeEmail';

async function main() {
  const result = await sendWelcomeEmail({
    to: 'corranforce@gmail.com',
    leadName: 'Allen Davis',
    leadCompany: 'Freedom Ops AI'
  });
  
  console.log('Email sent:', result);
}

main().catch(console.error);
