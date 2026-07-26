import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Images, User, Users, LogOut, Sun, Moon } from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";
import { membreAuth } from "@/lib/membreAuth";

export default function MembreLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const membre = membreAuth.getMembre();

  const navItems = [
    { path: "/mon-profil", label: "Mon Profil", icon: User },
    { path: "/reseau", label: "Réseau", icon: Users },
    { path: "/galerie-membre", label: "Galerie", icon: Images },
  ];

  const handleLogout = () => {
    membreAuth.logout();
    navigate("/membre-login");
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/reseau" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="font-bold gradient-text text-sm">COACUM</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />{item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {membre && (
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center justify-around px-2 py-1 border-t border-border">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}