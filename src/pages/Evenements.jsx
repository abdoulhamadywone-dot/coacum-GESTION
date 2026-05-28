import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUTS = { planifié: "bg-blue-100 text-blue-700", en_cours: "bg-yellow-100 text-yellow-700", terminé: "bg-green-100 text-green-700", annulé: "bg-red-100 text-red-700" };
const STATUT_LABELS = { planifié: "Planifié", en_cours: "En cours", terminé: "Terminé", annulé: "Annulé" };

export default function Evenements() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" });

  const { data: evenements = [], isLoading } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  const createEvt = useMutation({
    mutationFn: (d) => base44.entities.Evenement.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); toast.success("Événement créé"); },
  });
  const updateEvt = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Evenement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); setEditing(null); toast.success("Événement modifié"); },
  });
  const deleteEvt = useMutation({
    mutationFn: (id) => base44.entities.Evenement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDeleteId(null); toast.success("Événement supprimé"); },
  });

  const openCreate = () => { setEditing(null); setForm({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" }); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ titre: e.titre, description: e.description || "", date_debut: e.date_debut || "", date_fin: e.date_fin || "", lieu: e.lieu || "", statut: e.statut || "planifié", notes: e.notes || "" }); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    if (editing) updateEvt.mutate({ id: editing.id, data: form });
    else createEvt.mutate(form);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Événements</h1>
          <p className="text-sm text-muted-foreground">{evenements.length} événements</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvel événement</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : evenements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucun événement</p>
          <p className="text-sm mt-1">Créez votre premier événement</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {evenements.map((evt) => (
            <div key={evt.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUTS[evt.statut] || STATUTS.planifié}`}>
                      {STATUT_LABELS[evt.statut] || evt.statut}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{evt.titre}</h3>
                  {evt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {evt.date_debut && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{evt.date_debut}{evt.date_fin ? ` → ${evt.date_fin}` : ""}</span>}
                    {evt.lieu && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{evt.lieu}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => openEdit(evt)} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setDeleteId(evt.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Titre *</label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Date début</label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Date fin</label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Lieu</label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Statut</label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
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