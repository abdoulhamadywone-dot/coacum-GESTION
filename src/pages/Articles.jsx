import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, User } from "lucide-react";

export default function Articles() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles-publies"],
    queryFn: () => base44.entities.Article.filter({ statut: "publié" }, "-date_publication"),
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Actualités</h1>
        <p className="text-muted-foreground mt-1">Les dernières nouvelles de COACUM</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xl font-medium">Aucun article publié</p>
          <p className="text-sm mt-2">Revenez bientôt pour les actualités</p>
        </div>
      ) : (
        <div className="space-y-8">
          {articles.map((a, idx) => (
            <article key={a.id} className={`bg-card rounded-2xl border border-border overflow-hidden ${idx === 0 ? 'shadow-md' : ''}`}>
              {a.image_url && (
                <img src={a.image_url} alt={a.titre} className="w-full h-56 object-cover" />
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                  {a.date_publication && (
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{a.date_publication}</span>
                  )}
                  {a.auteur && (
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{a.auteur}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground mb-3">{a.titre}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{a.contenu}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}