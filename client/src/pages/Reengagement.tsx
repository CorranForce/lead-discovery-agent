import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Play, Pause, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";

export default function Reengagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    inactivityDays: 30,
    sequenceId: undefined as number | undefined,
  });

  const utils = trpc.useUtils();
  const { data: workflows, isLoading } = trpc.reengagement.list.useQuery();
  const { data: sequences } = trpc.sequences.list.useQuery();

  const createMutation = trpc.reengagement.create.useMutation({
    onSuccess: () => {
      toast.success("Workflow created successfully");
      setIsCreateDialogOpen(false);
      setNewWorkflow({ name: "", description: "", inactivityDays: 30, sequenceId: undefined });
      utils.reengagement.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });

  const updateMutation = trpc.reengagement.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow updated successfully");
      utils.reengagement.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });

  const deleteMutation = trpc.reengagement.delete.useMutation({
    onSuccess: () => {
      toast.success("Workflow deleted successfully");
      utils.reengagement.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });

  const executeMutation = trpc.reengagement.execute.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Workflow executed: ${result.leadsEnrolled} leads enrolled`);
        utils.reengagement.list.invalidate();
      } else {
        toast.error(`Workflow execution failed: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to execute workflow: ${error.message}`);
    },
  });

  const handleCreateWorkflow = () => {
    if (!newWorkflow.name.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    createMutation.mutate(newWorkflow);
  };

  const handleToggleActive = (workflowId: number, currentStatus: number) => {
    updateMutation.mutate({
      id: workflowId,
      isActive: currentStatus === 1 ? 0 : 1,
    });
  };

  const handleDeleteWorkflow = (workflowId: number) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      deleteMutation.mutate({ id: workflowId });
    }
  };

  const handleExecuteWorkflow = (workflowId: number) => {
    if (confirm("This will detect and enroll inactive leads. Continue?")) {
      executeMutation.mutate({ workflowId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Re-engagement Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Automatically detect and re-engage inactive leads with targeted sequences
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Re-engagement Workflow</DialogTitle>
              <DialogDescription>
                Set up an automated workflow to detect and re-engage inactive leads
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., 30-Day Inactive Re-engagement"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this workflow..."
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inactivityDays">Inactivity Threshold (Days)</Label>
                <Input
                  id="inactivityDays"
                  type="number"
                  min="1"
                  value={newWorkflow.inactivityDays}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, inactivityDays: parseInt(e.target.value) || 30 })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Leads with no opens or clicks in this many days will be considered inactive
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sequence">Re-engagement Sequence</Label>
                <Select
                  value={newWorkflow.sequenceId?.toString()}
                  onValueChange={(value) =>
                    setNewWorkflow({ ...newWorkflow, sequenceId: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sequence" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences?.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id.toString()}>
                        {seq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Inactive leads will be automatically enrolled in this sequence
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkflow} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!workflows || workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first re-engagement workflow to automatically detect and revive inactive leads
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{workflow.name}</CardTitle>
                      <Badge variant={workflow.isActive === 1 ? "default" : "secondary"}>
                        {workflow.isActive === 1 ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    {workflow.description && (
                      <CardDescription className="mt-2">{workflow.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(workflow.id, workflow.isActive)}
                      disabled={updateMutation.isPending}
                    >
                      {workflow.isActive === 1 ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      disabled={executeMutation.isPending || workflow.isActive === 0}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Inactivity Threshold</p>
                    <p className="font-semibold">{workflow.inactivityDays} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sequence</p>
                    <p className="font-semibold">
                      {sequences?.find((s) => s.id === workflow.sequenceId)?.name || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Run</p>
                    <p className="font-semibold">
                      {workflow.lastRunAt
                        ? new Date(workflow.lastRunAt).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
