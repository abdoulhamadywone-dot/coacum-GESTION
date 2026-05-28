import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Membres() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: "", statut: "actif", date_adhesion: "", telephone: "", notes: "" });

  const { data: membres = [], isLoading } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });

  const createMembre = useMutation({
    mutationFn: (data) => base44.entities.Membre.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDialogOpen(false); toast.success("Membre ajouté"); },
  });
  const updateMembre = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Membre.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDialogOpen(false); setEditing(null); toast.success("Membre modifié"); },
  });
  const deleteMembre = useMutation({
    mutationFn: (id) => base44.entities.Membre.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres"] }); setDeleteId(null); toast.success("Membre supprimé"); },
  });

  const filtered = membres.filter((m) => m.nom?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ nom: "", statut: "actif", date_adhesion: "", telephone: "", notes: "" }); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ nom: m.nom, statut: m.statut || "actif", date_adhesion: m.date_adhesion || "", telephone: m.telephone || "", notes: m.notes || "" }); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    if (editing) {
      updateMembre.mutate({ id: editing.id, data: form });
    } else {
      createMembre.mutate(form);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membres</h1>
          <p className="text-sm text-muted-foreground">{membres.length} membres enregistrés</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Ajouter un membre</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un membre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucun membre trouvé</p>
          <p className="text-sm mt-1">Ajoutez votre premier membre pour commencer</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Nom</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Adhésion</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Téléphone</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{m.nom}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.statut === "actif" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {m.statut === "actif" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {m.statut === "actif" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{m.date_adhesion || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{m.telephone || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
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
            <Button type="submit" className="w-full" disabled={createMembre.isPending || updateMembre.isPending}>
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMembre.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}