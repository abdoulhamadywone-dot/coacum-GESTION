import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon, color = "primary", href }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  const inner = (
    <>
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {href && (
          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
    </>
  );

  if (href) {
    return (
      <Link to={href} className="group bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 block">
        {inner}
      </Link>
    );
  }
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      {inner}
    </div>
  );
}