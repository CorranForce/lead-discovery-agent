import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "promotion";
  isActive: number;
  startDate: Date | null;
  endDate: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss?: () => void;
}

export default function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user has dismissed this announcement
    const dismissedAnnouncements = JSON.parse(
      localStorage.getItem("dismissedAnnouncements") || "[]"
    );
    if (dismissedAnnouncements.includes(announcement.id)) {
      setIsVisible(false);
    }
  }, [announcement.id]);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Save dismissal to localStorage
    const dismissedAnnouncements = JSON.parse(
      localStorage.getItem("dismissedAnnouncements") || "[]"
    );
    dismissedAnnouncements.push(announcement.id);
    localStorage.setItem("dismissedAnnouncements", JSON.stringify(dismissedAnnouncements));
    
    onDismiss?.();
  };

  if (!isVisible) return null;

  const typeConfig = {
    info: {
      icon: Info,
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/50",
      textColor: "text-blue-700 dark:text-blue-300",
      iconColor: "text-blue-500",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/50",
      textColor: "text-yellow-700 dark:text-yellow-300",
      iconColor: "text-yellow-500",
    },
    success: {
      icon: CheckCircle2,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/50",
      textColor: "text-green-700 dark:text-green-300",
      iconColor: "text-green-500",
    },
    promotion: {
      icon: Sparkles,
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/50",
      textColor: "text-purple-700 dark:text-purple-300",
      iconColor: "text-purple-500",
    },
  };

  const config = typeConfig[announcement.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative border-b transition-all duration-300 ease-in-out",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5 flex-shrink-0", config.iconColor)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", config.textColor)}>
              {announcement.title}
            </p>
            <p className={cn("text-sm", config.textColor, "opacity-90")}>
              {announcement.message}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
              config.textColor
            )}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
