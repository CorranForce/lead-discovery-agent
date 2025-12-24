import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, MousePointerClick, TrendingUp, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function EmailEngagement() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Fetch engagement data
  const { data: overview, isLoading: overviewLoading } = trpc.email.engagementOverview.useQuery({ dateRange });
  const { data: trends, isLoading: trendsLoading } = trpc.email.engagementTrends.useQuery({ dateRange: dateRange === 'all' ? '90d' : dateRange });
  const { data: templatePerf, isLoading: templateLoading } = trpc.email.templatePerformance.useQuery({ dateRange });
  const { data: sequencePerf, isLoading: sequenceLoading } = trpc.email.sequencePerformance.useQuery({ dateRange });

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Email Engagement Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Track email performance, open rates, and click-through rates
            </p>
          </div>
          
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Statistics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overviewLoading ? "..." : overview?.totalSent || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Emails sent in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overviewLoading ? "..." : `${overview?.openRate || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview?.totalOpens || 0} unique opens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overviewLoading ? "..." : `${overview?.clickRate || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview?.totalClicks || 0} unique clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overviewLoading ? "..." : Math.round(((overview?.openRate || 0) + (overview?.clickRate || 0)) / 2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average of open & click rates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Trends Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>
              Daily email sends, opens, and clicks over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : !trends || trends.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for the selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Sent" />
                  <Line type="monotone" dataKey="opens" stroke="#82ca9d" name="Opens" />
                  <Line type="monotone" dataKey="clicks" stroke="#ffc658" name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Template Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>
              Compare performance across different email templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templateLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !templatePerf || templatePerf.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No template data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Open Rate</TableHead>
                    <TableHead className="text-right">Click Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatePerf.map((template) => (
                    <TableRow key={template.templateId}>
                      <TableCell className="font-medium">{template.templateName}</TableCell>
                      <TableCell className="text-right">{template.sent}</TableCell>
                      <TableCell className="text-right">{template.opens}</TableCell>
                      <TableCell className="text-right">{template.clicks}</TableCell>
                      <TableCell className="text-right">{template.openRate}%</TableCell>
                      <TableCell className="text-right">{template.clickRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sequence Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Sequence Performance</CardTitle>
            <CardDescription>
              Track performance of automated email sequences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sequenceLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !sequencePerf || sequencePerf.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sequence data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence Name</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Open Rate</TableHead>
                    <TableHead className="text-right">Click Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequencePerf.map((sequence) => (
                    <TableRow key={sequence.sequenceId}>
                      <TableCell className="font-medium">{sequence.sequenceName}</TableCell>
                      <TableCell className="text-right">{sequence.sent}</TableCell>
                      <TableCell className="text-right">{sequence.opens}</TableCell>
                      <TableCell className="text-right">{sequence.clicks}</TableCell>
                      <TableCell className="text-right">{sequence.openRate}%</TableCell>
                      <TableCell className="text-right">{sequence.clickRate}%</TableCell>
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
