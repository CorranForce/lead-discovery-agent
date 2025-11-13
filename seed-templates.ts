import { drizzle } from "drizzle-orm/mysql2";
import { emailTemplates } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const templates = [
  {
    userId: null,
    name: "Cold Outreach - Introduction",
    subject: "Quick question about your business",
    body: `Hi there,

I came across your company and was impressed by your work.

I wanted to reach out because I believe we could help you achieve your goals.

Would you be open to a quick 15-minute call this week?

Best regards`,
    category: "cold_outreach",
    variables: null,
    isPublic: 1,
  },
  {
    userId: null,
    name: "Follow-up Email",
    subject: "Following up on our conversation",
    body: `Hi,

I wanted to follow up on our recent conversation.

Have you had a chance to think about our proposal?

I'd be happy to answer any questions.

Best regards`,
    category: "follow_up",
    variables: null,
    isPublic: 1,
  },
];

async function seed() {
  console.log("Seeding email templates...");
  
  for (const template of templates) {
    await db.insert(emailTemplates).values(template);
    console.log(\`✓ Created: \${template.name}\`);
  }
  
  console.log("Done!");
}

seed();
