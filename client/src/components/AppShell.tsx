import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Wordmark } from "./Logo";
import { LayoutDashboard, FileScan, History, CreditCard, LogOut, Moon, Sun, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, testId: "link-nav-dashboard" },
  { href: "/scan/new", label: "New scan", icon: FileScan, testId: "link-nav-new-scan" },
  { href: "/scans", label: "Scan history", icon: History, testId: "link-nav-history" },
  { href: "/billing", label: "Billing", icon: CreditCard, testId: "link-nav-billing" },
  { href: "/docs", label: "Rules & docs", icon: BookOpen, testId: "link-nav-docs" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Link href="/app" data-testid="link-sidebar-home">
            <Wordmark size={24} />
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const active = location === item.href || (item.href === "/app" && location === "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover-elevate ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
            {user?.email}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 justify-start gap-2"
              onClick={toggle}
              data-testid="button-toggle-theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => logout()}
              data-testid="button-logout"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-2.5">
        <Link href="/app">
          <Wordmark size={22} />
        </Link>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={toggle} data-testid="button-toggle-theme-mobile" className="h-8 w-8 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="h-8 w-8 p-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-12">
        {/* Mobile nav row */}
        <div className="md:hidden flex overflow-x-auto gap-1 border-b border-border px-3 py-2 bg-background">
          {navItems.map((item) => {
            const active = location === item.href || (item.href === "/app" && location === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs ${
                  active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="px-5 md:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
