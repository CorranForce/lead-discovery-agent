import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, MapPin, Users, Globe, Mail, Linkedin, Trash2, ExternalLink } from "lucide-react";
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

  const filteredLeads = leads?.filter(lead => 
    filterStatus === "all" || lead.status === filterStatus
  ) || [];

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">My Leads</h1>
          <p className="text-muted-foreground text-lg">
            Manage and track your discovered leads
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
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
                      <CardTitle className="text-xl">{lead.companyName}</CardTitle>
                      <Badge className={statusColors[lead.status]} variant="outline">
                        {lead.status}
                      </Badge>
                      {(lead.score ?? 0) > 0 && (
                        <Badge variant="secondary">
                          Score: {lead.score}/100
                        </Badge>
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
    </div>
  );
}
