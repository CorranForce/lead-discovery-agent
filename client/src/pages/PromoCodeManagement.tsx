import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Tag, Percent, DollarSign, Calendar, Users, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  coupon: {
    id: string;
    name: string | null;
    percentOff: number | null;
    amountOff: number | null;
    currency: string | null;
    duration: string | null;
    durationInMonths: number | null;
  } | null;
  restrictions: {
    firstTimeTransaction: boolean;
    minimumAmount: number | null;
    minimumAmountCurrency: string | null;
  } | null;
}

export default function PromoCodeManagement() {
  const { user, loading: authLoading } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Form state for new promo code
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationInMonths, setDurationInMonths] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [minimumAmount, setMinimumAmount] = useState("");

  // Fetch promo codes
  const { data: promoCodesData, isLoading, refetch } = trpc.billing.listPromoCodes.useQuery();

  // Create promo code mutation
  const createPromoCodeMutation = trpc.billing.createPromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code created successfully!");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create promo code");
    },
  });

  // Update promo code status mutation
  const updateStatusMutation = trpc.billing.updatePromoCodeStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Promo code ${data.promoCode?.active ? "activated" : "deactivated"}`);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update promo code status");
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = trpc.billing.deleteCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon and promo codes deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete coupon");
    },
  });

  const resetForm = () => {
    setNewCode("");
    setNewName("");
    setDiscountType("percent");
    setDiscountValue("");
    setDuration("once");
    setDurationInMonths("");
    setMaxRedemptions("");
    setExpiresAt("");
    setFirstTimeOnly(false);
    setMinimumAmount("");
  };

  const handleCreatePromoCode = () => {
    if (!newCode || !newName || !discountValue) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPromoCodeMutation.mutate({
      code: newCode.toUpperCase(),
      name: newName,
      discountType,
      discountValue: parseFloat(discountValue),
      duration,
      durationInMonths: durationInMonths ? parseInt(durationInMonths) : undefined,
      maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : undefined,
      expiresAt: expiresAt || undefined,
      firstTimeOnly,
      minimumAmount: minimumAmount ? parseFloat(minimumAmount) : undefined,
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (promoCode: PromoCode) => {
    if (!promoCode.coupon) return "N/A";
    if (promoCode.coupon.percentOff) {
      return `${promoCode.coupon.percentOff}% off`;
    }
    if (promoCode.coupon.amountOff) {
      const amount = promoCode.coupon.amountOff / 100;
      return `$${amount.toFixed(2)} off`;
    }
    return "N/A";
  };

  const formatDuration = (promoCode: PromoCode) => {
    if (!promoCode.coupon) return "N/A";
    switch (promoCode.coupon.duration) {
      case "once":
        return "One-time";
      case "forever":
        return "Forever";
      case "repeating":
        return `${promoCode.coupon.durationInMonths} months`;
      default:
        return promoCode.coupon.duration || "N/A";
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Tag className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to manage promo codes.</p>
        </div>
      </DashboardLayout>
    );
  }

  const promoCodes = promoCodesData?.promoCodes || [];
  const activeCount = promoCodes.filter((pc) => pc.active).length;
  const totalRedemptions = promoCodes.reduce((sum, pc) => sum + pc.timesRedeemed, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Promo Codes</h1>
            <p className="text-muted-foreground">Create and manage discount codes for Stripe checkout</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Promo Code</DialogTitle>
                <DialogDescription>
                  Create a new discount code for customers to use at checkout.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Code */}
                <div className="space-y-2">
                  <Label htmlFor="code">Promo Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g., SUMMER25"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">Alphanumeric only, 3-20 characters</p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Discount Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Sale 25% Off"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type *</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Percentage
                          </div>
                        </SelectItem>
                        <SelectItem value="amount">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fixed Amount
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value *</Label>
                    <div className="relative">
                      <Input
                        id="value"
                        type="number"
                        placeholder={discountType === "percent" ? "25" : "10.00"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {discountType === "percent" ? "%" : "$"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={(v) => setDuration(v as "once" | "repeating" | "forever")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time (single payment)</SelectItem>
                      <SelectItem value="repeating">Repeating (multiple months)</SelectItem>
                      <SelectItem value="forever">Forever (all future payments)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration in months (only for repeating) */}
                {duration === "repeating" && (
                  <div className="space-y-2">
                    <Label htmlFor="durationMonths">Number of Months</Label>
                    <Input
                      id="durationMonths"
                      type="number"
                      placeholder="3"
                      value={durationInMonths}
                      onChange={(e) => setDurationInMonths(e.target.value)}
                    />
                  </div>
                )}

                {/* Max Redemptions */}
                <div className="space-y-2">
                  <Label htmlFor="maxRedemptions">Max Redemptions (optional)</Label>
                  <Input
                    id="maxRedemptions"
                    type="number"
                    placeholder="Unlimited"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                  />
                </div>

                {/* Expiration Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                {/* First Time Only */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>First-time customers only</Label>
                    <p className="text-xs text-muted-foreground">Restrict to new customers</p>
                  </div>
                  <Switch checked={firstTimeOnly} onCheckedChange={setFirstTimeOnly} />
                </div>

                {/* Minimum Amount */}
                <div className="space-y-2">
                  <Label htmlFor="minimumAmount">Minimum Order Amount (optional)</Label>
                  <div className="relative">
                    <Input
                      id="minimumAmount"
                      type="number"
                      placeholder="0.00"
                      value={minimumAmount}
                      onChange={(e) => setMinimumAmount(e.target.value)}
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePromoCode} disabled={createPromoCodeMutation.isPending}>
                  {createPromoCodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Code
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{promoCodes.length}</div>
              <p className="text-xs text-muted-foreground">{activeCount} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRedemptions}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {promoCodes.length > 0 ? Math.round((activeCount / promoCodes.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Of all codes</p>
            </CardContent>
          </Card>
        </div>

        {/* Promo Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Promo Codes</CardTitle>
            <CardDescription>Manage your discount codes and view usage statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Tag className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No promo codes yet</p>
                <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                  Create your first code
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promoCode) => (
                    <TableRow key={promoCode.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{promoCode.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(promoCode.code)}
                          >
                            {copiedCode === promoCode.code ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {promoCode.coupon?.name && (
                          <p className="text-xs text-muted-foreground mt-1">{promoCode.coupon.name}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {promoCode.coupon?.percentOff ? (
                            <Percent className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                          )}
                          {formatDiscount(promoCode)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(promoCode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{promoCode.timesRedeemed}</span>
                          {promoCode.maxRedemptions && (
                            <span className="text-muted-foreground">/ {promoCode.maxRedemptions}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {promoCode.expiresAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(promoCode.expiresAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promoCode.active ? "default" : "secondary"}>
                          {promoCode.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={promoCode.active}
                            onCheckedChange={(active) =>
                              updateStatusMutation.mutate({ promoCodeId: promoCode.id, active })
                            }
                            disabled={updateStatusMutation.isPending}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Promo Code?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the coupon "{promoCode.coupon?.name || promoCode.code}" and all
                                  associated promo codes. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (promoCode.coupon?.id) {
                                      deleteCouponMutation.mutate({ couponId: promoCode.coupon.id });
                                    }
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
