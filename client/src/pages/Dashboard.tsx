import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, MessageSquare, Mail, Plus, TrendingUp, Users, ArrowRight, FlaskConical, Database } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = trpc.account.getStats.useQuery();
  const { data: leads, isLoading: loadingLeads } = trpc.leads.list.useQuery();
  const { data: conversations, isLoading: loadingConversations } = trpc.conversations.list.useQuery();
  const { data: profile } = trpc.account.getProfile.useQuery();
  const utils = trpc.useUtils();

  const isTestMode = profile?.useRealData !== 1;

  const updatePreferencesMutation = trpc.account.updatePreferences.useMutation({
    onSuccess: () => {
      utils.account.getProfile.invalidate();
      utils.account.getStats.invalidate();
      utils.leads.list.invalidate();
      utils.conversations.list.invalidate();
    },
  });

  const handleToggleTestMode = (checked: boolean) => {
    const useRealData = checked ? 0 : 1;
    updatePreferencesMutation.mutate({ useRealData });
    if (checked) {
      toast.info("Switched to Test Data mode", {
        description: "You're now viewing sample data for testing purposes.",
      });
    } else {
      toast.success("Switched to Live Data mode", {
        description: "You're now viewing your real data.",
      });
    }
  };

  const recentLeads = leads?.slice(0, 5) || [];
  const activeConversations = conversations?.filter(c => c.status === "active").slice(0, 5) || [];

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    qualified: "bg-green-500/10 text-green-500 border-green-500/20",
    won: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    lost: "bg-red-500/10 text-red-500 border-red-500/20",
    nurturing: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    unresponsive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    active: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const leadStatuses = [
    { key: "new", label: "New", description: "Recently discovered leads" },
    { key: "contacted", label: "Contacted", description: "Initial outreach sent" },
    { key: "qualified", label: "Qualified", description: "Meets target criteria" },
    { key: "nurturing", label: "Nurturing", description: "Building relationship" },
    { key: "won", label: "Won", description: "Successfully converted" },
    { key: "lost", label: "Lost", description: "Opportunity closed" },
    { key: "unresponsive", label: "Unresponsive", description: "No response received" },
  ];

  return (
    <>
      <div className="container py-8 space-y-8">
      {/* Welcome Section with Test Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back{profile?.name ? `, ${profile.name}` : ""}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your sales pipeline
          </p>
        </div>

        {/* Test Data Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            {isTestMode ? (
              <FlaskConical className="h-4 w-4 text-amber-500" />
            ) : (
              <Database className="h-4 w-4 text-green-500" />
            )}
            <Label htmlFor="test-mode" className="text-sm font-medium cursor-pointer">
              {isTestMode ? "Test Data" : "Live Data"}
            </Label>
          </div>
          <Switch
            id="test-mode"
            checked={isTestMode}
            onCheckedChange={handleToggleTestMode}
            disabled={updatePreferencesMutation.isPending}
          />
        </div>
      </div>

      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <FlaskConical className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">Test Mode Active</p>
            <p className="text-sm text-muted-foreground">
              You're viewing sample data. Toggle off to see your real data.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/discover">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Discover Leads
          </Button>
        </Link>
        <Link href="/conversations">
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalLeads || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads in your pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingConversations ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                activeConversations.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ongoing sales conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalEmails || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Follow-up emails sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Status Guide</CardTitle>
          <CardDescription>Understanding your lead pipeline stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leadStatuses.map((status) => (
              <div key={status.key} className="flex items-start gap-3 p-3 rounded-lg border bg-accent/30">
                <Badge className={statusColors[status.key]} variant="outline">
                  {status.label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {status.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Leads and Active Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>Your latest discovered leads</CardDescription>
              </div>
              <Link href="/leads">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads yet</p>
                <Link href="/discover">
                  <Button variant="link" size="sm" className="mt-2">
                    Start discovering leads
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.companyName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.industry || "No industry"}
                      </p>
                    </div>
                    <Badge className={statusColors[lead.status]} variant="outline">
                      {lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Conversations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>Ongoing sales discussions</CardDescription>
              </div>
              <Link href="/conversations">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active conversations</p>
                <Link href="/conversations">
                  <Button variant="link" size="sm" className="mt-2">
                    Start a conversation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeConversations.map((conversation) => (
                  <Link key={conversation.id} href={`/conversation/${conversation.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conversation.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Updated {new Date(conversation.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Lead Pipeline</p>
                <p className="text-sm text-muted-foreground">
                  You have {stats?.totalLeads || 0} leads in your pipeline. 
                  {(stats?.totalLeads || 0) > 0 
                    ? " Keep engaging with them to move them forward!" 
                    : " Start discovering new leads to grow your business."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Conversation Activity</p>
                <p className="text-sm text-muted-foreground">
                  {activeConversations.length > 0
                    ? `You have ${activeConversations.length} active conversation${activeConversations.length > 1 ? 's' : ''}. Use AI suggestions to improve your responses.`
                    : "No active conversations. Start engaging with your leads!"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
