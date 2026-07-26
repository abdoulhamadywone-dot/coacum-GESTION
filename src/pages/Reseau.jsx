import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Images, FileText, Grid3x3, LogIn, Search, Bookmark, Heart, MessageCircle, Share2, Users, Sparkles, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { membreAuth } from "@/lib/membreAuth";
import MembreProfilDialog from "@/components/MembreProfilDialog";

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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `il y a ${days} j`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `il y a ${hours} h`;
  const mins = Math.floor(diff / 60000);
  if (mins >= 1) return `il y a ${mins} min`;
  return "à l'instant";
}

const FILTERS = [
  { key: "tout", label: "Tout", icon: Grid3x3 },
  { key: "photos", label: "Photos", icon: Images },
  { key: "textes", label: "Textes", icon: FileText },
];

export default function Reseau() {
  const [filter, setFilter] = useState("tout");
  const [view, setView] = useState("feed");
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [search, setSearch] = useState("");

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
    let result = publications;
    if (filter === "photos") result = result.filter((p) => p.image_url);
    else if (filter === "textes") result = result.filter((p) => !p.image_url);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => (p.titre || "").toLowerCase().includes(q) || (p.contenu || "").toLowerCase().includes(q) || (p.membre_nom || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [publications, filter, search]);

  // Scène du jour = membre le plus actif (dernière publication)
  const sceneDuJour = useMemo(() => {
    if (publications.length === 0) return profils[0] || null;
    const lastPub = publications[0];
    return profils.find((p) => p.id === lastPub.membre_id) || profils[0] || null;
  }, [publications, profils]);

  // Scène active = membre avec le plus de publications
  const sceneActive = useMemo(() => {
    if (publications.length === 0 || profils.length === 0) return null;
    const counts = {};
    publications.forEach((p) => {
      if (p.membre_id) counts[p.membre_id] = (counts[p.membre_id] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topId = sorted[0]?.[0];
    return profils.find((p) => p.id === topId) || null;
  }, [publications, profils]);

  const recentMembers = useMemo(() => profils.slice(0, 5), [profils]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </span>
            <span className="text-xs text-muted-foreground">· {publications.length} pub.</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Réseau</h1>
          <p className="text-sm text-muted-foreground">Fil, publications et interactions entre les membres.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("feed")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "feed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Fil
          </button>
          <button
            onClick={() => setView("membres")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "membres" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Membres
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main column */}
        <div className="space-y-5">
          {view === "feed" ? (
            <>
              {/* Prompt card */}
              {!membreAuth.isLoggedIn() ? (
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Link to="/membre-login" className="text-primary font-semibold hover:underline">Connectez-vous</Link> pour publier et commenter sur le réseau.
                  </p>
                </div>
              ) : (
                <Link to="/mon-profil" className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">Partagez une œuvre, une pensée, une création...</span>
                  <span className="text-sm font-medium text-primary">Publier</span>
                </Link>
              )}

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher des hashtags, du texte..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1.5 flex-wrap">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filter === f.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <f.icon className="h-3.5 w-3.5" /> {f.label}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Bookmark className="h-3.5 w-3.5" /> Mes favoris
                </button>
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
                <div className="space-y-5">
                  {filteredPubs.map((pub) => {
                    const color = getAvatarColor(pub.membre_nom || "");
                    const memberProfile = profils.find((p) => p.id === pub.membre_id);
                    return (
                      <div key={pub.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Post header */}
                        <div className="flex items-center gap-3 p-4 pb-3">
                          {pub.membre_photo ? (
                            <img
                              src={pub.membre_photo}
                              alt={pub.membre_nom}
                              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => memberProfile && setSelectedMembre(memberProfile)}
                            />
                          ) : (
                            <div
                              onClick={() => memberProfile && setSelectedMembre(memberProfile)}
                              className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity`}
                            >
                              {getInitials(pub.membre_nom || "?")}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                              onClick={() => memberProfile && setSelectedMembre(memberProfile)}
                            >
                              {pub.membre_nom}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {timeAgo(pub.created_date)} · {pub.image_url ? "Photo" : "Texte"}
                            </p>
                          </div>
                        </div>

                        {/* Post content */}
                        <div className="px-4 pb-2">
                          {pub.titre && <h3 className="font-semibold text-sm mb-1">{pub.titre}</h3>}
                          {pub.contenu && <p className="text-sm text-foreground whitespace-pre-wrap">{pub.contenu}</p>}
                        </div>

                        {pub.image_url && (
                          <div className="mt-2">
                            <img src={pub.image_url} alt={pub.titre || "Publication"} className="w-full max-h-96 object-cover" loading="lazy" />
                          </div>
                        )}

                        {/* Post footer */}
                        <div className="flex items-center gap-1 px-4 py-3 border-t border-border mt-2">
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Heart className="h-4 w-4" /> J'aime
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <MessageCircle className="h-4 w-4" /> Commenter
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Share2 className="h-4 w-4" /> Partager
                          </button>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profils.map((m) => {
                    const color = getAvatarColor(m.nom || "");
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMembre(m)}
                        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-center cursor-pointer"
                      >
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

        {/* Sidebar */}
        <aside className="space-y-4 hidden lg:block">
          {/* Scène du jour */}
          {sceneDuJour && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3">Scène du jour</h3>
              <div className="flex flex-col items-center text-center">
                {sceneDuJour.photo_profil ? (
                  <img src={sceneDuJour.photo_profil} alt={sceneDuJour.nom} className="w-16 h-16 rounded-full object-cover mb-2" />
                ) : (
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(sceneDuJour.nom)} flex items-center justify-center text-white text-lg font-bold mb-2`}>
                    {getInitials(sceneDuJour.nom || "?")}
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{sceneDuJour.nom}</p>
                {sceneDuJour.statut_perso && <p className="text-xs text-muted-foreground mt-0.5">{sceneDuJour.statut_perso}</p>}
                <button
                  onClick={() => setSelectedMembre(sceneDuJour)}
                  className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> Voir le profil
                </button>
              </div>
            </div>
          )}

          {/* Scène active */}
          {sceneActive && sceneActive.id !== sceneDuJour?.id && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Scène active</h3>
              <div className="flex items-center gap-3">
                {sceneActive.photo_profil ? (
                  <img src={sceneActive.photo_profil} alt={sceneActive.nom} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(sceneActive.nom)} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(sceneActive.nom || "?")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{sceneActive.nom}</p>
                  <p className="text-[10px] text-muted-foreground">Sur le fil</p>
                </div>
              </div>
            </div>
          )}

          {/* Membres récents */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Membres
            </h3>
            <div className="space-y-2">
              {recentMembers.map((m) => {
                const color = getAvatarColor(m.nom);
                return (
                  <div key={m.id} onClick={() => setSelectedMembre(m)} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-1.5 rounded-lg transition-colors">
                    {m.photo_profil ? (
                      <img src={m.photo_profil} alt={m.nom} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {getInitials(m.nom || "?")}
                      </div>
                    )}
                    <span className="text-xs font-medium text-foreground truncate">{m.nom}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setView("membres")} className="mt-3 text-xs font-medium text-primary hover:underline">
              Voir tous les membres →
            </button>
          </div>

          {/* Adhérez */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
            <h3 className="text-sm font-bold text-foreground mb-1">Adhérez à la COACUM</h3>
            <p className="text-xs text-muted-foreground mb-3">Carte membre, événements gratuits et accès au réseau.</p>
            <button className="w-full px-4 py-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md">
              Adhérer
            </button>
          </div>
        </aside>
      </div>

      {/* Profile dialog */}
      <MembreProfilDialog membre={selectedMembre} onClose={() => setSelectedMembre(null)} />
    </div>
  );
}