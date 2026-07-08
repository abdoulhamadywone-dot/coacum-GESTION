import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Newspaper, Calendar, MessageSquare, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotificationsBell() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: allNotifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.Notification.list("-created_date", 30),
  });

  useEffect(() => {
    const unsub = base44.entities.Notification.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return unsub;
  }, []);

  const notifications = allNotifs.filter(n =>
    n.target_role === "all" || (n.target_role === "admin" && isAdmin)
  );
  const unread = notifications.filter(n => !n.read_by_ids?.includes(user?.id));

  const markAllRead = async () => {
    const updates = unread.map(n => ({
      id: n.id,
      read_by_ids: [...(n.read_by_ids || []), user.id],
    }));
    if (updates.length > 0) {
      await base44.entities.Notification.bulkUpdate(updates);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  const markOneRead = async (notif) => {
    if (notif.read_by_ids?.includes(user?.id)) return;
    await base44.entities.Notification.update(notif.id, {
      read_by_ids: [...(notif.read_by_ids || []), user.id],
    });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const iconMap = {
    article: { icon: Newspaper, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/20" },
    evenement: { icon: Calendar, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/20" },
    message: { icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/20" },
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 sm:p-2 rounded-xl hover:bg-muted/50 text-foreground/60 hover:text-foreground transition-all"
      >
        <Bell className="h-5 w-5 sm:h-4 sm:w-4" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-10 right-0 sm:top-auto sm:bottom-12 sm:left-0 sm:right-auto w-72 bg-card border border-border rounded-2xl shadow-xl z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="p-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <h4 className="font-bold text-xs text-foreground">Notifications</h4>
                {unread.length > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <CheckCheck className="h-3 w-3" /> Tout lire
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Aucune notification</p>
                ) : (
                  notifications.slice(0, 15).map(n => {
                    const cfg = iconMap[n.type] || iconMap.article;
                    const isUnread = !n.read_by_ids?.includes(user?.id);
                    const Icon = cfg.icon;
                    const content = (
                      <div className={`flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors ${isUnread ? "bg-primary/5" : ""}`}>
                        <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.titre}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{n.contenu}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{formatTime(n.created_date)}</p>
                        </div>
                        {isUnread && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                    );
                    return n.link ? (
                      <Link key={n.id} to={n.link} onClick={() => { markOneRead(n); setOpen(false); }}>{content}</Link>
                    ) : (
                      <div key={n.id} onClick={() => markOneRead(n)} className="cursor-pointer">{content}</div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}