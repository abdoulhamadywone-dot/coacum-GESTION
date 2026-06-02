import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const RUBRIQUES = [
  { value: "Transport", icon: "🚗", color: "border-blue-400 dark:border-blue-600", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", cardBg: "bg-blue-50 dark:bg-blue-900/20" },
  { value: "Dejeuner", icon: "🍽️", color: "border-orange-400 dark:border-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", cardBg: "bg-orange-50 dark:bg-orange-900/20" },
  { value: "Collation", icon: "☕", color: "border-yellow-400 dark:border-yellow-600", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", cardBg: "bg-yellow-50 dark:bg-yellow-900/20" },
  { value: "Communication", icon: "📢", color: "border-purple-400 dark:border-purple-600", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", cardBg: "bg-purple-50 dark:bg-purple-900/20" },
  { value: "Location", icon: "🏠", color: "border-emerald-400 dark:border-emerald-600", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", cardBg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { value: "Matériel", icon: "🎵", color: "border-pink-400 dark:border-pink-600", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", cardBg: "bg-pink-50 dark:bg-pink-900/20" },
  { value: "Autre", icon: "📌", color: "border-gray-400 dark:border-gray-600", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", cardBg: "bg-gray-50 dark:bg-gray-900/20" },
];

const getRub = (v) => RUBRIQUES.find(r => r.value === v) || RUBRIQUES[RUBRIQUES.length-1];

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days/7)} sem.`;
  return `il y a ${Math.floor(days/30)} mois`;
}

export default function Depenses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rubrique: "Transport", description: "", montant: 0, date: "", evenement: "" });
  const [filterRub, setFilterRub] = useState("all");

  const { data: depenses = [], isLoading } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });

  const createDep = useMutation({ mutationFn: (d) => base44.entities.Depense.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDialogOpen(false); toast.success("Dépense ajoutée"); } });
  const updateDep = useMutation({ mutationFn: ({ id, data }) => base44.entities.Depense.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDialogOpen(false); setEditing(null); toast.success("Dépense modifiée"); } });
  const deleteDep = useMutation({ mutationFn: (id) => base44.entities.Depense.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDeleteId(null); toast.success("Dépense supprimée"); } });

  const total = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const filtered = filterRub === "all" ? depenses : depenses.filter(d => d.rubrique === filterRub);

  // Category totals
  const catTotals = {};
  depenses.forEach(d => { catTotals[d.rubrique] = (catTotals[d.rubrique]||0) + (d.montant||0); });

  const openCreate = () => { setEditing(null); setForm({ rubrique: "Transport", description: "", montant: 0, date: new Date().toISOString().split("T")[0], evenement: "" }); setDialogOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ rubrique: d.rubrique, description: d.description||"", montant: d.montant, date: d.date||"", evenement: d.evenement||"" }); setDialogOpen(true); };
  const handleSubmit = (e) => { e.preventDefault(); if (!form.montant) return; if (editing) updateDep.mutate({ id: editing.id, data: form }); else createDep.mutate(form); };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dépenses</h1>
          <p className="text-sm text-muted-foreground">Total : <span className="font-bold text-destructive">{total.toLocaleString()} MRU</span></p>
        </div>
        {isAdmin && <Button onClick={openCreate} className="gap-2 amber-glow"><Plus className="h-4 w-4" /> Ajouter une dépense</Button>}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button onClick={() => setFilterRub("all")}
          className={`rounded-xl p-4 text-left border-2 transition-all ${filterRub === "all" ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
          <div className="text-2xl mb-1">📊</div>
          <p className="text-xs text-muted-foreground">Toutes</p>
          <p className="text-sm font-bold text-foreground">{total.toLocaleString()} MRU</p>
          <p className="text-xs text-muted-foreground">{depenses.length} entrées</p>
        </button>
        {RUBRIQUES.map(r => {
          const t = catTotals[r.value] || 0;
          const count = depenses.filter(d => d.rubrique === r.value).length;
          if (count === 0) return null;
          return (
            <button key={r.value} onClick={() => setFilterRub(r.value)}
              className={`rounded-xl p-4 text-left border-2 transition-all ${filterRub === r.value ? 'border-primary' : 'border-border hover:border-primary/50'} ${r.cardBg}`}>
              <div className="text-2xl mb-1">{r.icon}</div>
              <p className="text-xs text-muted-foreground">{r.value}</p>
              <p className="text-sm font-bold text-foreground">{t.toLocaleString()} MRU</p>
              <p className="text-xs text-muted-foreground">{count} entrée{count > 1 ? 's' : ''}</p>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune dépense</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground w-1"></th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Rubrique</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Événement</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Montant</th>
                  {isAdmin && <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const rub = getRub(d.rubrique);
                  return (
                    <tr key={d.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors border-l-4 ${rub.color}`}>
                      <td className="pl-3 pr-1 py-3 text-lg">{rub.icon}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rub.badge}`}>{d.rubrique}</span></td>
                      <td className="p-3 text-foreground">{d.description || "—"}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">
                        <div>{d.date || "—"}</div>
                        {d.date && <div className="text-[10px] text-muted-foreground/60">{timeAgo(d.date)}</div>}
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{d.evenement || "—"}</td>
                      <td className="p-3 text-right font-bold text-destructive">{d.montant?.toLocaleString()} MRU</td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(d)} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                            <button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rubrique *</label>
              <div className="grid grid-cols-4 gap-2">
                {RUBRIQUES.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm({...form, rubrique: r.value})}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${form.rubrique === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <span className="text-xl">{r.icon}</span>
                    <span className="text-[10px] leading-tight text-center">{r.value}</span>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Montant (MRU) *</label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: parseInt(e.target.value)||0 })} required /></div>
              <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Événement lié</label><Input value={form.evenement} onChange={(e) => setForm({ ...form, evenement: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={createDep.isPending || updateDep.isPending}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteDep.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}