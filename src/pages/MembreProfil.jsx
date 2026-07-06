import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Phone, MessageCircle, Calendar, Wallet, TrendingUp, UserCheck, UserX, Edit2, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import MemberAssistant from "@/components/MemberAssistant";

const AVATAR_COLORS = [
  "from-amber-400 to-orange-500",
  "from-orange-400 to-red-500",
  "from-yellow-400 to-amber-500",
  "from-rose-400 to-pink-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
];

function getInitials(nom = "") {
  return nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(nom = "") {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const MOIS_ORDER = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function formatWhatsApp(tel) {
  if (!tel) return null;
  // Keep only digits
  let cleaned = tel.replace(/\D/g, "");
  // If starts with 00, remove the 00
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (!cleaned) return null;
  return `https://wa.me/${cleaned}`;
}

export default function MembreProfil() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(null);

  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: participations = [] } = useQuery({ queryKey: ["participations"], queryFn: () => base44.entities.Participation.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  const membre = membres.find(m => m.id === id);

  const updateMembre = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Membre.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setEditOpen(false); toast.success("Membre modifié"); }
  });

  if (!membre) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Membre introuvable.</p>
        <Link to="/membres" className="text-primary underline text-sm mt-2 block">← Retour aux membres</Link>
      </div>
    );
  }

  const membreCots = cotisations
    .filter(c => c.membre_nom === membre.nom)
    .sort((a, b) => {
      if (b.annee !== a.annee) return b.annee - a.annee;
      return MOIS_ORDER.indexOf(b.mois) - MOIS_ORDER.indexOf(a.mois);
    });

  const totalPaye = membreCots.reduce((s, c) => s + (c.montant || 0), 0);
  const totalMonths = new Set(cotisations.map(c => `${c.mois}|${c.annee}`)).size;
  const taux = totalMonths ? Math.round((membreCots.length / totalMonths) * 100) : 0;
  const color = getAvatarColor(membre.nom);
  const whatsappUrl = formatWhatsApp(membre.telephone);

  const openEdit = () => {
    setForm({ nom: membre.nom, statut: membre.statut || "actif", date_adhesion: membre.date_adhesion || "", telephone: membre.telephone || "", notes: membre.notes || "" });
    setEditOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMembre.mutate({ id: membre.id, data: form });
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link to="/membres" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour aux membres
      </Link>

      {/* Profile card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-amber-400/30 to-orange-500/20" />
        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-card`}>
            {getInitials(membre.nom)}
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{membre.nom}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${membre.statut === "actif" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {membre.statut === "actif" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                {membre.statut === "actif" ? "Actif" : "Inactif"}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {isAdmin && (
                <Button variant="outline" onClick={openEdit} className="gap-2 rounded-xl">
                  <Edit2 className="h-4 w-4" /> Modifier
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Wallet className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{totalPaye.toLocaleString("fr-FR")}</p>
          <p className="text-xs text-muted-foreground">MRU payés</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{taux}%</p>
          <p className="text-xs text-muted-foreground">Taux paiement</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Calendar className="h-5 w-5 text-sky-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{membre.date_adhesion || "—"}</p>
          <p className="text-xs text-muted-foreground">Date adhésion</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Phone className="h-5 w-5 text-violet-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground truncate">{membre.telephone || "—"}</p>
          <p className="text-xs text-muted-foreground">Téléphone</p>
        </div>
      </div>

      {/* WhatsApp notice if no phone */}
      {!membre.telephone && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ Aucun numéro de téléphone enregistré. {isAdmin ? "Modifiez le profil pour activer WhatsApp." : "Contactez un administrateur pour ajouter un numéro."}
        </div>
      )}

      {/* Notes */}
      {membre.notes && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notes</p>
          <p className="text-sm text-foreground">{membre.notes}</p>
        </div>
      )}

      {/* Assistant IA - Admin only */}
      {isAdmin && (
        <MemberAssistant
          membre={membre}
          cotisations={cotisations}
          onDataChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["cotisations"] });
            queryClient.invalidateQueries({ queryKey: ["membres"] });
          }}
        />
      )}

      {/* Historique cotisations */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Historique des cotisations</h2>
          <span className="text-xs text-muted-foreground">{membreCots.length} paiement(s)</span>
        </div>
        {membreCots.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Aucune cotisation enregistrée.</p>
        ) : (
          <div className="divide-y divide-border">
            {membreCots.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium">{c.mois} {c.annee}</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">{c.montant?.toLocaleString("fr-FR")} MRU</span>
              </div>
            ))}
          </div>
        )}
        {membreCots.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="text-amber-600">{totalPaye.toLocaleString("fr-FR")} MRU</span>
          </div>
        )}
      </div>

      {/* Participation aux événements */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" /> Participation aux événements</h2>
          <span className="text-xs text-muted-foreground">{participations.filter(p => p.membre_id === membre.id).length} événement(s)</span>
        </div>
        {participations.filter(p => p.membre_id === membre.id).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Aucune participation enregistrée.</p>
        ) : (
          <div className="divide-y divide-border">
            {participations
              .filter(p => p.membre_id === membre.id)
              .sort((a, b) => {
                const ea = evenements.find(ev => ev.id === a.evenement_id);
                const eb = evenements.find(ev => ev.id === b.evenement_id);
                return (eb?.date_debut || "").localeCompare(ea?.date_debut || "");
              })
              .map(p => {
                const evt = evenements.find(e => e.id === p.evenement_id);
                const statutColors = { présent: "bg-emerald-100 text-emerald-700", excusé: "bg-amber-100 text-amber-700", absent: "bg-red-100 text-red-700" };
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.statut === "présent" ? <UserCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                       : p.statut === "excusé" ? <MessageCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                       : <UserX className="h-4 w-4 text-red-400 flex-shrink-0" />}
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{p.evenement_titre}</span>
                        {evt?.date_debut && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> {evt.date_debut}
                            {evt.lieu && <><MapPin className="h-2.5 w-2.5 ml-1" /> {evt.lieu}</>}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ml-2 ${statutColors[p.statut] || "bg-muted text-muted-foreground"}`}>
                      {p.statut}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le membre</DialogTitle></DialogHeader>
          {form && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium">Nom *</label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required /></div>
              <div><label className="text-sm font-medium">Statut</label>
                <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="actif">Actif</SelectItem><SelectItem value="inactif">Inactif</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Date d'adhésion</label><Input type="date" value={form.date_adhesion} onChange={e => setForm({ ...form, date_adhesion: e.target.value })} /></div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-green-500" /> Téléphone (WhatsApp)
                </label>
                <Input placeholder="Ex: 22212345678 ou +22212345678" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">Avec l'indicatif pays (Mauritanie : 222). Permet d'envoyer des messages WhatsApp directement.</p>
              </div>
              <div><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={updateMembre.isPending}>Enregistrer</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}