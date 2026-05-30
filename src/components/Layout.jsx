import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Wallet, Receipt, Calendar, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/membres", label: "Membres", icon: Users },
  { path: "/cotisations", label: "Cotisations", icon: Wallet },
  { path: "/depenses", label: "Dépenses", icon: Receipt },
  { path: "/evenements", label: "Événements", icon: Calendar },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-background font-inter">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm">C</div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">COACUM</h1>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">Cultures Urbaines</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-primary text-white shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/administration"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/administration'
                  ? 'bg-sidebar-primary text-white shadow-sm'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Administration
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {user && (
            <div className="px-4 py-2.5 mb-1">
              <p className="text-xs font-semibold text-sidebar-foreground/90 truncate">{user.full_name}</p>
              <p className="text-xs text-sidebar-foreground/45 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:text-red-100 hover:bg-red-500/20 w-full transition-all"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-foreground">COACUM</h1>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/administration"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/administration'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Administration
              </Link>
            )}
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-all"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}