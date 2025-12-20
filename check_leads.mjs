import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL);

const leads = await db.execute("SELECT id, companyName, score, industry, companySize FROM leads LIMIT 10");
console.log("Leads in database:", JSON.stringify(leads[0], null, 2));
