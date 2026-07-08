import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const STATUT_COLORS = {
  planifié: "bg-blue-500",
  en_cours: "bg-amber-500",
  terminé: "bg-emerald-500",
  annulé: "bg-red-500",
};

export default function EventCalendar({ events = [], onEventClick }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  // Build calendar grid (Mon=0 .. Sun=6)
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  // Leading blanks
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!e.date_debut) return;
      const dateStr = e.date_debut.split("T")[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(e);
    });
    return map;
  }, [events]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const isCurrentMonth = monthOffset === 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">
          {MOIS_FR[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => o - 1)}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)}
              className="px-2 h-8 rounded-lg hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors">
              Aujourd'hui
            </button>
          )}
          <button onClick={() => setMonthOffset(o => o + 1)}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {JOURS_FR.map(j => (
          <div key={j} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">{j}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = isCurrentMonth && day === today.getDate();

          return (
            <div key={i}
              className={`aspect-square rounded-lg p-1 border transition-colors flex flex-col ${
                isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
              }`}>
              <span className={`text-[11px] font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {day}
              </span>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map(e => (
                  <button key={e.id}
                    onClick={() => onEventClick?.(e)}
                    className="text-left">
                    <span className={`block w-1.5 h-1.5 rounded-full ${STATUT_COLORS[e.statut] || 'bg-gray-400'} flex-shrink-0`} />
                    <span className="block text-[8px] sm:text-[9px] text-foreground truncate leading-tight">{e.titre}</span>
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-muted-foreground font-medium">+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
        {Object.entries(STATUT_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${v}`} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}