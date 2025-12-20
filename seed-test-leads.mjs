import { drizzle } from "drizzle-orm/mysql2";
import { leads } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

// Get the first user ID
const users = await db.execute("SELECT id FROM users LIMIT 1");
const userId = users[0]?.[0]?.id;

if (!userId) {
  console.error("No user found in database");
  process.exit(1);
}

console.log("Found user ID:", userId);

// Insert test leads with different scores
const testLeads = [
  {
    userId,
    companyName: "TechHealth Solutions",
    website: "https://techhealthsolutions.example.com",
    industry: "Healthcare Technology",
    companySize: "100-500",
    location: "San Francisco, CA",
    score: 85,
    status: "new",
    notes: "High-growth healthcare tech company with strong funding",
    contactEmail: "contact@techhealthsolutions.example.com",
    contactPhone: "+1-415-555-0123",
    contactLinkedin: "https://linkedin.com/company/techhealth",
  },
  {
    userId,
    companyName: "MedData Analytics",
    website: "https://meddataanalytics.example.com",
    industry: "Healthcare Technology",
    companySize: "50-100",
    location: "Boston, MA",
    score: 65,
    status: "contacted",
    notes: "Mid-sized analytics company, good potential",
    contactEmail: "info@meddataanalytics.example.com",
  },
  {
    userId,
    companyName: "Small Health Startup",
    website: "https://smallhealthstartup.example.com",
    industry: "Healthcare",
    companySize: "1-10",
    location: "Austin, TX",
    score: 35,
    status: "new",
    notes: "Early stage startup, limited budget",
  },
  {
    userId,
    companyName: "Enterprise Medical Systems",
    website: "https://enterprisemedical.example.com",
    industry: "Healthcare Technology",
    companySize: "1000+",
    location: "New York, NY",
    score: 92,
    status: "qualified",
    notes: "Large enterprise with significant budget and clear needs",
    contactEmail: "partnerships@enterprisemedical.example.com",
    contactPhone: "+1-212-555-0199",
    contactLinkedin: "https://linkedin.com/company/enterprise-medical",
  },
  {
    userId,
    companyName: "HealthTech Innovations",
    website: "https://healthtechinnovations.example.com",
    industry: "Healthcare Technology",
    companySize: "200-500",
    location: "Seattle, WA",
    score: 78,
    status: "negotiating",
    notes: "Strong interest, currently in negotiation phase",
    contactEmail: "sales@healthtechinnovations.example.com",
    contactLinkedin: "https://linkedin.com/company/healthtech-innovations",
  },
];

for (const lead of testLeads) {
  await db.insert(leads).values(lead);
  console.log(`Inserted lead: ${lead.companyName} (Score: ${lead.score})`);
}

console.log("\nTest leads inserted successfully!");
process.exit(0);
