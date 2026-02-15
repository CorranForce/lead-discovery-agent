import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import PublicNavigation from "@/components/PublicNavigation";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceId: string;
  popular?: boolean;
  features: {
    name: string;
    included: boolean;
    value?: string;
  }[];
}

const plans: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for individuals and small teams getting started",
    monthlyPrice: 29,
    yearlyPrice: 290,
    stripePriceId: "price_basic_monthly",
    features: [
      { name: "Lead Discovery", included: true, value: "100 leads/month" },
      { name: "AI-Powered Search", included: true },
      { name: "Email Sequences", included: true, value: "5 active sequences" },
      { name: "Conversations", included: true, value: "50/month" },
      { name: "Apollo.io Integration", included: true },
      { name: "Email Support", included: true },
      { name: "Analytics Dashboard", included: true },
      { name: "CRM Export", included: false },
      { name: "Priority Support", included: false },
      { name: "Custom Integrations", included: false },
      { name: "Dedicated Account Manager", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need more power and flexibility",
    monthlyPrice: 49,
    yearlyPrice: 490,
    stripePriceId: "price_pro_monthly",
    popular: true,
    features: [
      { name: "Lead Discovery", included: true, value: "500 leads/month" },
      { name: "AI-Powered Search", included: true },
      { name: "Email Sequences", included: true, value: "Unlimited" },
      { name: "Conversations", included: true, value: "Unlimited" },
      { name: "Apollo.io Integration", included: true },
      { name: "Email Support", included: true },
      { name: "Analytics Dashboard", included: true },
      { name: "CRM Export", included: true },
      { name: "Priority Support", included: true },
      { name: "Custom Integrations", included: false },
      { name: "Dedicated Account Manager", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    monthlyPrice: 99,
    yearlyPrice: 990,
    stripePriceId: "price_enterprise_monthly",
    features: [
      { name: "Lead Discovery", included: true, value: "Unlimited" },
      { name: "AI-Powered Search", included: true },
      { name: "Email Sequences", included: true, value: "Unlimited" },
      { name: "Conversations", included: true, value: "Unlimited" },
      { name: "Apollo.io Integration", included: true },
      { name: "Email Support", included: true },
      { name: "Analytics Dashboard", included: true },
      { name: "CRM Export", included: true },
      { name: "Priority Support", included: true },
      { name: "Custom Integrations", included: true },
      { name: "Dedicated Account Manager", included: true },
    ],
  },
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { user, isAuthenticated } = useAuth();
  const createCheckoutMutation = trpc.billing.createCheckout.useMutation();

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    try {
      const result = await createCheckoutMutation.mutateAsync({
        priceId: plan.stripePriceId,
        billingCycle: billingCycle,
      });

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error) {
      toast.error("Failed to create checkout session");
      console.error(error);
    }
  };

  const getPrice = (plan: PricingPlan) => {
    return billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: PricingPlan) => {
    const yearlyTotal = plan.monthlyPrice * 12;
    const savings = yearlyTotal - plan.yearlyPrice;
    return Math.round((savings / yearlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />

      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Choose the perfect plan for your business needs
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2 rounded-md transition-colors ${
              billingCycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2 rounded-md transition-colors ${
              billingCycle === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">
              Save up to 17%
            </Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      ${getPrice(plan)}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Save {getSavings(plan)}% with yearly billing
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {feature.name}
                        {feature.value && (
                          <span className="text-muted-foreground">
                            {" "}
                            - {feature.value}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSubscribe(plan)}
                  disabled={createCheckoutMutation.isPending}
                >
                  {createCheckoutMutation.isPending
                    ? "Loading..."
                    : isAuthenticated
                    ? "Get Started"
                    : "Sign Up"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          Compare All Features
        </h2>

        <div className="max-w-6xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center py-4 px-4 font-semibold">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans[0].features.map((_, featureIndex) => (
                <tr key={featureIndex} className="border-b hover:bg-muted/50">
                  <td className="py-4 px-4">
                    {plans[0].features[featureIndex].name}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.features[featureIndex].included ? (
                        plan.features[featureIndex].value ? (
                          <span className="text-sm font-medium">
                            {plan.features[featureIndex].value}
                          </span>
                        ) : (
                          <Check className="h-5 w-5 text-green-600 inline-block" />
                        )
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground inline-block" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Can I change plans later?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes
                will be prorated and reflected in your next billing cycle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                What payment methods do you accept?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American
                Express) through our secure Stripe payment processor.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Is there a free trial?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We offer a 14-day free trial for all plans. No credit card
                required to start your trial.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Can I cancel my subscription?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes, you can cancel your subscription at any time from your
                account settings. You'll continue to have access until the end of
                your billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Do you offer refunds?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee. If you're not satisfied
                with our service, contact us within 30 days for a full refund.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 pb-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to supercharge your sales?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of sales teams using our platform to discover and
              convert more leads.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = getLoginUrl();
                } else {
                  handleSubscribe(plans[1]); // Pro plan
                }
              }}
            >
              Start Your Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
