import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const TIER_COLORS: Record<string, string> = {
  free: "#6b7280",
  basic: "#3b82f6",
  pro: "#8b5cf6",
  enterprise: "#f59e0b",
};

export default function AdminBilling() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState<"30" | "90" | "365">("30");

  // Fetch billing metrics
  const metricsQuery = trpc.billing.getMetricsSummary.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const monthlyRevenueQuery = trpc.billing.getMonthlyRevenue.useQuery(
    { months: parseInt(timeRange) / 30 },
    { enabled: user?.role === "admin" }
  );

  const dailyRevenueQuery = trpc.billing.getDailyRevenue.useQuery(
    { days: parseInt(timeRange) },
    { enabled: user?.role === "admin" }
  );

  const subscriptionCountsQuery = trpc.billing.getSubscriptionCounts.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const recentPaymentsQuery = trpc.billing.getRecentPaymentsAdmin.useQuery(
    { limit: 10 },
    { enabled: user?.role === "admin" }
  );

  const revenueByTierQuery = trpc.billing.getRevenueByTier.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Redirect non-admin users
  if (!authLoading && (!user || user.role !== "admin")) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading || metricsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = metricsQuery.data?.metrics;
  const dailyData = dailyRevenueQuery.data?.data || [];
  const subscriptionCounts = subscriptionCountsQuery.data?.counts || [];
  const recentPayments = recentPaymentsQuery.data?.payments || [];
  const revenueByTier = revenueByTierQuery.data?.data || [];

  // Format subscription counts for pie chart
  const pieData = subscriptionCounts.map((item) => ({
    name: item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : "Unknown",
    value: item.count,
    color: TIER_COLORS[item.tier || "free"] || "#6b7280",
  }));

  // Calculate total users
  const totalUsers = subscriptionCounts.reduce((sum, item) => sum + item.count, 0);

  // Format revenue for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      succeeded: "default",
      processing: "secondary",
      failed: "destructive",
      canceled: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Revenue metrics and payment activity
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              metricsQuery.refetch();
              dailyRevenueQuery.refetch();
              subscriptionCountsQuery.refetch();
              recentPaymentsQuery.refetch();
              revenueByTierQuery.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.currentMonthRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(metrics?.growthRate || 0) >= 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{metrics?.growthRate?.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3 h-3 text-red-500 mr-1" />
                  <span className="text-red-500">{metrics?.growthRate?.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All-Time Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.allTimeRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.allTimeTransactions || 0} total transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subscription tiers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Subscribers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionCounts
                .filter((s) => s.tier !== "free")
                .reduce((sum, s) => sum + s.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basic, Pro & Enterprise
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Subscription Distribution
            </CardTitle>
            <CardDescription>Users by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} users`,
                        name,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No subscription data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Subscription Tier</CardTitle>
          <CardDescription>Total revenue generated from each tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {revenueByTier.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueByTier.map((item) => ({
                    tier: item.tier
                      ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1)
                      : "Unknown",
                    revenue: item.revenue,
                    color: TIER_COLORS[item.tier || "free"] || "#6b7280",
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                  />
                  <YAxis type="category" dataKey="tier" width={80} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {revenueByTier.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={TIER_COLORS[entry.tier || "free"] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No revenue data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment activity across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.userName || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.userEmail || "No email"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.formattedAmount}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="capitalize">
                      {payment.paymentMethodType}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{formatDate(payment.createdAt)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(payment.createdAt)}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payment activity yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
