import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const RUBRIQUES = ["Transport", "Dejeuner", "Collation", "Communication", "Location", "Matériel", "Autre"];

export default function Depenses() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rubrique: "Transport", description: "", montant: 0, date: "", evenement: "" });

  const { data: depenses = [], isLoading } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });

  const createDep = useMutation({
    mutationFn: (d) => base44.entities.Depense.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDialogOpen(false); toast.success("Dépense ajoutée"); },
  });
  const updateDep = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Depense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDialogOpen(false); setEditing(null); toast.success("Dépense modifiée"); },
  });
  const deleteDep = useMutation({
    mutationFn: (id) => base44.entities.Depense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["depenses"] }); setDeleteId(null); toast.success("Dépense supprimée"); },
  });

  const total = depenses.reduce((s, d) => s + (d.montant || 0), 0);

  const openCreate = () => { setEditing(null); setForm({ rubrique: "Transport", description: "", montant: 0, date: new Date().toISOString().split("T")[0], evenement: "" }); setDialogOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ rubrique: d.rubrique, description: d.description || "", montant: d.montant, date: d.date || "", evenement: d.evenement || "" }); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.montant) return;
    if (editing) updateDep.mutate({ id: editing.id, data: form });
    else createDep.mutate(form);
  };

  const rubriqueColor = (r) => {
    const map = { Transport: "bg-blue-100 text-blue-700", Dejeuner: "bg-orange-100 text-orange-700", Collation: "bg-yellow-100 text-yellow-700", Communication: "bg-purple-100 text-purple-700", Location: "bg-green-100 text-green-700", "Matériel": "bg-pink-100 text-pink-700", Autre: "bg-gray-100 text-gray-700" };
    return map[r] || map.Autre;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dépenses</h1>
          <p className="text-sm text-muted-foreground">Total : {total.toLocaleString()} MRU</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Ajouter une dépense</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : depenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune dépense enregistrée</p>
          <p className="text-sm mt-1">Commencez à suivre vos dépenses</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Rubrique</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Événement</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Montant</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {depenses.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rubriqueColor(d.rubrique)}`}>{d.rubrique}</span></td>
                    <td className="p-3 text-foreground">{d.description || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{d.date || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{d.evenement || "—"}</td>
                    <td className="p-3 text-right font-medium text-destructive">{d.montant?.toLocaleString()} MRU</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Rubrique *</label>
              <Select value={form.rubrique} onValueChange={(v) => setForm({ ...form, rubrique: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RUBRIQUES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Montant (MRU) *</label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: parseInt(e.target.value) || 0 })} required /></div>
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