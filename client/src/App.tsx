import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NewScan from "@/pages/NewScan";
import ScanResults from "@/pages/ScanResults";
import Scans from "@/pages/Scans";
import Billing from "@/pages/Billing";
import Docs from "@/pages/Docs";
import CheckoutReturn from "@/pages/CheckoutReturn";
import NotFound from "@/pages/not-found";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/signup">{() => <Auth mode="signup" />}</Route>
      <Route path="/login">{() => <Auth mode="login" />}</Route>
      <Route path="/checkout/success">{() => <CheckoutReturn status="success" />}</Route>
      <Route path="/checkout/cancelled">{() => <CheckoutReturn status="cancelled" />}</Route>

      <Route path="/app">{() => <Protected><Dashboard /></Protected>}</Route>
      <Route path="/scan/new">{() => <Protected><NewScan /></Protected>}</Route>
      <Route path="/scans">{() => <Protected><Scans /></Protected>}</Route>
      <Route path="/scans/:id">{() => <Protected><ScanResults /></Protected>}</Route>
      <Route path="/billing">{() => <Protected><Billing /></Protected>}</Route>
      <Route path="/docs">{() => <Protected><Docs /></Protected>}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
