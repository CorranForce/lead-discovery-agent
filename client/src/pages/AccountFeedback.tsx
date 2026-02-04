import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquarePlus, Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/FeedbackDialog";

export default function AccountFeedback() {
  const { data: feedback, isLoading } = trpc.feedback.list.useQuery();

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "in-review": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    planned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "in-progress": "bg-orange-500/10 text-orange-500 border-orange-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const statusLabels: Record<string, string> = {
    submitted: "Submitted",
    "in-review": "In Review",
    planned: "Planned",
    "in-progress": "In Progress",
    completed: "Completed",
    rejected: "Rejected",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Feedback</h1>
          <p className="text-muted-foreground mt-2">
            Track your bug reports and enhancement ideas
          </p>
        </div>
        <FeedbackDialog trigger={
          <Button>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        } />
      </div>

      {!feedback || feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquarePlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No feedback submitted yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Help us improve by submitting bug reports or enhancement ideas
            </p>
            <FeedbackDialog trigger={
              <Button>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Submit Your First Feedback
              </Button>
            } />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.type === "bug" ? (
                      <Bug className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Submitted on {new Date(item.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusColors[item.status] || statusColors.submitted}
                  >
                    {statusLabels[item.status] || item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
                
                {item.adminResponse && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                      Admin Response
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {item.adminResponse}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
