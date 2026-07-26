import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Calendar, ImageOff } from "lucide-react";

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

export default function MembreProfilDialog({ membre, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["membre-profil-detail", membre?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("membrePortal", {
        action: "get_profil",
        membre_id: membre.id,
      });
      return res.data;
    },
    enabled: !!membre,
  });

  const color = getAvatarColor(membre?.nom || "");

  return (
    <Dialog open={!!membre} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data?.profil ? (
          <div>
            {/* Cover */}
            <div className="h-32 sm:h-40 bg-gradient-to-br from-amber-400/30 to-orange-500/15 relative">
              {data.profil.photo_couverture && (
                <img src={data.profil.photo_couverture} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            {/* Header */}
            <div className="px-6 pb-4 -mt-10">
              <div className="flex items-end justify-between">
                {data.profil.photo_profil ? (
                  <img
                    src={data.profil.photo_profil}
                    alt={data.profil.nom}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl font-bold border-4 border-background shadow-lg`}>
                    {getInitials(data.profil.nom || "?")}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground mt-3">{data.profil.nom}</h2>
              {data.profil.statut_perso && (
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{data.profil.statut_perso}</p>
              )}
              {data.profil.date_adhesion && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Membre depuis {new Date(data.profil.date_adhesion).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </p>
              )}
              {data.profil.description && (
                <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{data.profil.description}</p>
              )}
            </div>

            {/* Publications */}
            <div className="border-t border-border px-6 py-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Publications ({data.publications?.length || 0})
              </h3>
              {!data.publications || data.publications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ImageOff className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Aucune publication pour l'instant</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {data.publications.map((pub) => (
                    <div key={pub.id} className="bg-muted/40 rounded-xl overflow-hidden border border-border">
                      {pub.image_url ? (
                        <img src={pub.image_url} alt={pub.titre || ""} className="w-full h-28 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-28 bg-muted flex items-center justify-center px-2">
                          <p className="text-xs text-muted-foreground text-center line-clamp-4">{pub.contenu || "—"}</p>
                        </div>
                      )}
                      {(pub.titre || pub.contenu) && (
                        <div className="p-2">
                          {pub.titre && <p className="text-xs font-semibold truncate">{pub.titre}</p>}
                          {pub.contenu && !pub.image_url && <p className="text-[10px] text-muted-foreground line-clamp-2">{pub.contenu}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}