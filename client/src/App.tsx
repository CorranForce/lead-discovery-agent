import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Conversations from "./pages/Conversations";
import ConversationDetail from "./pages/ConversationDetail";
import Account from "./pages/Account";
import Sequences from "./pages/Sequences";
import Analytics from "./pages/Analytics";
import EmailEngagement from "./pages/EmailEngagement";
import Reengagement from "./pages/Reengagement";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/discover"} component={Discover} />
      <Route path={"/leads"} component={Leads} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path={"/conversations"} component={Conversations} />
      <Route path="/conversation/:id" component={ConversationDetail} />
      <Route path={"/sequences"} component={Sequences} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/email-engagement"} component={EmailEngagement} />
      <Route path={"/reengagement"} component={Reengagement} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/account"} component={Account} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
