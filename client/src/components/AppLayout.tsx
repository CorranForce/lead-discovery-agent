import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import Navigation from "./Navigation";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Navigation 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      <div className="flex">
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
