import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const [activeTab, setActiveTab] = useState<"invoices" | "plans">("invoices");

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = trpc.billing.getInvoices.useQuery({
    limit: 50,
  });

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = trpc.billing.getSubscriptionPlans.useQuery();

  // Sync invoices mutation
  const syncInvoicesMutation = trpc.billing.syncInvoices.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Synced ${data.synced} invoices from Stripe`);
      } else {
        toast.error(data.error || "Failed to sync invoices");
      }
    },
    onError: (error) => {
      toast.error("Failed to sync invoices");
    },
  });

  // Create checkout mutation
  const createCheckoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout...");
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    },
    onError: (error) => {
      toast.error("Failed to create checkout session");
    },
  });

  const handleDownloadInvoice = (downloadUrl: string | null | undefined) => {
    if (!downloadUrl) {
      toast.error("Invoice PDF not available");
      return;
    }
    window.open(downloadUrl, "_blank");
  };

  const handleUpgradeSubscription = (priceId: string, billingCycle: "monthly" | "yearly") => {
    createCheckoutMutation.mutate({ priceId, billingCycle });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-gray-500 mt-2">Manage your subscription and view payment history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "plans"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Plans & Pricing
        </button>
      </div>

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Invoice History</h2>
            <Button
              onClick={() => syncInvoicesMutation.mutate()}
              disabled={syncInvoicesMutation.isPending}
              variant="outline"
            >
              {syncInvoicesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sync from Stripe
            </Button>
          </div>

          {invoicesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{invoice.formattedAmount}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.paidAt
                          ? new Date(invoice.paidAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadInvoice(invoice.downloadUrl)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Subscription Plans</h2>

          {plansLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : plansData?.plans && plansData.plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plansData.plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold">{plan.formattedMonthlyPrice}</p>
                      <p className="text-sm text-gray-500">/month</p>
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2 pt-4">
                      <Button
                        className="w-full"
                        onClick={() =>
                          handleUpgradeSubscription(
                            (plan as any).stripePriceIdMonthly || "",
                            "monthly"
                          )
                        }
                        disabled={!(plan as any).stripePriceIdMonthly || createCheckoutMutation.isPending}
                      >
                        {createCheckoutMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Upgrade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subscription plans available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
