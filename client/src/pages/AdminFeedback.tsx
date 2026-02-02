import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Bug, Lightbulb, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type FeedbackStatus = "submitted" | "in_review" | "planned" | "in_progress" | "completed" | "rejected";

export default function AdminFeedback() {
  const { user } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState<FeedbackStatus>("submitted");
  
  const { data: feedbackList, isLoading, refetch } = trpc.feedback.adminList.useQuery();
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Feedback updated successfully");
      setSelectedFeedback(null);
      setAdminResponse("");
      refetch();
      utils.feedback.unreadCount.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update feedback", {
        description: error.message,
      });
    },
  });

  const markAsReadMutation = trpc.feedback.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      utils.feedback.unreadCount.invalidate();
    },
  });

  const deleteMutation = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      toast.success("Feedback deleted");
      refetch();
      utils.feedback.unreadCount.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete feedback", {
        description: error.message,
      });
    },
  });

  const handleOpenFeedback = (feedback: any) => {
    setSelectedFeedback(feedback);
    setNewStatus(feedback.status);
    setAdminResponse(feedback.adminResponse || "");
    
    if (feedback.readByAdmin === 0) {
      markAsReadMutation.mutate({ feedbackId: feedback.id });
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedFeedback) return;
    
    updateStatusMutation.mutate({
      feedbackId: selectedFeedback.id,
      status: newStatus,
      adminResponse: adminResponse.trim() || undefined,
    });
  };

  const handleDelete = (feedbackId: number) => {
    if (confirm("Are you sure you want to delete this feedback?")) {
      deleteMutation.mutate({ feedbackId });
    }
  };

  const statusColors: Record<FeedbackStatus, string> = {
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    planned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const statusIcons: Record<FeedbackStatus, any> = {
    submitted: Clock,
    in_review: AlertCircle,
    planned: CheckCircle2,
    in_progress: Loader2,
    completed: CheckCircle2,
    rejected: AlertCircle,
  };

  const statusLabels: Record<FeedbackStatus, string> = {
    submitted: "Submitted",
    in_review: "In Review",
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    rejected: "Rejected",
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage bug reports and enhancement ideas from users
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !feedbackList || feedbackList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No feedback submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedbackList.map((feedback) => {
            const StatusIcon = statusIcons[feedback.status as FeedbackStatus];
            return (
              <Card
                key={feedback.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  feedback.readByAdmin === 0 ? "border-primary" : ""
                }`}
                onClick={() => handleOpenFeedback(feedback)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {feedback.type === "bug" ? (
                          <Bug className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
                        )}
                        <CardTitle className="text-lg truncate">{feedback.title}</CardTitle>
                        {feedback.readByAdmin === 0 && (
                          <Badge variant="default" className="shrink-0">New</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {feedback.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Submitted {new Date(feedback.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>User ID: {feedback.userId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={statusColors[feedback.status as FeedbackStatus]} variant="outline">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusLabels[feedback.status as FeedbackStatus]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(feedback.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedFeedback?.type === "bug" ? (
                <Bug className="h-5 w-5 text-red-500" />
              ) : (
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              )}
              <DialogTitle>{selectedFeedback?.title}</DialogTitle>
            </div>
            <DialogDescription>
              Submitted on {selectedFeedback && new Date(selectedFeedback.createdAt).toLocaleString()} by User ID: {selectedFeedback?.userId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedFeedback?.description}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Status</h4>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as FeedbackStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Admin Response (Optional)</h4>
              <Textarea
                placeholder="Add a response to the user..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedFeedback(null)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
