import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Crown,
  Calendar,
  CreditCard,
  Loader2,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-500", label: "Active" },
  trialing: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Trial" },
  past_due: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Past Due" },
  canceled: { bg: "bg-red-500/10", text: "text-red-500", label: "Canceled" },
  incomplete: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Incomplete" },
  incomplete_expired: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Expired" },
  unpaid: { bg: "bg-red-500/10", text: "text-red-500", label: "Unpaid" },
  paused: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Paused" },
};

interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  prices: {
    id: string;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
    formattedAmount: string;
  }[];
  metadata: Record<string, string>;
}

export default function SubscriptionManagement() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const utils = trpc.useUtils();

  // Fetch current subscription
  const { data: subscriptionData, isLoading: loadingSubscription } =
    trpc.billing.getCurrentSubscription.useQuery();

  // Fetch upcoming invoice
  const { data: upcomingInvoiceData, isLoading: loadingUpcoming } =
    trpc.billing.getUpcomingInvoice.useQuery();

  // Fetch available plans
  const { data: plansData, isLoading: loadingPlans } =
    trpc.billing.getAvailablePlans.useQuery();

  // Create billing portal session
  const createPortalMutation = trpc.billing.createBillingPortal.useMutation({
    onSuccess: (data) => {
      if (data.success && data.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Change plan mutation
  const changePlanMutation = trpc.billing.changePlan.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Plan updated successfully!");
        utils.billing.getCurrentSubscription.invalidate();
        utils.billing.getUpcomingInvoice.invalidate();
        setShowUpgradeDialog(false);
      } else {
        toast.error(data.error || "Failed to change plan");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Cancel subscription mutation
  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Subscription will be canceled at the end of the billing period");
        utils.billing.getCurrentSubscription.invalidate();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Reactivate subscription mutation
  const reactivateMutation = trpc.billing.reactivateSubscription.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Subscription reactivated!");
        utils.billing.getCurrentSubscription.invalidate();
      } else {
        toast.error(data.error || "Failed to reactivate subscription");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Create checkout mutation for new subscriptions
  const createCheckoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(data.checkoutUrl, "_blank");
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const subscription = subscriptionData?.subscription;
  const upcomingInvoice = upcomingInvoiceData?.upcomingInvoice;
  const plans = plansData?.plans || [];

  const isLoading = loadingSubscription || loadingUpcoming || loadingPlans;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleUpgrade = (plan: Plan, priceId: string) => {
    setSelectedPlan(plan);
    setSelectedPriceId(priceId);
    setShowUpgradeDialog(true);
  };

  const confirmPlanChange = () => {
    if (!selectedPriceId) return;

    if (subscription) {
      // Change existing subscription
      changePlanMutation.mutate({ newPriceId: selectedPriceId });
    } else {
      // Create new subscription
      const price = selectedPlan?.prices.find((p) => p.id === selectedPriceId);
      createCheckoutMutation.mutate({
        priceId: selectedPriceId,
        billingCycle: price?.interval === "year" ? "yearly" : "monthly",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            {subscription && (
              <Badge
                className={`${STATUS_COLORS[subscription.status]?.bg || "bg-gray-500/10"} ${
                  STATUS_COLORS[subscription.status]?.text || "text-gray-500"
                }`}
              >
                {STATUS_COLORS[subscription.status]?.label || subscription.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription ? (
            <>
              {/* Plan Details */}
              <div className="flex items-start justify-between p-4 bg-accent/50 rounded-lg">
                <div>
                  <h3 className="text-xl font-semibold">{subscription.plan.name}</h3>
                  <p className="text-muted-foreground">{subscription.plan.description}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {subscription.plan.formattedAmount}
                    </span>
                    <span className="text-muted-foreground">
                      /{subscription.plan.interval}
                    </span>
                  </div>
                </div>
                {subscription.defaultPaymentMethod && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="capitalize">
                      {subscription.defaultPaymentMethod.brand} ••••{" "}
                      {subscription.defaultPaymentMethod.last4}
                    </span>
                  </div>
                )}
              </div>

              {/* Billing Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Current Period
                  </div>
                  <p className="font-medium">
                    {formatDate(subscription.currentPeriodStart)} -{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Next Billing Date
                  </div>
                  <p className="font-medium">
                    {subscription.cancelAtPeriodEnd
                      ? "Cancels on " + formatDate(subscription.currentPeriodEnd)
                      : formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>

              {/* Upcoming Invoice */}
              {upcomingInvoice && !subscription.cancelAtPeriodEnd && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Upcoming Payment</p>
                      <p className="text-lg font-semibold">
                        {upcomingInvoice.formattedAmount}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDate(upcomingInvoice.dueDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancel Warning */}
              {subscription.cancelAtPeriodEnd && (
                <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">
                        Subscription Scheduled to Cancel
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your subscription will end on{" "}
                        {formatDate(subscription.currentPeriodEnd)}. You can reactivate
                        anytime before this date.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-4">
                Choose a plan below to unlock premium features
              </p>
            </div>
          )}
        </CardContent>
        {subscription && (
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={() => createPortalMutation.mutate()}
              disabled={createPortalMutation.isPending}
            >
              {createPortalMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage in Stripe
            </Button>
            <div className="flex gap-2">
              {subscription.cancelAtPeriodEnd ? (
                <Button
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                >
                  {reactivateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reactivate
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your subscription will remain active until{" "}
                        {formatDate(subscription.currentPeriodEnd)}. After that, you'll
                        lose access to premium features. You can reactivate anytime before
                        the cancellation date.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Available Plans */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {subscription ? "Change Plan" : "Choose a Plan"}
            </CardTitle>
            <CardDescription>
              {subscription
                ? "Upgrade or downgrade your subscription"
                : "Select a plan to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const monthlyPrice = plan.prices.find((p) => p.interval === "month");
                const yearlyPrice = plan.prices.find((p) => p.interval === "year");
                const isCurrentPlan =
                  subscription?.plan.productId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative p-4 border rounded-lg ${
                      isCurrentPlan
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-2 left-4 bg-primary">
                        Current Plan
                      </Badge>
                    )}
                    <h3 className="text-lg font-semibold mt-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>

                    {monthlyPrice && (
                      <div className="mb-4">
                        <span className="text-2xl font-bold">
                          {monthlyPrice.formattedAmount}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    )}

                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {plan.features.slice(0, 4).map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2">
                      {monthlyPrice && !isCurrentPlan && (
                        <Button
                          className="w-full"
                          variant={isCurrentPlan ? "outline" : "default"}
                          onClick={() => handleUpgrade(plan, monthlyPrice.id)}
                          disabled={isCurrentPlan}
                        >
                          {subscription ? "Switch to Monthly" : "Get Started"}
                          <ArrowUpRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      {yearlyPrice && !isCurrentPlan && (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleUpgrade(plan, yearlyPrice.id)}
                          disabled={isCurrentPlan}
                        >
                          {yearlyPrice.formattedAmount}/year (Save 20%)
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subscription ? "Change Plan" : "Subscribe to"} {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              {subscription
                ? "Your plan will be updated immediately. Any price difference will be prorated."
                : "You'll be redirected to Stripe to complete your subscription."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-accent rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedPlan?.name}</span>
                <span className="font-bold">
                  {selectedPlan?.prices.find((p) => p.id === selectedPriceId)
                    ?.formattedAmount}
                  /
                  {selectedPlan?.prices.find((p) => p.id === selectedPriceId)?.interval}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmPlanChange}
              disabled={changePlanMutation.isPending || createCheckoutMutation.isPending}
            >
              {changePlanMutation.isPending || createCheckoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {subscription ? "Confirm Change" : "Continue to Checkout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
