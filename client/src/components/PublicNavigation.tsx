import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Public Navigation Header Component
 * 
 * Reusable navigation header for public pages (Home, Pricing, Login, Signup, etc.)
 * Shows different navigation options based on authentication status
 */
export default function PublicNavigation() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Lead Discovery Agent</span>
          </div>
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/discover">
                <Button variant="ghost">Discover</Button>
              </Link>
              <Link href="/how-to">
                <Button variant="ghost">How It Works</Button>
              </Link>
              <Link href="/account">
                <Button variant="ghost">Account</Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
            </>
          ) : (
            <>
              <Link href="/how-to">
                <Button variant="ghost">How It Works</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started Free</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
