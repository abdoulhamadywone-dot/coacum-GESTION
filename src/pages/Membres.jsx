import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PAGE_SIZE = 20;

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
  return nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
}

function getAvatarColor(nom = "") {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getBadge(membre, cotisations) {
  const memberCots = cotisations.filter(c => c.membre_nom === membre.nom);
  const total = memberCots.reduce((s,c) => s+(c.montant||0), 0);
  const moisCount = memberCots.length;
  if (total >= 500 || moisCount >= 10) return { label: "🏆 Champion", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
  if (moisCount >= 6) return { label: "❤️ Fidèle", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" };
  const isNew = membre.date_adhesion && new Date(membre.date_adhesion) > new Date(Date.now() - 90*24*3600000);
  if (isNew) return { label: "✨ Nouveau", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400" };
  return null;
}

function getPaymentRate(membre, cotisations, totalMonths) {
  if (!totalMonths) return 0;
  const paid = cotisations.filter(c => c.membre_nom === membre.nom).length;
  return Math.round((paid / totalMonths) * 100);
}

export default function Membres() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: "", statut: "actif", date_adhesion: "", telephone: "", notes: "" });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatut, setFilterStatut] = useState("all");

  const { data: membres = [], isLoading } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });

  const totalMonths = new Set(cotisations.map(c => `${c.mois}|${c.annee}`)).size;

  const createMembre = useMutation({ mutationFn: (d) => base44.entities.Membre.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDialogOpen(false); toast.success("Membre ajouté"); } });
  const updateMembre = useMutation({ mutationFn: ({ id, data }) => base44.entities.Membre.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDialogOpen(false); setEditing(null); toast.success("Membre modifié"); } });
  const deleteMembre = useMutation({ mutationFn: (id) => base44.entities.Membre.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDeleteId(null); toast.success("Membre supprimé"); } });

  const filtered = useMemo(() => {
    let list = membres.filter(m => m.nom?.toLowerCase().includes(search.toLowerCase()));
    if (filterStatut !== "all") list = list.filter(m => m.statut === filterStatut);
    list = [...list].sort((a, b) => {
      let va = a[sortKey] || "", vb = b[sortKey] || "";
      if (sortKey === "taux") { va = getPaymentRate(a, cotisations, totalMonths); vb = getPaymentRate(b, cotisations, totalMonths); }
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb), 'fr') : String(vb).localeCompare(String(va), 'fr');
    });
    return list;
  }, [membres, search, filterStatut, sortKey, sortDir, cotisations, totalMonths]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const openCreate = () => { setEditing(null); setForm({ nom: "", statut: "actif", date_adhesion: "", telephone: "", notes: "" }); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ nom: m.nom, statut: m.statut||"actif", date_adhesion: m.date_adhesion||"", telephone: m.telephone||"", notes: m.notes||"" }); setDialogOpen(true); };
  const handleSubmit = (e) => { e.preventDefault(); if (!form.nom.trim()) return; if (editing) updateMembre.mutate({ id: editing.id, data: form }); else createMembre.mutate(form); };

  const toggleSort = (key) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } setPage(1); };
  const SortIcon = ({ k }) => sortKey === k ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />) : null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membres</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} / {membres.length} membres</p>
        </div>
        {isAdmin && <Button onClick={openCreate} className="gap-2 amber-glow"><Plus className="h-4 w-4" /> Ajouter un membre</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un membre..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["all", "actif", "inactif"].map(s => (
            <button key={s} onClick={() => { setFilterStatut(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterStatut === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {s === "all" ? "Tous" : s === "actif" ? "Actifs" : "Inactifs"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucun membre trouvé</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground">Avatar</th>
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("nom")}>Nom <SortIcon k="nom" /></th>
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("statut")}>Statut <SortIcon k="statut" /></th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Badge</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("taux")}>Taux <SortIcon k="taux" /></th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("date_adhesion")}>Adhésion <SortIcon k="date_adhesion" /></th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Téléphone</th>
                  {isAdmin && <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => {
                  const badge = getBadge(m, cotisations);
                  const rate = getPaymentRate(m, cotisations, totalMonths);
                  const color = getAvatarColor(m.nom);
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {getInitials(m.nom)}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        <Link to={`/membres/${m.id}`} className="hover:text-primary hover:underline transition-colors">{m.nom}</Link>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.statut === "actif" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {m.statut === "actif" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {m.statut === "actif" ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {badge && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${rate}%`, background: rate >= 80 ? 'hsl(142,55%,45%)' : rate >= 50 ? 'hsl(38,95%,48%)' : 'hsl(0,84%,60%)' }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{rate}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{m.date_adhesion || "—"}</td>
                      <td className="p-3 hidden lg:table-cell">
                        {m.telephone ? (
                          <a href={`https://wa.me/${m.telephone.replace(/\D/g,"").replace(/^00/,"")}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors">
                            <MessageCircle className="h-3 w-3" /> {m.telephone}
                          </a>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                            <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">Page {page} / {totalPages} · {filtered.length} membres</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le membre" : "Nouveau membre"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Nom *</label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></div>
            <div><label className="text-sm font-medium">Statut</label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="actif">Actif</SelectItem><SelectItem value="inactif">Inactif</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Date d'adhésion</label><Input type="date" value={form.date_adhesion} onChange={(e) => setForm({ ...form, date_adhesion: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Téléphone</label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={createMembre.isPending || updateMembre.isPending}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMembre.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}