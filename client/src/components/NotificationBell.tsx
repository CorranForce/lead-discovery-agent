import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const { data: unreadCount } = trpc.feedback.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const hasUnread = (unreadCount || 0) > 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative"
      onClick={() => setLocation("/admin/feedback")}
    >
      <Bell className="h-4 w-4" />
      {hasUnread && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
        >
          {unreadCount! > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
