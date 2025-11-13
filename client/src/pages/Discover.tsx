import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Building2, MapPin, Users, Globe, Mail, Linkedin, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Discover() {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [discoveredLeads, setDiscoveredLeads] = useState<any[]>([]);

  const discoverMutation = trpc.leads.discover.useMutation({
    onSuccess: (leads) => {
      setDiscoveredLeads(leads);
      toast.success(`Discovered ${leads.length} potential leads!`);
    },
    onError: (error) => {
      toast.error(`Discovery failed: ${error.message}`);
    },
  });

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save lead: ${error.message}`);
    },
  });

  const handleDiscover = () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    discoverMutation.mutate({
      query,
      industry: industry && industry !== 'any' ? industry : undefined,
      companySize: companySize && companySize !== 'any' ? companySize : undefined,
      location: location || undefined,
    });
  };

  const handleSaveLead = (lead: any) => {
    createLeadMutation.mutate({
      companyName: lead.companyName,
      website: lead.website,
      industry: lead.industry,
      companySize: lead.companySize,
      location: lead.location,
      description: lead.description,
      contactName: lead.contactName,
      contactTitle: lead.contactTitle,
      contactEmail: lead.contactEmail,
      contactLinkedin: lead.contactLinkedin,
    });
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AI Lead Discovery</h1>
        <p className="text-muted-foreground text-lg">
          Use AI to discover and qualify potential leads for your business
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Criteria</CardTitle>
          <CardDescription>
            Describe your ideal customer or target market
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="query">Search Query</Label>
            <Input
              id="query"
              placeholder="e.g., SaaS companies in healthcare that need automation"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Industry</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size (Optional)</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger id="companySize">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Size</SelectItem>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="500+">500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleDiscover}
            disabled={discoverMutation.isPending}
            className="w-full"
            size="lg"
          >
            {discoverMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering Leads...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Discover Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {discoveredLeads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Discovered Leads ({discoveredLeads.length})</h2>
          <div className="grid grid-cols-1 gap-4">
            {discoveredLeads.map((lead, index) => (
              <Card key={index} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{lead.companyName}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.industry}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {lead.companySize}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.location}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveLead(lead)}
                      disabled={createLeadMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Save Lead
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{lead.description}</p>
                  
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
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Contact Person</h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{lead.contactName}</p>
                        <p className="text-muted-foreground">{lead.contactTitle}</p>
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
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
