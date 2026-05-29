import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function Cotisations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filterMois, setFilterMois] = useState("all");
  const [form, setForm] = useState({ membre_nom: "", mois: "Janvier", annee: 2025, montant: 50 });

  const { data: cotisations = [], isLoading } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });

  const createCot = useMutation({
    mutationFn: (data) => base44.entities.Cotisation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDialogOpen(false); toast.success("Cotisation ajoutée"); },
  });
  const updateCot = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cotisation.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDialogOpen(false); setEditing(null); toast.success("Cotisation modifiée"); },
  });
  const deleteCot = useMutation({
    mutationFn: (id) => base44.entities.Cotisation.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDeleteId(null); toast.success("Cotisation supprimée"); },
  });

  const filtered = filterMois === "all" ? cotisations : cotisations.filter((c) => c.mois === filterMois);
  const total = filtered.reduce((s, c) => s + (c.montant || 0), 0);

  const openCreate = () => { setEditing(null); setForm({ membre_nom: "", mois: "Janvier", annee: 2025, montant: 50 }); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ membre_nom: c.membre_nom, mois: c.mois, annee: c.annee, montant: c.montant }); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.membre_nom.trim()) return;
    if (editing) updateCot.mutate({ id: editing.id, data: { ...form, paye: true } });
    else createCot.mutate({ ...form, paye: true });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cotisations</h1>
          <p className="text-sm text-muted-foreground">Total filtré : {total.toLocaleString()} MRU</p>
        </div>
        {isAdmin && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Enregistrer un paiement</Button>}
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterMois} onValueChange={setFilterMois}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {MOIS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune cotisation trouvée</p>
          <p className="text-sm mt-1">Enregistrez le premier paiement</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Membre</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Mois</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Année</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Montant</th>
                  {isAdmin && <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{c.membre_nom}</td>
                    <td className="p-3 text-muted-foreground">{c.mois}</td>
                    <td className="p-3 text-muted-foreground">{c.annee}</td>
                    <td className="p-3 text-right font-medium text-primary">{c.montant} MRU</td>
                    {isAdmin && (
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la cotisation" : "Nouvelle cotisation"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Membre *</label>
              <Select value={form.membre_nom} onValueChange={(v) => setForm({ ...form, membre_nom: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
                <SelectContent>
                  {membres.map((m) => <SelectItem key={m.id} value={m.nom}>{m.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Mois</label>
                <Select value={form.mois} onValueChange={(v) => setForm({ ...form, mois: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Année</label><Input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value) })} /></div>
            </div>
            <div><label className="text-sm font-medium">Montant (MRU)</label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: parseInt(e.target.value) })} /></div>
            <Button type="submit" className="w-full" disabled={createCot.isPending || updateCot.isPending}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette cotisation ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteCot.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}