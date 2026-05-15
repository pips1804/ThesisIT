import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  BookOpen,
  FileSearch,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useManuscript } from "@/hooks/useManuscript";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const featureLinks = [
  { label: "Analysis", path: "analysis", icon: FileSearch },
  { label: "Chat", path: "chat", icon: MessageSquare },
  { label: "Mock Defense", path: "mock-defense", icon: Scale },
  { label: "Panelist Recs", path: "recommendations", icon: Sparkles },
] as const;

function NavLink({
  to,
  active,
  onClick,
  children,
  icon: Icon,
}: {
  to: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { manuscriptId } = useParams();
  const { manuscript } = useManuscript(manuscriptId);

  return (
    <nav className="flex flex-col gap-1 p-4">
      <NavLink
        to="/dashboard"
        active={location.pathname === "/dashboard"}
        onClick={onNavigate}
        icon={LayoutDashboard}
      >
        Dashboard
      </NavLink>

      {manuscriptId && (
        <>
          <p className="mt-4 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {manuscript?.title ?? "Manuscript"}
          </p>
          {featureLinks.map((link) => {
            const href = `/${link.path}/${manuscriptId}`;
            return (
              <NavLink
                key={link.path}
                to={href}
                active={location.pathname.startsWith(`/${link.path}/`)}
                onClick={onNavigate}
                icon={link.icon}
              >
                {link.label}
              </NavLink>
            );
          })}
        </>
      )}
    </nav>
  );
}

export function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Student";

  return (
    <div className="flex min-h-svh bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-5">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">DefenseReady</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="font-semibold">DefenseReady</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {title && (
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline md:max-w-[220px]">
              {displayName}
            </span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
