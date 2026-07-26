import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Images, FileText, Users, Grid3x3, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { membreAuth } from "@/lib/membreAuth";

const AVATAR_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
];

function getInitials(nom = "") {
  return nom.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(nom = "") {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Reseau() {
  const [filter, setFilter] = useState("tout");
  const [view, setView] = useState("feed");

  const { data: publications = [], isLoading: pubsLoading } = useQuery({
    queryKey: ["publications"],
    queryFn: () => base44.entities.Publication.list("-created_date", 200),
  });

  const { data: profils = [], isLoading: profilsLoading } = useQuery({
    queryKey: ["membre-profils"],
    queryFn: async () => {
      const res = await base44.functions.invoke("membrePortal", { action: "get_profils" });
      return res.data?.profils || [];
    },
  });

  const filteredPubs = useMemo(() => {
    if (filter === "photos") return publications.filter((p) => p.image_url);
    if (filter === "textes") return publications.filter((p) => !p.image_url);
    return publications;
  }, [publications, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold gradient-text">Réseau COACUM</h1>
          <p className="text-sm text-muted-foreground">Découvrez les œuvres et profils des membres</p>
        </div>
        {!membreAuth.isLoggedIn() && (
          <Link to="/membre-login" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <LogIn className="h-4 w-4" /> Espace Membre
          </Link>
        )}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("feed")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "feed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Publications
          </button>
          <button
            onClick={() => setView("membres")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "membres" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Membres
          </button>
        </div>
      </div>

      {view === "feed" ? (
        <>
          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: "tout", label: "Tout", icon: Grid3x3 },
              { key: "photos", label: "Photos", icon: Images },
              { key: "textes", label: "Textes", icon: FileText },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </button>
            ))}
          </div>

          {/* Feed */}
          {pubsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredPubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Aucune publication</p>
              <p className="text-sm mt-1">Les membres n'ont pas encore publié d'œuvres.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredPubs.map((pub) => {
                const color = getAvatarColor(pub.membre_nom || "");
                return (
                  <div key={pub.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {pub.image_url && (
                      <img src={pub.image_url} alt={pub.titre || "Publication"} className="w-full max-h-72 object-cover" loading="lazy" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {pub.membre_photo ? (
                          <img src={pub.membre_photo} alt={pub.membre_nom} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold`}>
                            {getInitials(pub.membre_nom || "?")}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground">{pub.membre_nom}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(pub.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      {pub.titre && <h3 className="font-semibold text-sm mb-1">{pub.titre}</h3>}
                      {pub.contenu && <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{pub.contenu}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Members grid */
        <>
          {profilsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : profils.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Aucun membre</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {profils.map((m) => {
                const color = getAvatarColor(m.nom || "");
                return (
                  <div key={m.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-center">
                    <div className="h-16 bg-gradient-to-br from-amber-400/20 to-orange-500/10 relative">
                      {m.photo_couverture && <img src={m.photo_couverture} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="px-3 pb-4 -mt-8">
                      {m.photo_profil ? (
                        <img src={m.photo_profil} alt={m.nom} className="w-14 h-14 rounded-full object-cover border-4 border-card mx-auto" />
                      ) : (
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-base font-bold border-4 border-card mx-auto`}>
                          {getInitials(m.nom || "?")}
                        </div>
                      )}
                      <h3 className="font-semibold text-sm mt-2 text-foreground truncate">{m.nom}</h3>
                      {m.statut_perso && <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{m.statut_perso}</p>}
                      {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}