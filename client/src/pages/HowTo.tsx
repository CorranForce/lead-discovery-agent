import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, Target, Mail, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HowTo() {
  const [, setLocation] = useLocation();

  const steps = [
    {
      icon: Search,
      title: "Step 1: Start Your Lead Discovery",
      description: "Navigate to the Discover page and describe your ideal customer in plain English.",
      details: [
        'Click "Discover" in the sidebar navigation',
        'Type a natural language query like "SaaS companies that need automation" or "healthcare companies in Texas"',
        'The AI will understand your intent and search for matching leads',
      ],
      tip: "Be specific! The more details you provide, the better the results.",
    },
    {
      icon: Filter,
      title: "Step 2: Refine with Filters",
      description: "Use advanced filters to narrow down your search and find the perfect prospects.",
      details: [
        "Select an industry from the dropdown (e.g., Technology, Healthcare, Finance)",
        "Choose company size: Small (1-50), Medium (51-200), or Large (201+)",
        "Add location filters to target specific regions or cities",
        'Toggle "Use Real Data" in Account settings to switch between test and live Apollo.io data',
      ],
      tip: "Start broad, then narrow down. You can always refine your search later.",
    },
    {
      icon: Target,
      title: "Step 3: Review and Score Leads",
      description: "Examine discovered leads and understand their priority scores.",
      details: [
        "Each lead shows a score badge: 🔥 High (70+), ⚡ Medium (40-69), or 📊 Low (<40)",
        "Scores are calculated based on company size, industry fit, contact completeness, and engagement",
        "Click on any lead card to view detailed information and score breakdown",
        "Sort leads by score (High to Low) to focus on the best opportunities first",
      ],
      tip: "High-priority leads have complete contact info and match your ideal customer profile.",
    },
    {
      icon: Mail,
      title: "Step 4: Engage with Outreach",
      description: "Send personalized emails and track engagement to build relationships.",
      details: [
        'Click "Send Email" on any lead detail page',
        "Choose from pre-built templates or create custom messages",
        "Email opens and link clicks are automatically tracked",
        "Lead scores update automatically based on engagement (opens, clicks, replies)",
        "Follow up with high-engagement leads using the conversation feature",
      ],
      tip: "Personalize your emails! Mention specific details about their company or industry.",
    },
    {
      icon: TrendingUp,
      title: "Step 5: Monitor Performance",
      description: "Track your outreach effectiveness and optimize your strategy.",
      details: [
        'Visit "Email Engagement" to see open rates, click rates, and response metrics',
        "Identify which email templates perform best and replicate success",
        "Use the Analytics dashboard to track lead pipeline progress",
        "Export high-performing leads to CSV for CRM integration",
        "Set up email sequences to automate follow-ups for nurturing leads",
      ],
      tip: "Test different subject lines and email content to improve your conversion rates.",
    },
  ];

  const faqs = [
    {
      question: "What's the difference between Test Data and Real Data?",
      answer:
        'Test Data uses AI-generated templates for demonstration purposes. Real Data connects to Apollo.io to fetch actual company information. Toggle "Use Real Data" in your Account settings to switch modes.',
    },
    {
      question: "How are lead scores calculated?",
      answer:
        "Lead scores are calculated using AI that evaluates multiple factors: company size (larger companies score higher), industry relevance, contact information completeness (email, phone, LinkedIn), and engagement signals (email opens, clicks, replies). Scores range from 0-100.",
    },
    {
      question: "Can I export my leads to other tools?",
      answer:
        'Yes! Click the "Export CSV" button on the Leads page to download all your leads with complete information. You can then import this file into your CRM or other sales tools.',
    },
    {
      question: "How does email tracking work?",
      answer:
        "When you send an email, we embed an invisible 1x1 pixel image and wrap all links with tracking URLs. When the recipient opens the email or clicks a link, we log the event and automatically update the lead's score to reflect their engagement level.",
    },
    {
      question: "What are email sequences?",
      answer:
        "Email sequences are automated follow-up campaigns. You can create a series of emails that are sent automatically at specific intervals (e.g., Day 1, Day 3, Day 7). This helps you nurture leads without manual follow-up work.",
    },
    {
      question: "How do I get Apollo.io API access?",
      answer:
        'Sign up for a free Apollo.io account at apollo.io and generate an API key from your settings. Add the key in your Account settings under "Use Real Data". The free tier provides organization-level data; paid plans unlock individual contact details.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <h1 className="text-4xl font-bold mb-2">How to Use Lead Discovery</h1>
          <p className="text-muted-foreground text-lg">
            Your complete guide to finding, engaging, and converting high-quality leads
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {/* Quick Start */}
        <Card className="mb-12 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Get up and running in 5 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Go to <strong>Account Settings</strong> and toggle "Use Real Data" if you have an Apollo.io API key
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>
                  Navigate to <strong>Discover</strong> and describe your ideal customer
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>
                  Review the results and click on high-priority leads (🔥 High Score)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>
                  Send personalized emails using templates or create your own
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">5.</span>
                <span>
                  Monitor engagement in <strong>Email Engagement</strong> and follow up with interested leads
                </span>
              </li>
            </ol>
            <div className="mt-6 flex gap-4">
              <Button onClick={() => setLocation("/discover")}>Start Discovering Leads</Button>
              <Button variant="outline" onClick={() => setLocation("/account")}>
                Configure Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Guide */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Step-by-Step Guide</h2>
          <div className="space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                        <CardDescription className="text-base">{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                      <p className="text-sm">
                        <strong className="text-primary">💡 Pro Tip:</strong> {step.tip}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-12" />

        {/* FAQ Section */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Get Help Section */}
        <Card className="mt-12 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>We're here to support your success</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              If you have questions not covered in this guide, reach out to our support team or check out our video
              tutorials on YouTube.
            </p>
            <div className="flex gap-4">
              <Button variant="outline">Contact Support</Button>
              <Button variant="outline" onClick={() => window.open("https://www.youtube.com/@AllenDavis-AI", "_blank")}>
                Watch Video Tutorials
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
