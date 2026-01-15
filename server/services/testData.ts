/**
 * Test Data Generator
 * Generates realistic test data for all features when Test Mode is enabled
 */

// Company name components for realistic generation
const companyPrefixes = ['Tech', 'Global', 'Digital', 'Smart', 'Cloud', 'Data', 'Cyber', 'AI', 'Next', 'Future'];
const companySuffixes = ['Solutions', 'Systems', 'Technologies', 'Labs', 'Dynamics', 'Innovations', 'Ventures', 'Corp', 'Inc', 'Group'];
const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Energy', 'Real Estate', 'Consulting', 'Marketing'];
const jobTitles = ['CEO', 'CTO', 'VP of Sales', 'Director of Marketing', 'Head of Engineering', 'Product Manager', 'Sales Manager', 'Operations Director', 'CFO', 'COO'];
const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'Robert', 'Lisa', 'William', 'Amanda', 'John', 'Jessica', 'Daniel', 'Ashley', 'Christopher'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson'];
const cities = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston', 'Chicago', 'Denver', 'Los Angeles', 'Miami', 'Atlanta'];
const states = ['CA', 'NY', 'TX', 'WA', 'MA', 'IL', 'CO', 'CA', 'FL', 'GA'];

// Generate random number in range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random date in past N days
function randomPastDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, days));
  date.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return date;
}

// Generate random future date in N days
function randomFutureDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, days));
  date.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return date;
}

// Generate company name
function generateCompanyName(): string {
  return `${randomPick(companyPrefixes)}${randomPick(companySuffixes)}`;
}

