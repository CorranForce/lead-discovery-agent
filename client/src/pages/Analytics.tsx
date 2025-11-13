import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30");
  
  const { data: sentEmails, isLoading: emailsLoading } = trpc.email.history.useQuery({});
  const { data: templates } = trpc.email.listTemplates.useQuery();
  const { data: sequences } = trpc.sequences.list.useQuery();
  const { data: clickData } = trpc.clicks.list.useQuery();

  // Calculate analytics metrics
  const calculateMetrics = () => {
    if (!sentEmails || sentEmails.length === 0) {
      return {
        totalSent: 0,
        openRate: 0,
        responseRate: 0,
        conversionRate: 0,
        templateStats: [],
        sequenceStats: [],
      };
    }

    const totalSent = sentEmails.length;
    const totalClicks = clickData?.length || 0;
    const opened = sentEmails.filter((e: any) => e.status === 'sent' || e.status === 'delivered').length;
    const responded = sentEmails.filter((e: any) => e.status === 'delivered').length;
    const clickThroughRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
    
    // Template performance
    const templateMap = new Map();
    sentEmails.forEach((email: any) => {
      if (!templateMap.has(email.templateId)) {
        templateMap.set(email.templateId, {
          templateId: email.templateId,
          name: templates?.find((t: any) => t.id === email.templateId)?.name || 'Unknown',
          sent: 0,
          opened: 0,
        });
      }
      const stats = templateMap.get(email.templateId);
      stats.sent++;
      if (email.status === 'sent' || email.status === 'delivered') stats.opened++;
    });

    const templateStats = Array.from(templateMap.values()).map(stat => ({
      ...stat,
      openRate: stat.sent > 0 ? ((stat.opened / stat.sent) * 100).toFixed(1) : '0.0',
    }));

    return {
      totalSent,
      totalClicks,
      clickThroughRate,
      openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : '0.0',
      responseRate: totalSent > 0 ? ((responded / totalSent) * 100).toFixed(1) : '0.0',
      conversionRate: totalSent > 0 ? ((responded / totalSent) * 100).toFixed(1) : '0.0',
      templateStats,
      sequenceStats: [],
    };
  };

  const metrics = calculateMetrics();

  if (emailsLoading) {
    return (
      <>
        <Navigation />
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Email Analytics</h1>
            <p className="text-muted-foreground text-lg">
              Track and optimize your email outreach performance
            </p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Statistics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalSent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.openRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average across templates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.responseRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads who responded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successful conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Template Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Template Performance
            </CardTitle>
            <CardDescription>
              Compare performance across different email templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.templateStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email data available yet</p>
                <p className="text-sm mt-2">Start sending emails to see analytics</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 pb-2 border-b font-medium text-sm">
                  <div>Template Name</div>
                  <div className="text-right">Emails Sent</div>
                  <div className="text-right">Opened</div>
                  <div className="text-right">Open Rate</div>
                </div>
                {metrics.templateStats.map((stat, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 py-3 border-b last:border-0">
                    <div className="font-medium">{stat.name}</div>
                    <div className="text-right text-muted-foreground">{stat.sent}</div>
                    <div className="text-right text-muted-foreground">{stat.opened}</div>
                    <div className="text-right">
                      <span className="font-semibold text-green-600">{stat.openRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sequence Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sequence Performance
            </CardTitle>
            <CardDescription>
              Track the effectiveness of your email sequences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sequences || sequences.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sequences created yet</p>
                <p className="text-sm mt-2">Create email sequences to track their performance</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium text-sm">
                  <div>Sequence Name</div>
                  <div className="text-right">Status</div>
                  <div className="text-right">Steps</div>
                  <div className="text-right">Enrollments</div>
                  <div className="text-right">Completion Rate</div>
                </div>
                {sequences.map((sequence) => (
                  <div key={sequence.id} className="grid grid-cols-5 gap-4 py-3 border-b last:border-0">
                    <div className="font-medium">{sequence.name}</div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sequence.isActive 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {sequence.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="text-right text-muted-foreground">-</div>
                    <div className="text-right text-muted-foreground">0</div>
                    <div className="text-right font-semibold">0%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
