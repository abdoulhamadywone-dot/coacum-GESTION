import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Users, Sparkles, ArrowRight, Grid3x3, FileText, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { membreAuth } from "@/lib/membreAuth";
import MembreProfilDialog from "@/components/MembreProfilDialog";

const AVATAR_COLORS = [
  "from-green-400 to-green-600",
  "from-emerald-400 to-green-500",
  "from-green-500 to-teal-600",
  "from-teal-400 to-green-600",
  "from-green-300 to-emerald-600",
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

  const featuredMembre = useMemo(() => {
    if (publications.length === 0) return profils[0] || null;
    const lastPub = publications[0];
    return profils.find((p) => p.id === lastPub.membre_id) || profils[0] || null;
  }, [publications, profils]);

  const lastPub = publications[0] || null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── HERO SECTION (green header + split layout) ── */}
      <div className="relative">
        {/* Green top bar */}
        <div className="bg-[#22c55e] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-semibold">{publications.length} publications · {profils.length} membres</span>
          </div>
          <div className="flex gap-1 bg-white/20 rounded-lg p-1">
            <button
              onClick={() => setView("feed")}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === "feed" ? "bg-white text-[#22c55e]" : "text-white"}`}
            >Fil</button>
            <button
              onClick={() => setView("membres")}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === "membres" ? "bg-white text-[#22c55e]" : "text-white"}`}
            >Membres</button>
          </div>
        </div>

        {/* Hero body */}
        <div className="bg-white dark:bg-gray-900 rounded-b-3xl shadow-sm mx-2 mb-6 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0 min-h-[360px]">
            {/* Left: text */}
            <div className="flex flex-col justify-center px-8 py-10">
              <h1 className="text-5xl sm:text-6xl font-black text-black dark:text-white leading-none tracking-tight uppercase mb-4">
                RÉSEAU<br />COACUM
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed max-w-sm mb-6">
                Découvrez les créations, les œuvres et les actualités partagées par les membres de la communauté des cultures urbaines de Mauritanie.
              </p>
              {!membreAuth.isLoggedIn() ? (
                <Link
                  to="/membre-login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#22c55e] hover:text-green-700 transition-colors group"
                >
                  Rejoindre le réseau
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/mon-profil"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#22c55e] hover:text-green-700 transition-colors group"
                >
                  <Sparkles className="h-4 w-4" />
                  Publier une création
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <div className="mt-6 flex items-center gap-2">
                <span className="text-xs text-gray-400">coacum.mr</span>
                <div className="flex-1 h-px bg-black dark:bg-white" />
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </div>
            </div>

            {/* Right: featured member photo */}
            <div className="relative bg-[#22c55e]/10 flex items-center justify-center p-6">
              {featuredMembre ? (
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedMembre(featuredMembre)}
                >
                  {featuredMembre.photo_profil ? (
                    <img
                      src={featuredMembre.photo_profil}
                      alt={featuredMembre.nom}
                      className="w-full max-w-xs h-64 object-cover rounded-2xl shadow-xl group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-48 h-48 rounded-2xl bg-gradient-to-br ${getAvatarColor(featuredMembre.nom)} flex items-center justify-center text-white text-5xl font-black shadow-xl`}>
                      {getInitials(featuredMembre.nom)}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/40" />
                  </div>
                  <div className="absolute top-3 right-3 bg-[#22c55e] text-white text-xs font-bold px-2 py-1 rounded-full">
                    En vue
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-[#22c55e]/20 flex items-center justify-center">
                  <Users className="h-16 w-16 text-[#22c55e]" />
                </div>
              )}
              {featuredMembre && (
                <div className="absolute bottom-6 left-6">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Membre actif</p>
                  <p className="font-bold text-sm text-black dark:text-white">{featuredMembre.nom}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-4 pb-12 max-w-6xl mx-auto space-y-6">

        {view === "feed" ? (
          <>
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white text-sm focus:outline-none focus:border-[#22c55e] transition-colors"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      filter === f.key ? "bg-[#22c55e] text-white" : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <f.icon className="h-3.5 w-3.5" /> {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Publications feed */}
            {pubsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#22c55e]" /></div>
            ) : filteredPubs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-xl font-bold text-black dark:text-white">Aucune publication</p>
                <p className="text-sm mt-1">Les membres n'ont pas encore partagé de créations.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPubs.map((pub) => {
                  const memberProfile = profils.find((p) => p.id === pub.membre_id);
                  const color = getAvatarColor(pub.membre_nom || "");
                  return (
                    <div
                      key={pub.id}
                      className="bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#22c55e] hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => memberProfile && setSelectedMembre(memberProfile)}
                    >
                      {pub.image_url ? (
                        <img src={pub.image_url} alt={pub.titre || "Publication"} className="w-full h-48 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-32 bg-[#22c55e]/10 flex items-center justify-center">
                          <FileText className="h-10 w-10 text-[#22c55e]/40" />
                        </div>
                      )}
                      <div className="p-4">
                        {pub.titre && <h3 className="font-black text-sm text-black dark:text-white uppercase mb-1 truncate">{pub.titre}</h3>}
                        {pub.contenu && <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{pub.contenu}</p>}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pub.membre_photo ? (
                              <img src={pub.membre_photo} alt={pub.membre_nom} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[9px] font-bold`}>
                                {getInitials(pub.membre_nom || "?")}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-black dark:text-white truncate max-w-[100px]">{pub.membre_nom}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{timeAgo(pub.created_date)}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-[10px] text-[#22c55e] font-semibold">
                          <span>Voir le profil</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ── MEMBRES VIEW ── */
          <>
            {profilsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#22c55e]" /></div>
            ) : profils.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl font-black text-black dark:text-white uppercase">Aucun membre</p>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-black text-black dark:text-white uppercase tracking-tight">MEMBRES</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {profils.map((m, idx) => {
                    const color = getAvatarColor(m.nom || "");
                    const pubCount = publications.filter(p => p.membre_id === m.id).length;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMembre(m)}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#22c55e] hover:shadow-xl transition-all duration-200 cursor-pointer group"
                      >
                        {/* Cover */}
                        <div className="h-20 bg-[#22c55e] relative overflow-hidden">
                          {m.photo_couverture && <img src={m.photo_couverture} alt="" className="w-full h-full object-cover opacity-70" />}
                          {pubCount > 0 && (
                            <span className="absolute top-2 right-2 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {pubCount} pub.
                            </span>
                          )}
                        </div>
                        {/* Avatar */}
                        <div className="px-3 pb-4 -mt-7">
                          {m.photo_profil ? (
                            <img src={m.photo_profil} alt={m.nom} className="w-14 h-14 rounded-xl object-cover border-4 border-white dark:border-gray-900 group-hover:border-[#22c55e] transition-colors" />
                          ) : (
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-base font-black border-4 border-white dark:border-gray-900`}>
                              {getInitials(m.nom || "?")}
                            </div>
                          )}
                          <h3 className="font-black text-sm text-black dark:text-white uppercase mt-2 truncate">{m.nom}</h3>
                          {m.statut_perso && <p className="text-[10px] text-[#22c55e] font-semibold truncate">{m.statut_perso}</p>}
                          {m.description && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{m.description}</p>}
                          <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#22c55e]">
                            <span>Voir profil</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Profile dialog */}
      <MembreProfilDialog membre={selectedMembre} onClose={() => setSelectedMembre(null)} />
    </div>
  );
}