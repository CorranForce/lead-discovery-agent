import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Building2, MapPin, Users, Globe, Mail, Linkedin, Trash2, ExternalLink, Send, Download, Eye, Info } from "lucide-react";
import { Link } from "wouter";
import { EmailDialog } from "@/components/EmailDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  qualified: "bg-green-500/10 text-green-500 border-green-500/20",
  unqualified: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  converted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function Leads() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<{ email: string; name: string; id: number } | null>(null);

  const utils = trpc.useUtils();
  const { data: leads, isLoading } = trpc.leads.list.useQuery();

  const updateLeadMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      toast.success("Lead updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });

  const deleteLeadMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      toast.success("Lead deleted successfully!");
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete lead: ${error.message}`);
    },
  });

  const handleStatusChange = (leadId: number, newStatus: string) => {
    updateLeadMutation.mutate({
      id: leadId,
      status: newStatus as "new" | "contacted" | "qualified" | "unqualified" | "converted",
    });
  };

  const handleDeleteClick = (leadId: number) => {
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (leadToDelete) {
      deleteLeadMutation.mutate({ id: leadToDelete });
    }
  };

  // Filter and sort leads
  let filteredLeads = leads?.filter(lead => {
    // Filter by status
    const statusMatch = filterStatus === "all" || lead.status === filterStatus;
    
    // Filter by score priority
    let scoreMatch = true;
    if (filterScore === "high") {
      scoreMatch = (lead.score ?? 0) >= 70;
    } else if (filterScore === "medium") {
      scoreMatch = (lead.score ?? 0) >= 40 && (lead.score ?? 0) < 70;
    } else if (filterScore === "low") {
      scoreMatch = (lead.score ?? 0) < 40;
    }
    
    return statusMatch && scoreMatch;
  }) || [];
  
  // Sort leads
  filteredLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === "score-high") {
      return (b.score ?? 0) - (a.score ?? 0);
    } else if (sortBy === "score-low") {
      return (a.score ?? 0) - (b.score ?? 0);
    } else if (sortBy === "name") {
      return a.companyName.localeCompare(b.companyName);
    } else { // recent (default)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const exportToCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    // Define CSV headers
    const headers = [
      "Company Name",
      "Website",
      "Industry",
      "Company Size",
      "Location",
      "Description",
      "Contact Name",
      "Contact Title",
      "Contact Email",
      "Contact LinkedIn",
      "Contact Phone",
      "Status",
      "Score",
      "Notes",
      "Tags",
      "Created At"
    ];

    // Convert leads to CSV rows
    const rows = filteredLeads.map(lead => [
      lead.companyName,
      lead.website || "",
      lead.industry || "",
      lead.companySize || "",
      lead.location || "",
      lead.description?.replace(/\n/g, " ").replace(/"/g, '""') || "",
      lead.contactName || "",
      lead.contactTitle || "",
      lead.contactEmail || "",
      lead.contactLinkedin || "",
      lead.contactPhone || "",
      lead.status,
      lead.score?.toString() || "",
      lead.notes?.replace(/\n/g, " ").replace(/"/g, '""') || "",
      lead.tags || "",
      new Date(lead.createdAt).toLocaleDateString()
    ]);

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredLeads.length} leads to CSV`);
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">My Leads</h1>
          <p className="text-muted-foreground text-lg">
            Manage and track your discovered leads
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={exportToCSV}
            variant="outline"
            disabled={!leads || leads.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="score-high">Score: High to Low</SelectItem>
              <SelectItem value="score-low">Score: Low to High</SelectItem>
              <SelectItem value="name">Name: A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High Priority (70+)</SelectItem>
              <SelectItem value="medium">Medium (40-69)</SelectItem>
              <SelectItem value="low">Low (&lt;40)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {filterStatus === "all" 
                ? "Start discovering leads using the AI-powered search"
                : `No leads with status "${filterStatus}"`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <Link href={`/leads/${lead.id}`}>
                        <CardTitle className="text-xl hover:text-primary cursor-pointer transition-colors">
                          {lead.companyName}
                        </CardTitle>
                      </Link>
                      <Badge className={statusColors[lead.status]} variant="outline">
                        {lead.status}
                      </Badge>
                      {(lead.score ?? 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              className={
                                (lead.score ?? 0) >= 70 
                                  ? "bg-green-500/10 text-green-500 border-green-500/20 cursor-help" 
                                  : (lead.score ?? 0) >= 40 
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 cursor-help"
                                  : "bg-red-500/10 text-red-500 border-red-500/20 cursor-help"
                              }
                              variant="outline"
                            >
                              {(lead.score ?? 0) >= 70 ? "🔥 High" : (lead.score ?? 0) >= 40 ? "⚡ Medium" : "📊 Low"} Priority ({lead.score}/100)
                              <Info className="h-3 w-3 ml-1 inline" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-sm">Score Breakdown:</p>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>Company Size:</span>
                                  <span className="font-medium">{lead.companySize || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Industry Fit:</span>
                                  <span className="font-medium">{lead.industry || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Contact Info:</span>
                                  <span className="font-medium">
                                    {[lead.contactEmail, lead.contactPhone, lead.contactLinkedin].filter(Boolean).length}/3 fields
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground pt-1 border-t">
                                Click lead name to see full score details
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      {lead.industry && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.industry}
                        </span>
                      )}
                      {lead.companySize && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {lead.companySize}
                        </span>
                      )}
                      {lead.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.location}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
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
                    {lead.contactEmail && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmailLead({
                            email: lead.contactEmail!,
                            name: lead.contactName || lead.companyName,
                            id: lead.id,
                          });
                          setEmailDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(lead.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.description && (
                  <p className="text-sm text-muted-foreground">{lead.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Company Info</h4>
                    <div className="space-y-1 text-sm">
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          {lead.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {(lead.contactName || lead.contactEmail || lead.contactLinkedin) && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Contact Person</h4>
                      <div className="space-y-1 text-sm">
                        {lead.contactName && (
                          <p className="font-medium">{lead.contactName}</p>
                        )}
                        {lead.contactTitle && (
                          <p className="text-muted-foreground">{lead.contactTitle}</p>
                        )}
                        {lead.contactEmail && (
                          <a
                            href={`mailto:${lead.contactEmail}`}
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {lead.contactEmail}
                          </a>
                        )}
                        {lead.contactLinkedin && (
                          <a
                            href={lead.contactLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Linkedin className="h-3 w-3" />
                            LinkedIn Profile
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead
              from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailLead && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          defaultTo={emailLead.email}
          defaultSubject={`Follow-up: ${emailLead.name}`}
          leadId={emailLead.id}
        />
      )}
    </div>
    </>
  );
}
