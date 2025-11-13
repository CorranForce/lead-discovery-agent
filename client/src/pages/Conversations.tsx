import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  follow_up_needed: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  won: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  lost: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function Conversations() {
  const [, setLocation] = useLocation();
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: conversations, isLoading } = trpc.conversations.list.useQuery();

  const createMutation = trpc.conversations.create.useMutation({
    onSuccess: (result) => {
      utils.conversations.list.invalidate();
      toast.success("Conversation created!");
      setNewConversationOpen(false);
      setNewTitle("");
      // Navigate to the conversation (we'll create this page next)
      // For now, just show success
    },
    onError: (error) => {
      toast.error(`Failed to create conversation: ${error.message}`);
    },
  });

  const updateMutation = trpc.conversations.update.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      toast.success("Conversation updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update conversation: ${error.message}`);
    },
  });

  const deleteMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      toast.success("Conversation deleted!");
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete conversation: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a conversation title");
      return;
    }
    createMutation.mutate({ title: newTitle });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({
      id,
      status: status as "active" | "closed" | "follow_up_needed" | "won" | "lost",
    });
  };

  const handleDeleteClick = (id: number) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      deleteMutation.mutate({ id: conversationToDelete });
    }
  };

  const filteredConversations = conversations?.filter(conv => 
    filterStatus === "all" || conv.status === filterStatus
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
          <h1 className="text-4xl font-bold tracking-tight">Sales Conversations</h1>
          <p className="text-muted-foreground text-lg">
            Manage your sales conversations with AI-powered assistance
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Create a new sales conversation to track your interactions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Conversation Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Follow-up with Acme Corp"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Conversation"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {filterStatus === "all" 
                ? "Start a new conversation to begin tracking your sales interactions"
                : `No conversations with status "${filterStatus}"`
              }
            </p>
            {filterStatus === "all" && (
              <Button onClick={() => setNewConversationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start First Conversation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{conversation.title}</CardTitle>
                      <Badge className={statusColors[conversation.status]} variant="outline">
                        {conversation.status.replace(/_/g, " ")}
                      </Badge>
                      {conversation.sentiment && (
                        <Badge variant="secondary">
                          {conversation.sentiment}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      Last updated: {new Date(conversation.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={conversation.status}
                      onValueChange={(value) => handleStatusChange(conversation.id, value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/conversation/${conversation.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(conversation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(conversation.summary || conversation.notes) && (
                <CardContent className="space-y-2">
                  {conversation.summary && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Summary</h4>
                      <p className="text-sm text-muted-foreground">{conversation.summary}</p>
                    </div>
                  )}
                  {conversation.notes && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground">{conversation.notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation
              and all its messages.
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
