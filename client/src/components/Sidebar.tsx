import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Search,
  Users,
  MessageSquare,
  Mail,
  TrendingUp,
  RefreshCcw,
  Shield,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/conversations", label: "Conversations", icon: MessageSquare },
    { href: "/sequences", label: "Sequences", icon: Mail },
    { href: "/email-engagement", label: "Email Engagement", icon: TrendingUp },
    { href: "/reengagement", label: "Re-engagement", icon: RefreshCcw },
    { href: "/admin", label: "Admin", icon: Shield },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 transition-transform duration-300 ease-in-out",
        "md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 md:hidden border-b">
          <span className="font-semibold">Menu</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-secondary"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
