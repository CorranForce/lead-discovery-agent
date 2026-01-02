import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, ArrowLeft, User, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Streamdown } from "streamdown";

export default function ConversationDetail() {
  const [, params] = useRoute("/conversation/:id");
  const conversationId = params?.id ? parseInt(params.id) : 0;
  
  const [messageContent, setMessageContent] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: conversation, isLoading: loadingConversation } = trpc.conversations.get.useQuery(
    { id: conversationId },
    { enabled: conversationId > 0 }
  );
  
  const { data: messages, isLoading: loadingMessages } = trpc.messages.list.useQuery(
    { conversationId },
    { enabled: conversationId > 0 }
  );

  const createMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate({ conversationId });
      setMessageContent("");
      toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const getAISuggestionMutation = trpc.messages.getAISuggestion.useMutation({
    onSuccess: (data) => {
      setAiSuggestion(data.suggestion);
      setLoadingSuggestion(false);
      toast.success("AI suggestion generated!");
    },
    onError: (error) => {
      toast.error(`Failed to get AI suggestion: ${error.message}`);
      setLoadingSuggestion(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (role: "user" | "lead") => {
    if (!messageContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    createMessageMutation.mutate({
      conversationId,
      role,
      content: messageContent,
    });
  };

  const handleGetAISuggestion = () => {
    setLoadingSuggestion(true);
    getAISuggestionMutation.mutate({
      conversationId,
      context: messageContent || undefined,
    });
  };

  const handleUseSuggestion = () => {
    setMessageContent(aiSuggestion);
    setAiSuggestion("");
  };

  if (loadingConversation || loadingMessages) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Conversation not found</h3>
            <Link href="/conversations">
              <Button variant="outline">Back to Conversations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{conversation.title}</h1>
          <p className="text-muted-foreground">
            Status: {conversation.status.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main conversation area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role !== "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "ai_suggestion"
                          ? "bg-accent/50 text-accent-foreground border border-accent"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1 opacity-70">
                        {message.role === "user" ? "You" : message.role === "lead" ? "Lead" : "AI Suggestion"}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-50 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-4 space-y-3">
              <Textarea
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage("user");
                  }
                }}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSendMessage("user")}
                  disabled={createMessageMutation.isPending}
                  className="flex-1"
                >
                  {createMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send as You
                </Button>
                <Button
                  onClick={() => handleSendMessage("lead")}
                  disabled={createMessageMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {createMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCircle className="h-4 w-4 mr-2" />
                  )}
                  Send as Lead
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Assistant sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get AI-powered suggestions for your next response based on the conversation context.
              </p>
              <Button
                onClick={handleGetAISuggestion}
                disabled={loadingSuggestion}
                className="w-full"
              >
                {loadingSuggestion ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get AI Suggestion
                  </>
                )}
              </Button>

              {aiSuggestion && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                    <h4 className="font-semibold text-sm mb-2">AI Suggestion:</h4>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{aiSuggestion}</Streamdown>
                    </div>
                  </div>
                  <Button
                    onClick={handleUseSuggestion}
                    variant="outline"
                    className="w-full"
                  >
                    Use This Suggestion
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {conversation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{conversation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
