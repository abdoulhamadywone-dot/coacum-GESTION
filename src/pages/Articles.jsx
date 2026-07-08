import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, X, Search, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import ArticleCard from "@/components/ArticleCard";
import NewsCarousel from "@/components/NewsCarousel";

const CATEGORIES = ["Annonce", "Événement", "Activité", "Communiqué", "Culture", "Membre"];

export default function Articles() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [form, setForm] = useState({ titre: "", contenu: "", auteur: "", categorie: "Annonce", statut: "publié", date_publication: new Date().toISOString().slice(0,10), image_url: "", document_url: "", document_nom: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles-publies"],
    queryFn: () => base44.entities.Article.filter({ statut: "publié" }, "-date_publication"),
  });

  const filteredArticles = articles.filter(a =>
    (!searchQuery ||
    a.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.contenu?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterCategorie === "all" || a.categorie === filterCategorie)
  );
  const carouselArticles = articles.filter(a => a.image_url).slice(0, 5);
  const featuredArticle = filteredArticles[0];
  const restArticles = filteredArticles.slice(1);

  const createArt = useMutation({
    mutationFn: (data) => base44.entities.Article.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-publies"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setDialogOpen(false);
      setForm({ titre: "", contenu: "", auteur: user?.full_name || "", categorie: "Annonce", statut: "publié", date_publication: new Date().toISOString().slice(0,10), image_url: "", document_url: "", document_nom: "" });
      toast.success("Article publié !");
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
    toast.success("Image uploadée");
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, document_url: file_url, document_nom: file.name }));
    setUploadingDoc(false);
    toast.success("Document uploadé");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) return;
    createArt.mutate({ ...form, auteur: form.auteur || user?.full_name || "Admin" });
  };

  const openDialog = () => {
    setForm({ titre: "", contenu: "", auteur: user?.full_name || "", categorie: "Annonce", statut: "publié", date_publication: new Date().toISOString().slice(0,10), image_url: "", document_url: "", document_nom: "" });
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-orange-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">COACUM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Actualités</h1>
            <p className="opacity-90 mt-1 text-sm">Restez informé des dernières nouvelles de l'association</p>
          </div>
          {isAdmin && (
            <Button onClick={openDialog} variant="secondary" className="gap-2 flex-shrink-0 shadow-md">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel article</span>
            </Button>
          )}
        </div>
      </div>

      {/* Carousel */}
      {carouselArticles.length > 0 && !searchQuery && filterCategorie === "all" && (
        <NewsCarousel articles={carouselArticles} />
      )}

      {/* Search + Categories */}
      {articles.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="pl-10 max-w-md"
            />
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCategorie("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${filterCategorie === "all" ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              Toutes
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategorie(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${filterCategorie === cat ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Newspaper className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-xl font-medium text-foreground">Aucun article publié</p>
          <p className="text-sm text-muted-foreground mt-2">Revenez bientôt pour les actualités</p>
          {isAdmin && (
            <Button onClick={openDialog} className="mt-4 gap-2" variant="outline">
              <Plus className="h-4 w-4" /> Créer le premier article
            </Button>
          )}
        </div>
      ) : filteredArticles.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucun résultat pour « {searchQuery} »</p>
      ) : (
        <>
          {/* Featured article */}
          {featuredArticle && !searchQuery && (
            <ArticleCard key={featuredArticle.id} article={featuredArticle} isAdmin={isAdmin} featured />
          )}

          {/* Grid of remaining articles */}
          <div className={`grid gap-6 ${featuredArticle && !searchQuery ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {(searchQuery ? filteredArticles : restArticles).map(a => (
              <ArticleCard key={a.id} article={a} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}

      {/* Create Article Dialog (Admin) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titre *</label>
              <Input value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Titre de l'article" />
            </div>
            <div>
              <label className="text-sm font-medium">Contenu *</label>
              <Textarea value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} placeholder="Écrivez votre article..." rows={7} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Auteur</label>
                <Input value={form.auteur} onChange={e => setForm({...form, auteur: e.target.value})} placeholder="Nom de l'auteur" />
              </div>
              <div>
                <label className="text-sm font-medium">Date de publication</label>
                <Input type="date" value={form.date_publication} onChange={e => setForm({...form, date_publication: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Catégorie</label>
              <Select value={form.categorie} onValueChange={val => setForm({...form, categorie: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Photo upload */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Photo</label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="" className="w-full h-40 object-cover rounded-xl" />
                  <button type="button" onClick={() => setForm(f => ({...f, image_url: ""}))}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted/50 transition-colors ${uploadingImage ? 'opacity-50' : ''}`}>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingImage ? "Upload en cours..." : "Cliquer pour ajouter une photo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              )}
            </div>

            {/* Document upload */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Document (PDF, Word, etc.)</label>
              {form.document_url ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
                  <span className="text-sm flex-1 truncate">📎 {form.document_nom}</span>
                  <button type="button" onClick={() => setForm(f => ({...f, document_url: "", document_nom: ""}))}
                    className="p-1 hover:bg-destructive/10 rounded">
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors ${uploadingDoc ? 'opacity-50' : ''}`}>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingDoc ? "Upload en cours..." : "Cliquer pour joindre un document"}</span>
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden" onChange={handleDocUpload} disabled={uploadingDoc} />
                </label>
              )}
            </div>

            {/* Statut */}
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

            <Button type="submit" className="w-full" disabled={createArt.isPending || uploadingImage || uploadingDoc}>
              {createArt.isPending ? "Publication..." : "Publier l'article"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}