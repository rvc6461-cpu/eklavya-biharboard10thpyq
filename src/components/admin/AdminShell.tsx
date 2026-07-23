import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, Layers, ListChecks, ClipboardList,
  FileText, Bell, BarChart3, Menu, X, LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/chapters", label: "Chapters", icon: Layers },
  { to: "/admin/questions", label: "Questions", icon: ListChecks },
  { to: "/admin/mock-tests", label: "Mock Tests", icon: ClipboardList },
  { to: "/admin/notes", label: "Notes", icon: FileText },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed hidden md:flex md:flex-col md:w-64 md:inset-y-0 border-r border-border bg-card/50 backdrop-blur">
        <SidebarBody pathname={pathname} onNav={() => {}} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2"><Menu className="h-5 w-5" /></button>
        <p className="font-display font-bold">Admin · Eklavya</p>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-card border-r border-border flex flex-col">
            <div className="flex justify-end p-3">
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <SidebarBody pathname={pathname} onNav={() => setOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}

      <main className="md:pl-64">
        <header className="hidden md:flex items-center justify-between border-b border-border bg-card/40 px-8 h-16">
          <h1 className="font-display text-xl font-bold">{title}</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to app</Link>
        </header>
        <div className="md:hidden px-5 pt-4">
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function SidebarBody({ pathname, onNav }: { pathname: string; onNav: () => void }) {
  return (
    <>
      <div className="hidden md:flex items-center gap-2 h-16 px-6 border-b border-border">
        <div className="bg-gradient-primary shadow-glow h-9 w-9 rounded-xl flex items-center justify-center font-display font-bold text-primary-foreground">E</div>
        <div>
          <p className="font-display font-bold text-sm leading-tight">Eklavya</p>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Admin</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNav}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}
