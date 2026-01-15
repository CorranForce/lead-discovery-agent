import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Plus, Trash2, Star, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Card brand icons/colors
const CARD_BRANDS: Record<string, { color: string; name: string }> = {
  visa: { color: "#1a1f71", name: "Visa" },
  mastercard: { color: "#eb001b", name: "Mastercard" },
  amex: { color: "#006fcf", name: "American Express" },
  discover: { color: "#ff6000", name: "Discover" },
  diners: { color: "#0079be", name: "Diners Club" },
  jcb: { color: "#0b4ea2", name: "JCB" },
  unionpay: { color: "#e21836", name: "UnionPay" },
};

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  isDefault: boolean;
}

// Add Payment Method Form Component
function AddPaymentMethodForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "An error occurred");
      setIsProcessing(false);
    } else {
      toast.success("Payment method added successfully!");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentMethods() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading } = trpc.billing.listPaymentMethods.useQuery();

  // Create SetupIntent mutation
  const createSetupIntentMutation = trpc.billing.createSetupIntent.useMutation({
    onSuccess: (data) => {
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast.error(data.error || "Failed to initialize payment setup");
      }
    },
    onError: (error) => {
      toast.error(`Failed to initialize: ${error.message}`);
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = trpc.billing.deletePaymentMethod.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Payment method removed");
        utils.billing.listPaymentMethods.invalidate();
      } else {
        toast.error(data.error || "Failed to remove payment method");
      }
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  // Set default payment method mutation
  const setDefaultMutation = trpc.billing.setDefaultPaymentMethod.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Default payment method updated");
        utils.billing.listPaymentMethods.invalidate();
      } else {
        toast.error(data.error || "Failed to update default");
      }
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleAddPaymentMethod = () => {
    createSetupIntentMutation.mutate();
    setIsAddDialogOpen(true);
  };

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    setClientSecret(null);
    utils.billing.listPaymentMethods.invalidate();
  };

  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate({ paymentMethodId });
  };

  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultMutation.mutate({ paymentMethodId });
  };

  const paymentMethods = paymentMethodsData?.paymentMethods || [];

  const getCardBrandInfo = (brand: string) => {
    return CARD_BRANDS[brand.toLowerCase()] || { color: "#6b7280", name: brand };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods for subscriptions and purchases
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddPaymentMethod}>
                <Plus className="mr-2 h-4 w-4" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new credit or debit card to your account
                </DialogDescription>
              </DialogHeader>
              {clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#8b5cf6",
                        colorBackground: "#1f2937",
                        colorText: "#f9fafb",
                        colorDanger: "#ef4444",
                        fontFamily: "Inter, system-ui, sans-serif",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <AddPaymentMethodForm
                    clientSecret={clientSecret}
                    onSuccess={handleAddSuccess}
                    onCancel={() => {
                      setIsAddDialogOpen(false);
                      setClientSecret(null);
                    }}
                  />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No payment methods saved</p>
            <Button variant="outline" onClick={handleAddPaymentMethod}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first card
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((pm: PaymentMethod) => {
              const brandInfo = pm.card ? getCardBrandInfo(pm.card.brand) : null;
              return (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: brandInfo?.color || "#6b7280" }}
                    >
                      {brandInfo?.name.substring(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {brandInfo?.name} •••• {pm.card?.last4}
                        </span>
                        {pm.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {pm.card?.expMonth}/{pm.card?.expYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(pm.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        {setDefaultMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Set Default
                          </>
                        )}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this card ending in{" "}
                            {pm.card?.last4}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePaymentMethod(pm.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
