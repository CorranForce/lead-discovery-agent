import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Building2, MapPin, Users, Globe, Mail, Linkedin, Phone, 
  ArrowLeft, Send, MessageSquare, TrendingUp, MousePointerClick, Eye 
} from "lucide-react";
import { EmailDialog } from "@/components/EmailDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  qualified: "bg-green-500/10 text-green-500 border-green-500/20",
  unqualified: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  converted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function LeadDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const leadId = parseInt(params.id || "0");
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: lead, isLoading } = trpc.leads.get.useQuery({ id: leadId });
  const { data: emailClicks } = trpc.clicks.byLead.useQuery({ leadId });
  const { data: sentEmails } = trpc.email.history.useQuery({});
  const { data: timeline } = trpc.leads.engagementTimeline.useQuery({ leadId });
  
  const updateLeadMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.get.invalidate({ id: leadId });
      toast.success("Lead updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });

  const recalculateScoreMutation = trpc.leads.recalculateScore.useMutation({
    onSuccess: (result) => {
      utils.leads.get.invalidate({ id: leadId });
      toast.success(`Score recalculated: ${result.score}/100`);
    },
    onError: (error) => {
      toast.error(`Failed to recalculate score: ${error.message}`);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    updateLeadMutation.mutate({
      id: leadId,
      status: newStatus as "new" | "contacted" | "qualified" | "unqualified" | "converted",
    });
  };

  const handleRecalculateScore = () => {
    recalculateScoreMutation.mutate({ id: leadId });
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </>
    );
  }

  if (!lead) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">Lead not found</h3>
              <Button onClick={() => setLocation("/leads")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const leadEmails = sentEmails?.filter(email => email.leadId === leadId) || [];
  const score = lead.score ?? 0;
  const priorityLevel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const priorityColor = score >= 70 
    ? "bg-green-500/10 text-green-500 border-green-500/20" 
    : score >= 40 
    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    : "bg-red-500/10 text-red-500 border-red-500/20";

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <div className="flex items-center gap-2">
            {lead.contactEmail && (
              <Button
                onClick={() => setEmailDialogOpen(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation("/conversations")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          </div>
        </div>

        {/* Lead Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{lead.companyName}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-base">
                  {lead.industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {lead.industry}
                    </span>
                  )}
                  {lead.companySize && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {lead.companySize}
                    </span>
                  )}
                  {lead.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {lead.location}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[lead.status]} variant="outline">
                  {lead.status}
                </Badge>
                {score > 0 && (
                  <Badge className={priorityColor} variant="outline">
                    {priorityLevel === "High" ? "🔥" : priorityLevel === "Medium" ? "⚡" : "📊"} {priorityLevel} Priority
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.description && (
              <p className="text-muted-foreground">{lead.description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {lead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.website}</span>
                </div>
              )}
              {lead.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.contactEmail}</span>
                </div>
              )}
              {lead.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.contactPhone}</span>
                </div>
              )}
              {lead.contactLinkedin && (
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">LinkedIn Profile</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={lead.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed information */}
        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="score">Lead Score</TabsTrigger>
            <TabsTrigger value="engagement">Engagement History</TabsTrigger>
            <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lead Score Breakdown</CardTitle>
                    <CardDescription>AI-powered evaluation based on multiple factors</CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleRecalculateScore} disabled={recalculateScoreMutation.isPending}>
                    {recalculateScoreMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TrendingUp className="h-4 w-4 mr-2" />
                    )}
                    Recalculate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary">{score}</div>
                    <div className="text-muted-foreground">out of 100</div>
                    <Badge className={`${priorityColor} mt-4`} variant="outline">
                      {priorityLevel} Priority Lead
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Scoring Factors</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Company Size</span>
                          <span className="text-muted-foreground">
                            {lead.companySize ? "Evaluated" : "Not provided"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Larger companies typically have bigger budgets and more decision-making power
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Contact Information</span>
                          <span className="text-muted-foreground">
                            {[lead.contactEmail, lead.contactPhone, lead.contactLinkedin].filter(Boolean).length}/3 fields
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Complete contact details enable better outreach and engagement
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Engagement Signals</span>
                          <span className="text-muted-foreground">
                            {emailClicks?.length || 0} clicks
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Email opens and link clicks indicate active interest
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Data Quality</span>
                          <span className="text-muted-foreground">
                            {[lead.website, lead.industry, lead.location, lead.description].filter(Boolean).length}/4 fields
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rich lead data helps with personalization and targeting
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Email interactions and click tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Send className="h-8 w-8 text-blue-500" />
                        <div>
                          <div className="text-2xl font-bold">{leadEmails.length}</div>
                          <div className="text-sm text-muted-foreground">Emails Sent</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Eye className="h-8 w-8 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">0</div>
                          <div className="text-sm text-muted-foreground">Emails Opened</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <MousePointerClick className="h-8 w-8 text-purple-500" />
                        <div>
                          <div className="text-2xl font-bold">{emailClicks?.length || 0}</div>
                          <div className="text-sm text-muted-foreground">Links Clicked</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {emailClicks && emailClicks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Click History</h4>
                    <div className="space-y-2">
                      {emailClicks.map((click) => (
                        <div key={click.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm truncate">{click.originalUrl}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(click.clickedAt).toLocaleString()}
                            </div>
                          </div>
                          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {leadEmails.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No emails sent to this lead yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Timeline</CardTitle>
                <CardDescription>Complete history of all interactions with this lead</CardDescription>
              </CardHeader>
              <CardContent>
                {timeline && timeline.length > 0 ? (
                  <div className="space-y-4">
                    {timeline.map((event) => {
                      const eventIcon = {
                        email_sent: <Send className="h-5 w-5 text-blue-500" />,
                        email_opened: <Eye className="h-5 w-5 text-green-500" />,
                        email_clicked: <MousePointerClick className="h-5 w-5 text-purple-500" />,
                        status_changed: <TrendingUp className="h-5 w-5 text-orange-500" />,
                      }[event.type];

                      const eventColor = {
                        email_sent: "bg-blue-500/10",
                        email_opened: "bg-green-500/10",
                        email_clicked: "bg-purple-500/10",
                        status_changed: "bg-orange-500/10",
                      }[event.type];

                      return (
                        <div key={event.id} className="flex gap-4 pb-4 border-b last:border-0">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full ${eventColor} flex items-center justify-center`}>
                              {eventIcon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium capitalize">
                              {event.type.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm text-muted-foreground">{event.description}</div>
                            {event.metadata && 'url' in event.metadata && typeof event.metadata.url === 'string' && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                URL: {String(event.metadata.url)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Lead Created Event */}
                    <div className="flex gap-4 pb-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Lead Created</div>
                        <div className="text-sm text-muted-foreground">
                          Added to your pipeline
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(lead.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No engagement activity yet</p>
                    <p className="text-sm mt-1">Send an email to start tracking engagement</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {lead.contactEmail && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          defaultTo={lead.contactEmail}
          defaultSubject={`Follow up with ${lead.companyName}`}
          leadId={lead.id}
        />
      )}
    </>
  );
}
