import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, MapPin, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUT_CONFIG = {
  planifié: { label: "Planifié", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", border: "border-l-blue-400", gradient: "from-blue-500 to-indigo-600" },
  en_cours: { label: "En cours", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-400", gradient: "from-amber-500 to-orange-600" },
  terminé: { label: "Terminé", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", border: "border-l-emerald-400", gradient: "from-emerald-500 to-teal-600" },
  annulé: { label: "Annulé", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", border: "border-l-red-400", gradient: "from-red-500 to-rose-600" },
};

function getCountdown(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return "Demain";
  return `Dans ${diff} jours`;
}

export default function Evenements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" });
  const [filterStatut, setFilterStatut] = useState("all");

  const { data: evenements = [], isLoading } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  const createEvt = useMutation({ mutationFn: (d) => base44.entities.Evenement.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); toast.success("Événement créé"); } });
  const updateEvt = useMutation({ mutationFn: ({ id, data }) => base44.entities.Evenement.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); setEditing(null); toast.success("Événement modifié"); } });
  const deleteEvt = useMutation({ mutationFn: (id) => base44.entities.Evenement.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDeleteId(null); toast.success("Événement supprimé"); } });

  const openCreate = () => { setEditing(null); setForm({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" }); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ titre: e.titre, description: e.description||"", date_debut: e.date_debut||"", date_fin: e.date_fin||"", lieu: e.lieu||"", statut: e.statut||"planifié", notes: e.notes||"" }); setDialogOpen(true); };
  const handleSubmit = (e) => { e.preventDefault(); if (!form.titre.trim()) return; if (editing) updateEvt.mutate({ id: editing.id, data: form }); else createEvt.mutate(form); };

  const filtered = filterStatut === "all" ? evenements : evenements.filter(e => e.statut === filterStatut);
  const statusCounts = Object.fromEntries(Object.keys(STATUT_CONFIG).map(k => [k, evenements.filter(e => e.statut === k).length]));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Événements</h1>
          <p className="text-sm text-muted-foreground">{evenements.length} événement{evenements.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && <Button onClick={openCreate} className="gap-2 amber-glow"><Plus className="h-4 w-4" /> Nouvel événement</Button>}
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatut("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${filterStatut === "all" ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
          Tous <span className="ml-1 text-xs opacity-70">({evenements.length})</span>
        </button>
        {Object.entries(STATUT_CONFIG).map(([k, v]) => statusCounts[k] > 0 && (
          <button key={k} onClick={() => setFilterStatut(k)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${filterStatut === k ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {v.label} <span className="ml-1 text-xs opacity-70">({statusCounts[k]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Aucun événement</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((evt) => {
            const cfg = STATUT_CONFIG[evt.statut] || STATUT_CONFIG.planifié;
            const countdown = evt.statut === 'planifié' ? getCountdown(evt.date_debut) : null;
            const isEnCours = evt.statut === 'en_cours';
            return (
              <div key={evt.id} className={`bg-card rounded-2xl border-2 border-l-4 ${cfg.border} border-border p-5 hover:shadow-lg transition-all duration-200 group`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color} ${isEnCours ? 'relative' : ''}`}>
                        {isEnCours && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
                        {cfg.label}
                      </span>
                      {countdown && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Clock className="h-3 w-3" />{countdown}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base">{evt.titre}</h3>
                    {evt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      {evt.date_debut && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {evt.date_debut}{evt.date_fin ? ` → ${evt.date_fin}` : ""}
                        </span>
                      )}
                      {evt.lieu && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{evt.lieu}
                        </span>
                      )}
                    </div>
                    {evt.notes && <p className="text-xs text-muted-foreground/70 mt-2 italic">{evt.notes}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(evt)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteId(evt.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Titre *</label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Date début</label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Date fin</label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Lieu</label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUT_CONFIG).map(([k,v]) => (
                  <button key={k} type="button" onClick={() => setForm({...form, statut: k})}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.statut === k ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full" disabled={createEvt.isPending || updateEvt.isPending}>{editing ? "Enregistrer" : "Créer"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteEvt.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}