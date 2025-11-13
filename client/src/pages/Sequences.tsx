import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Mail, Play, Pause, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Sequences() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"manual" | "status_change" | "time_based">("manual");

  const { data: sequences, isLoading } = trpc.sequences.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.sequences.create.useMutation({
    onSuccess: () => {
      utils.sequences.list.invalidate();
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setTriggerType("manual");
      toast.success("Sequence created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create sequence: ${error.message}`);
    },
  });

  const toggleActiveMutation = trpc.sequences.toggleActive.useMutation({
    onSuccess: () => {
      utils.sequences.list.invalidate();
      toast.success("Sequence status updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update sequence: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a sequence name");
      return;
    }

    createMutation.mutate({
      name,
      description,
      triggerType,
    });
  };

  const handleToggleActive = (sequenceId: number, currentlyActive: boolean) => {
    toggleActiveMutation.mutate({
      sequenceId,
      isActive: !currentlyActive,
    });
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
      <Navigation />
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Email Sequences</h1>
          <p className="text-muted-foreground text-lg">
            Automate your email outreach with multi-step sequences
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Sequence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email Sequence</DialogTitle>
              <DialogDescription>
                Set up a new automated email sequence for your leads
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sequence Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome Series"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this sequence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger Type</Label>
                <Select value={triggerType} onValueChange={(value: any) => setTriggerType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual - Enroll leads manually</SelectItem>
                    <SelectItem value="status_change">Status Change - Trigger on lead status</SelectItem>
                    <SelectItem value="time_based">Time Based - Trigger after specific time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Sequence"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sequences && sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No sequences yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first email sequence to automate your outreach and save time on follow-ups
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sequences?.map((sequence) => (
            <Card key={sequence.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {sequence.name}
                      <Badge variant={sequence.isActive ? "default" : "secondary"}>
                        {sequence.isActive ? "Active" : "Paused"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {sequence.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trigger:</span>
                  <Badge variant="outline" className="capitalize">
                    {(sequence.triggerType || "manual").replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(sequence.id, sequence.isActive === 1)}
                  >
                    {sequence.isActive ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Link href={`/sequence/${sequence.id}`}>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span>0 leads enrolled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
