import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Wallet, Receipt, Calendar, LogOut, Menu, X, ShieldCheck, Newspaper, Sun, Moon, Bell } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import useDarkMode from "../hooks/useDarkMode";

const navItems = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/membres", label: "Membres", icon: Users },
  { path: "/cotisations", label: "Cotisations", icon: Wallet },
  { path: "/depenses", label: "Dépenses", icon: Receipt },
  { path: "/evenements", label: "Événements", icon: Calendar },
  { path: "/articles", label: "Actualités", icon: Newspaper },
];

function getDateFr() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dark, setDark] = useDarkMode();

  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });

  // Compute late members (active members with no payment in last 3 months of data)
  const moisNums = { JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,AOÛT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12 };
  const recentCols = [...new Set(cotisations.map(c => `${(c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}|${c.annee}`))].sort((a,b)=>{
    const [ma,ya]=a.split('|'), [mb,yb]=b.split('|');
    return (parseInt(yb)*100+(moisNums[mb]||0))-(parseInt(ya)*100+(moisNums[ma]||0));
  }).slice(0,3);
  const paidInRecent = new Set(cotisations.filter(c => recentCols.includes(`${(c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}|${c.annee}`)).map(c=>c.membre_nom));
  const lateCount = membres.filter(m => m.statut === 'actif' && !paidInRecent.has(m.nom)).length;

  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-2xl flex-shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-lg amber-glow">C</div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none gradient-text">COACUM</h1>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">Cultures Urbaines</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md amber-glow"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/articles-admin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === '/articles-admin'
                  ? 'bg-primary text-primary-foreground shadow-md amber-glow'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}>
              <ShieldCheck className="h-4 w-4" />
              Admin Articles
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          {/* Date */}
          <div className="px-4 py-2 text-[10px] text-sidebar-foreground/40 capitalize">{getDateFr()}</div>
          {user && (
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-sidebar-foreground/90 truncate">{user.full_name}</p>
              <p className="text-xs text-sidebar-foreground/45 truncate">{user.email}</p>
            </div>
          )}
          <div className="flex items-center gap-2 px-2">
            <button onClick={() => setDark(!dark)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 transition-all">
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {dark ? "Clair" : "Sombre"}
            </button>
            <button onClick={() => base44.auth.logout()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-300 hover:text-red-100 hover:bg-red-500/20 transition-all">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm no-print">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="font-bold gradient-text">COACUM</span>
          </div>
          <div className="flex items-center gap-2">
            {lateCount > 0 && (
              <div className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">{lateCount}</span>
              </div>
            )}
            <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border p-3 space-y-1 no-print">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/articles-admin" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${location.pathname === '/articles-admin' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                <ShieldCheck className="h-4 w-4" />Admin Articles
              </Link>
            )}
            <button onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full">
              <LogOut className="h-4 w-4" />Déconnexion
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