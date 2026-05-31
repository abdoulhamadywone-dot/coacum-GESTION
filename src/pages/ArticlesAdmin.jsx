import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function ArticlesAdmin() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titre: "", contenu: "", auteur: "", image_url: "", statut: "brouillon", date_publication: "" });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: () => base44.entities.Article.list("-created_date"),
  });

  const createArt = useMutation({
    mutationFn: (data) => base44.entities.Article.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["articles"] }); queryClient.invalidateQueries({ queryKey: ["articles-publies"] }); setDialogOpen(false); toast.success("Article créé"); },
  });
  const updateArt = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["articles"] }); queryClient.invalidateQueries({ queryKey: ["articles-publies"] }); setDialogOpen(false); setEditing(null); toast.success("Article modifié"); },
  });
  const deleteArt = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["articles"] }); queryClient.invalidateQueries({ queryKey: ["articles-publies"] }); setDeleteId(null); toast.success("Article supprimé"); },
  });
  const togglePublish = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.Article.update(id, { statut }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["articles"] }); queryClient.invalidateQueries({ queryKey: ["articles-publies"] }); },
  });

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-full p-8">
      <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
    </div>
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ titre: "", contenu: "", auteur: user?.full_name || "", image_url: "", statut: "brouillon", date_publication: new Date().toISOString().slice(0,10) });
    setDialogOpen(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ titre: a.titre, contenu: a.contenu, auteur: a.auteur || "", image_url: a.image_url || "", statut: a.statut, date_publication: a.date_publication || "" });
    setDialogOpen(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) return;
    if (editing) updateArt.mutate({ id: editing.id, data: form });
    else createArt.mutate(form);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des articles</h1>
          <p className="text-sm text-muted-foreground">{articles.filter(a => a.statut === 'publié').length} publié(s) · {articles.filter(a => a.statut === 'brouillon').length} brouillon(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvel article</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucun article</p>
          <p className="text-sm mt-1">Créez votre premier article</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map(a => (
            <div key={a.id} className="bg-card rounded-2xl border border-border p-5 flex flex-col sm:flex-row gap-4">
              {a.image_url && <img src={a.image_url} alt="" className="w-full sm:w-32 h-24 object-cover rounded-xl flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={a.statut === 'publié' ? 'default' : 'secondary'}>{a.statut}</Badge>
                      {a.date_publication && <span className="text-xs text-muted-foreground">{a.date_publication}</span>}
                    </div>
                    <h3 className="font-semibold text-foreground">{a.titre}</h3>
                    {a.auteur && <p className="text-xs text-muted-foreground mt-0.5">Par {a.auteur}</p>}
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.contenu}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePublish.mutate({ id: a.id, statut: a.statut === 'publié' ? 'brouillon' : 'publié' })}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title={a.statut === 'publié' ? 'Dépublier' : 'Publier'}
                    >
                      {a.statut === 'publié' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                    </button>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Titre *</label><Input value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Titre de l'article" /></div>
            <div><label className="text-sm font-medium">Contenu *</label><Textarea value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} placeholder="Écrivez votre article..." rows={8} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Auteur</label><Input value={form.auteur} onChange={e => setForm({...form, auteur: e.target.value})} placeholder="Nom de l'auteur" /></div>
              <div><label className="text-sm font-medium">Date de publication</label><Input type="date" value={form.date_publication} onChange={e => setForm({...form, date_publication: e.target.value})} /></div>
            </div>
            <div><label className="text-sm font-medium">URL de l'image (optionnel)</label><Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." /></div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Statut</label>
              <div className="flex gap-2">
                {["brouillon","publié"].map(s => (
                  <button key={s} type="button" onClick={() => setForm({...form, statut: s})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${form.statut === s ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createArt.isPending || updateArt.isPending}>{editing ? "Enregistrer" : "Créer l'article"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteArt.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}