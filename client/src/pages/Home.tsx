import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Database, Zap, TrendingUp, ArrowRight, Sparkles, Target, Mail, BarChart3, CheckCircle2, Star, Quote } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  const benefits = [
    {
      icon: Target,
      title: "Find Your Perfect Customers",
      description: "Stop guessing who to reach out to. Our AI analyzes millions of companies to find prospects that match your ideal customer profile with laser precision.",
    },
    {
      icon: Zap,
      title: "Save 10+ Hours Per Week",
      description: "Eliminate manual research and data entry. Automate lead discovery, enrichment, and scoring so you can focus on what matters—closing deals.",
    },
    {
      icon: TrendingUp,
      title: "3X Your Conversion Rate",
      description: "AI-powered lead scoring ensures you're always talking to the right prospects at the right time. Prioritize high-intent leads and watch your close rate soar.",
    },
    {
      icon: Mail,
      title: "Track Every Interaction",
      description: "Know exactly when leads open your emails, click your links, and engage with your content. Use real-time data to optimize your outreach strategy.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Sales Director",
      company: "TechFlow Solutions",
      image: "/images/professionals-headshots.jpg",
      quote: "This platform cut our lead research time by 80%. We went from spending 2 hours per lead to just 15 minutes. Our team is closing 40% more deals every quarter.",
      rating: 5,
    },
    {
      name: "Marcus Johnson",
      role: "Founder & CEO",
      company: "GrowthLabs",
      image: "/images/team-diverse.jpg",
      quote: "The AI lead scoring is incredibly accurate. We're no longer wasting time on low-quality prospects. Our sales team knows exactly who to prioritize, and it shows in our numbers.",
      rating: 5,
    },
    {
      name: "Jennifer Rodriguez",
      role: "Business Development Manager",
      company: "CloudScale Inc",
      image: "/images/sales-working.jpg",
      quote: "Email tracking changed everything for us. We can see which prospects are engaged and follow up at the perfect moment. Our response rate doubled in the first month.",
      rating: 5,
    },
  ];

  const stats = [
    { value: "10,000+", label: "Leads Discovered" },
    { value: "500+", label: "Active Users" },
    { value: "3X", label: "Avg. Conversion Increase" },
    { value: "15min", label: "Avg. Time Per Lead" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link href="/discover">
                  <Button variant="ghost">Discover</Button>
                </Link>
                <Link href="/how-to">
                  <Button variant="ghost">How It Works</Button>
                </Link>
                <Link href="/account">
                  <Button variant="ghost">Account</Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {user?.name || user?.email}
                </span>
              </>
            ) : (
              <>
                <Link href="/how-to">
                  <Button variant="ghost">How It Works</Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost">Pricing</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started Free</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI-Powered Lead Generation & Prospecting
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Find Your Perfect Customers in{" "}
              <span className="text-primary">Minutes, Not Hours</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Stop wasting time on manual research. Let AI discover, qualify, and enrich high-quality leads that match your ideal customer profile—automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/discover">
                  <Button size="lg" className="text-lg px-8 h-14">
                    Start Discovering Leads
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 h-14">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/how-to">
                    <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                      See How It Works
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Why Sales Teams Love {APP_TITLE}
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
              Transform your lead generation process with AI that works as hard as you do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl mb-3">{benefit.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {benefit.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need to Scale Your Sales
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful AI-driven features designed to supercharge your lead generation and prospecting workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered Discovery</CardTitle>
                <CardDescription>
                  Use natural language to describe your ideal customer and let AI find matching leads instantly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Lead Management</CardTitle>
                <CardDescription>
                  Organize, track, and manage all your leads in one centralized dashboard with status tracking
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Email Automation</CardTitle>
                <CardDescription>
                  Send personalized emails at scale with templates, sequences, and automatic follow-ups
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>
                  Track email opens, clicks, and engagement to optimize your outreach strategy
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Trusted by Sales Professionals Worldwide
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
              See how teams are using {APP_TITLE} to transform their lead generation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                  <CardDescription className="text-base leading-relaxed text-foreground">
                    "{testimonial.quote}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {testimonial.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
        <div className="container">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-16">
              <div className="max-w-3xl mx-auto text-center space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold">
                  Ready to Transform Your Lead Generation?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Join thousands of sales professionals who are using AI to discover and convert more leads every day
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {isAuthenticated ? (
                    <Link href="/discover">
                      <Button size="lg" className="text-lg px-8 h-14">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <Button size="lg" className="text-lg px-8 h-14">
                          Start Free Trial
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link href="/how-to">
                        <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                          Learn More
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t mt-auto bg-muted/20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">{APP_TITLE}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered lead generation and prospecting platform for modern sales teams.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/how-to"><a className="hover:text-foreground transition-colors">How It Works</a></Link></li>
                <li><Link href="/pricing"><a className="hover:text-foreground transition-colors">Pricing</a></Link></li>
                <li><Link href="/discover"><a className="hover:text-foreground transition-colors">Discover Leads</a></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/how-to"><a className="hover:text-foreground transition-colors">Documentation</a></Link></li>
                <li><a href="https://www.youtube.com/@AllenDavis-AI" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Video Tutorials</a></li>
                <li><a href="https://www.facebook.com/allen.davis.54" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about"><a className="hover:text-foreground transition-colors">About Us</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-foreground transition-colors">Contact</a></Link></li>
                <li><Link href="/privacy"><a className="hover:text-foreground transition-colors">Privacy Policy</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 {APP_TITLE}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Powered by AI & Freedom Ops AI
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