// Generate person name
function generatePersonName(): { firstName: string; lastName: string; fullName: string } {
  const firstName = randomPick(firstNames);
  const lastName = randomPick(lastNames);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

// Generate email from name and company
function generateEmail(firstName: string, lastName: string, company: string): string {
  const domain = company.toLowerCase().replace(/\s+/g, '') + '.com';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

// Generate phone number
function generatePhone(): string {
  return `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

// Generate LinkedIn URL
function generateLinkedIn(firstName: string, lastName: string): string {
  return `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${randomInt(1000, 9999)}`;
}

// Generate website
function generateWebsite(company: string): string {
  return `https://www.${company.toLowerCase().replace(/\s+/g, '')}.com`;
}

export interface TestLead {
  id: number;
  companyName: string;
  industry: string;
  website: string;
  employeeCount: number;
  revenue: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;
  linkedinUrl: string;
  status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
  score: number;
  createdAt: Date;
  lastContactedAt: Date | null;
  notes: string;
}

export interface TestConversation {
  id: number;
  leadId: number;
  companyName: string;
  contactName: string;
  subject: string;
  status: 'active' | 'pending' | 'closed';
  lastMessageAt: Date;
  messageCount: number;
  messages: TestMessage[];
}

export interface TestMessage {
  id: number;
  content: string;
  sender: 'user' | 'lead';
  sentAt: Date;
}

export interface TestSequence {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  totalSteps: number;
  completedSteps: number;
  enrolledLeads: number;
  openRate: number;
  replyRate: number;
  createdAt: Date;
  steps: TestSequenceStep[];
}

export interface TestSequenceStep {
  id: number;
  type: 'email' | 'wait' | 'task';
  subject?: string;
  content?: string;
  waitDays?: number;
  taskDescription?: string;
}

export interface TestInvoice {
  id: number;
  invoiceNumber: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string;
  paidAt: Date | null;
  dueDate: Date;
  createdAt: Date;
  downloadUrl: string;
  lineItems: { description: string; amount: number }[];
}

export interface TestPayment {
  id: number;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  paymentMethodType: string;
  cardBrand: string;
  cardLast4: string;
  description: string;
  createdAt: Date;
}

export interface TestAnalytics {
  totalLeads: number;
  newLeadsThisWeek: number;
  activeConversations: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  conversionRate: number;
  revenueThisMonth: number;
  dailyStats: { date: string; leads: number; emails: number; replies: number }[];
}

// Generate test leads
export function generateTestLeads(count: number = 25): TestLead[] {
  const statuses: TestLead['status'][] = ['new', 'contacted', 'qualified', 'negotiating', 'won', 'lost'];
  const leads: TestLead[] = [];

  for (let i = 1; i <= count; i++) {
    const company = generateCompanyName();
    const person = generatePersonName();
    const cityIndex = randomInt(0, cities.length - 1);
    const status = randomPick(statuses);

    leads.push({
      id: i,
      companyName: company,
      industry: randomPick(industries),
      website: generateWebsite(company),
      employeeCount: randomInt(10, 5000),
      revenue: `$${randomInt(1, 500)}M`,
      location: `${cities[cityIndex]}, ${states[cityIndex]}`,
      contactName: person.fullName,
      contactEmail: generateEmail(person.firstName, person.lastName, company),
      contactPhone: generatePhone(),
      contactTitle: randomPick(jobTitles),
      linkedinUrl: generateLinkedIn(person.firstName, person.lastName),
      status,
      score: randomInt(40, 100),
      createdAt: randomPastDate(90),
      lastContactedAt: status !== 'new' ? randomPastDate(30) : null,
      notes: status === 'qualified' ? 'Interested in enterprise plan. Follow up next week.' : '',
    });
  }

  return leads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Generate test conversations
export function generateTestConversations(leads: TestLead[], count: number = 10): TestConversation[] {
  const subjects = [
    'Re: Introduction to our services',
    'Re: Follow-up on our demo',
    'Re: Pricing discussion',
    'Re: Partnership opportunity',
    'Re: Your inquiry about our platform',
  ];

  const conversations: TestConversation[] = [];
  const contactedLeads = leads.filter(l => l.status !== 'new').slice(0, count);

  contactedLeads.forEach((lead, idx) => {
    const messageCount = randomInt(2, 8);
    const messages: TestMessage[] = [];
    let lastDate = randomPastDate(14);

    // Generate message thread
    for (let m = 1; m <= messageCount; m++) {
      const isUser = m % 2 === 1;
      messages.push({
        id: m,
        content: isUser
          ? getOutboundMessage(m, lead.companyName)
          : getInboundMessage(m, lead.contactName),
        sender: isUser ? 'user' : 'lead',
        sentAt: new Date(lastDate.getTime() + m * 3600000 * randomInt(1, 24)),
      });
    }

    conversations.push({
      id: idx + 1,
      leadId: lead.id,
      companyName: lead.companyName,
      contactName: lead.contactName,
      subject: randomPick(subjects),
      status: randomPick(['active', 'pending', 'closed']),
      lastMessageAt: messages[messages.length - 1].sentAt,
      messageCount,
      messages,
    });
  });

  return conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

function getOutboundMessage(index: number, company: string): string {
  const messages = [
    `Hi! I noticed ${company} has been growing rapidly. I'd love to show you how our lead discovery platform can help accelerate your sales pipeline. Would you have 15 minutes this week for a quick demo?`,
    `Thanks for your interest! I've attached a brief overview of our platform. The key features that might benefit ${company} include AI-powered lead scoring and automated outreach sequences.`,
    `Great question! Our pricing is based on the number of leads you want to discover monthly. For a company like ${company}, I'd recommend our Pro plan which includes unlimited sequences.`,
    `I understand budget timing can be tricky. We do offer quarterly billing which might work better for your procurement cycle. Let me know if you'd like me to prepare a custom proposal.`,
  ];
  return messages[Math.min(index - 1, messages.length - 1)];
}

function getInboundMessage(index: number, name: string): string {
  const messages = [
    `Hi, thanks for reaching out. We've actually been looking for a solution like this. Can you tell me more about the pricing?`,
    `This looks interesting. How does the AI lead scoring work? We've tried similar tools before but the quality wasn't great.`,
    `The demo was helpful. I need to discuss with my team. Can you send over a proposal for 5 users?`,
    `We're interested but need to wait until next quarter's budget. Can we reconnect in January?`,
  ];
  return messages[Math.min(index - 1, messages.length - 1)];
}

// Generate test sequences
export function generateTestSequences(count: number = 5): TestSequence[] {
  const sequenceTemplates = [
    { name: 'Cold Outreach - Tech Companies', description: 'Initial outreach sequence for technology sector leads' },
    { name: 'Follow-up Sequence', description: 'Automated follow-ups for leads who opened but didn\'t reply' },
    { name: 'Demo Request Nurture', description: 'Nurture sequence for leads who requested a demo' },
    { name: 'Re-engagement Campaign', description: 'Win back leads who went cold after initial contact' },
    { name: 'Enterprise Onboarding', description: 'Welcome sequence for new enterprise customers' },
  ];

  return sequenceTemplates.slice(0, count).map((template, idx) => {
    const totalSteps = randomInt(4, 8);
    const completedSteps = randomInt(0, totalSteps);
    const steps: TestSequenceStep[] = [];

    for (let s = 1; s <= totalSteps; s++) {
      if (s === 1 || s % 3 === 1) {
        steps.push({
          id: s,
          type: 'email',
          subject: `Step ${s}: ${s === 1 ? 'Initial outreach' : 'Follow-up'}`,
          content: `Email content for step ${s}...`,
        });
      } else if (s % 3 === 2) {
        steps.push({
          id: s,
          type: 'wait',
          waitDays: randomInt(2, 5),
        });
      } else {
        steps.push({
          id: s,
          type: 'task',
          taskDescription: 'Review lead engagement and personalize next message',
        });
      }
    }

    return {
      id: idx + 1,
      name: template.name,
      description: template.description,
      status: idx === 0 ? 'active' : randomPick(['active', 'paused', 'completed']),
      totalSteps,
      completedSteps,
      enrolledLeads: randomInt(10, 100),
      openRate: randomInt(25, 65),
      replyRate: randomInt(5, 25),
      createdAt: randomPastDate(60),
      steps,
    };
  });
}

// Generate test invoices
export function generateTestInvoices(count: number = 12): TestInvoice[] {
  const plans = [
    { name: 'Pro Plan - Monthly', amount: 2900 },
    { name: 'Pro Plan - Annual', amount: 29000 },
    { name: 'Enterprise Plan - Monthly', amount: 9900 },
    { name: 'Basic Plan - Monthly', amount: 900 },
  ];

  const invoices: TestInvoice[] = [];

  for (let i = 1; i <= count; i++) {
    const plan = randomPick(plans);
    const createdAt = randomPastDate(365);
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 30);
    const isPaid = i > 2 || Math.random() > 0.2;

    invoices.push({
      id: i,
      invoiceNumber: `INV-${2024}${String(i).padStart(4, '0')}`,
      stripeInvoiceId: `in_test_${randomInt(100000, 999999)}`,
      amount: plan.amount,
      currency: 'USD',
      status: isPaid ? 'paid' : (i === 1 ? 'open' : 'void'),
      description: plan.name,
      paidAt: isPaid ? new Date(createdAt.getTime() + randomInt(1, 5) * 86400000) : null,
      dueDate,
      createdAt,
      downloadUrl: '#',
      lineItems: [
        { description: plan.name, amount: plan.amount },
        ...(Math.random() > 0.7 ? [{ description: 'Additional users (3)', amount: 1500 }] : []),
      ],
    });
  }

  return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Generate test payments
export function generateTestPayments(invoices: TestInvoice[]): TestPayment[] {
  const cardBrands = ['visa', 'mastercard', 'amex'];
  
  return invoices
    .filter(inv => inv.status === 'paid')
    .map((inv, idx) => ({
      id: idx + 1,
      stripePaymentIntentId: `pi_test_${randomInt(100000, 999999)}`,
      amount: inv.amount,
      currency: inv.currency,
      status: 'succeeded' as const,
      paymentMethodType: 'card',
      cardBrand: randomPick(cardBrands),
      cardLast4: String(randomInt(1000, 9999)),
      description: inv.description,
      createdAt: inv.paidAt || inv.createdAt,
    }));
}

// Generate test analytics
export function generateTestAnalytics(): TestAnalytics {
  const dailyStats = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dailyStats.push({
      date: date.toISOString().split('T')[0],
      leads: randomInt(5, 25),
      emails: randomInt(20, 100),
      replies: randomInt(2, 15),
    });
  }

  return {
    totalLeads: randomInt(150, 500),
    newLeadsThisWeek: randomInt(15, 50),
    activeConversations: randomInt(10, 40),
    emailsSent: randomInt(500, 2000),
    openRate: randomInt(35, 55),
    replyRate: randomInt(8, 18),
    conversionRate: randomInt(5, 15),
    revenueThisMonth: randomInt(5000, 25000),
    dailyStats,
  };
}

// Generate all test data
export function generateAllTestData() {
  const leads = generateTestLeads(25);
  const conversations = generateTestConversations(leads, 10);
  const sequences = generateTestSequences(5);
  const invoices = generateTestInvoices(12);
  const payments = generateTestPayments(invoices);
  const analytics = generateTestAnalytics();

  return {
    leads,
    conversations,
    sequences,
    invoices,
    payments,
    analytics,
  };
}

// Export singleton test data (regenerated on server restart)
let cachedTestData: ReturnType<typeof generateAllTestData> | null = null;

export function getTestData() {
  if (!cachedTestData) {
    cachedTestData = generateAllTestData();
  }
  return cachedTestData;
}

export function regenerateTestData() {
  cachedTestData = generateAllTestData();
  return cachedTestData;
}
