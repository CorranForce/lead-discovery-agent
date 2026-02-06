import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SequenceEdit() {
  const [, params] = useRoute("/sequence/:id");
  const [, setLocation] = useLocation();
  const sequenceId = params?.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"manual" | "status_change" | "time_based">("manual");

  const { data: sequence, isLoading } = trpc.sequences.getById.useQuery(
    { sequenceId: sequenceId! },
    { enabled: !!sequenceId }
  );

  const utils = trpc.useUtils();

  const updateMutation = trpc.sequences.update.useMutation({
    onSuccess: () => {
      utils.sequences.list.invalidate();
      utils.sequences.getById.invalidate({ sequenceId: sequenceId! });
      toast.success("Sequence updated successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to update sequence: ${error.message}`);
    },
  });

  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || "");
      setTriggerType(sequence.triggerType as any);
    }
  }, [sequence]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a sequence name");
      return;
    }

    if (!sequenceId) return;

    updateMutation.mutate({
      sequenceId,
      name,
      description,
      triggerType,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Sequence not found</h3>
            <p className="text-muted-foreground mb-6">
              The sequence you're looking for doesn't exist.
            </p>
            <Button onClick={() => setLocation("/sequences")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sequences
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/sequences")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Edit Sequence</h1>
            <p className="text-muted-foreground text-lg">
              Configure your email sequence settings
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the name and description of your sequence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Steps</CardTitle>
                  <CardDescription>
                    Add and configure the emails in this sequence
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>No email steps configured yet.</p>
                <p className="text-sm mt-2">Click "Add Step" to create your first email.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium">
                  {sequence.isActive ? "Active" : "Paused"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leads Enrolled</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Steps</span>
                <span className="text-sm font-medium">0</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for this sequence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Sequence
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
