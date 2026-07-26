import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { membreAuth } from "@/lib/membreAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, ImagePlus, Save, Trash2, KeyRound, Plus, X } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
];

function getInitials(nom = "") {
  return nom.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(nom = "") {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function MonProfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const membre = membreAuth.getMembre();

  const [editProfil, setEditProfil] = useState({
    statut_perso: membre?.statut_perso || "",
    description: membre?.description || "",
  });
  const [credentials, setCredentials] = useState({
    nouveau_nom_utilisateur: "",
    nouveau_mot_de_passe: "",
    confirmer_mot_de_passe: "",
  });
  const [newPub, setNewPub] = useState({ titre: "", contenu: "", image_url: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [showPubForm, setShowPubForm] = useState(false);
  const coverInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const pubImageRef = useRef(null);

  const { data: publications = [], isLoading: pubsLoading } = useQuery({
    queryKey: ["mes-publications", membre?.id],
    queryFn: () => base44.entities.Publication.filter({ membre_id: membre.id }, "-created_date", 100),
    enabled: !!membre,
  });

  useEffect(() => {
    if (!membre) navigate("/membre-login");
  }, [membre, navigate]);

  if (!membre) return null;

  const callPortal = async (payload) => {
    const res = await base44.functions.invoke("membrePortal", { ...payload, membre_id: membre.id, mot_de_passe: membre.mot_de_passe || "" });
    if (!res.data?.success) throw new Error(res.data?.error || "Erreur");
    return res.data;
  };

  const handleUploadPhoto = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    type === "profil" ? setUploadingPhoto(true) : setUploadingCover(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await callPortal({
        action: "update_profil",
        [type === "profil" ? "photo_profil" : "photo_couverture"]: file_url,
      });
      membreAuth.updateMembre({ [type === "profil" ? "photo_profil" : "photo_couverture"]: file_url });
      toast.success("Photo mise à jour");
      window.location.reload();
    } catch (err) {
      toast.error("Erreur lors de l'upload");
    } finally {
      type === "profil" ? setUploadingPhoto(false) : setUploadingCover(false);
    }
  };

  const handleSaveProfil = async () => {
    setSavingProfil(true);
    try {
      await callPortal({ action: "update_profil", ...editProfil });
      membreAuth.updateMembre(editProfil);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err.message || "Erreur");
    } finally {
      setSavingProfil(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (credentials.nouveau_mot_de_passe && credentials.nouveau_mot_de_passe !== credentials.confirmer_mot_de_passe) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSavingCreds(true);
    try {
      const payload = { action: "change_credentials" };
      if (credentials.nouveau_nom_utilisateur) payload.nouveau_nom_utilisateur = credentials.nouveau_nom_utilisateur;
      if (credentials.nouveau_mot_de_passe) payload.nouveau_mot_de_passe = credentials.nouveau_mot_de_passe;
      await callPortal(payload);
      if (credentials.nouveau_nom_utilisateur) membreAuth.updateMembre({ nom_utilisateur: credentials.nouveau_nom_utilisateur });
      toast.success("Identifiants modifiés");
      setCredentials({ nouveau_nom_utilisateur: "", nouveau_mot_de_passe: "", confirmer_mot_de_passe: "" });
    } catch (err) {
      toast.error(err.message || "Erreur");
    } finally {
      setSavingCreds(false);
    }
  };

  const handleCreatePub = async () => {
    if (!newPub.titre && !newPub.contenu && !newPub.image_url) {
      toast.error("Ajoutez un titre, un contenu ou une image");
      return;
    }
    try {
      await callPortal({ action: "create_publication", ...newPub });
      queryClient.invalidateQueries({ queryKey: ["mes-publications", membre.id] });
      queryClient.invalidateQueries({ queryKey: ["publications"] });
      setNewPub({ titre: "", contenu: "", image_url: "" });
      setShowPubForm(false);
      toast.success("Publication créée");
    } catch (err) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleDeletePub = async (id) => {
    try {
      await callPortal({ action: "delete_publication", publication_id: id });
      queryClient.invalidateQueries({ queryKey: ["mes-publications", membre.id] });
      queryClient.invalidateQueries({ queryKey: ["publications"] });
      toast.success("Publication supprimée");
    } catch (err) {
      toast.error(err.message || "Erreur");
    }
  };

  const handlePubImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPub({ ...newPub, image_url: file_url });
    } catch (err) {
      toast.error("Erreur lors de l'upload");
    }
  };

  const color = getAvatarColor(membre.nom);

  return (
    <div className="space-y-6">
      {/* Cover + Avatar */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="relative h-40 sm:h-48 bg-gradient-to-br from-amber-400/30 to-orange-500/20">
          {membre.photo_couverture && (
            <img src={membre.photo_couverture} alt="Couverture" className="w-full h-full object-cover" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Couverture
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, "couverture")} />
        </div>

        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative">
            {membre.photo_profil ? (
              <img src={membre.photo_profil} alt={membre.nom} className="w-24 h-24 rounded-2xl object-cover border-4 border-card shadow-lg" />
            ) : (
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-card`}>
                {getInitials(membre.nom)}
              </div>
            )}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, "profil")} />
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{membre.nom}</h1>
            <p className="text-sm text-muted-foreground">@{membre.nom_utilisateur}</p>
            {membre.statut_perso && <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">{membre.statut_perso}</p>}
          </div>
        </div>
      </div>

      {/* Edit Profile Info */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Save className="h-4 w-4 text-primary" /> Modifier mon profil</h2>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Statut personnel</label>
          <Input
            value={editProfil.statut_perso}
            onChange={(e) => setEditProfil({ ...editProfil, statut_perso: e.target.value })}
            placeholder="Ex: Artiste peintre · Mauritanie"
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
          <Textarea
            value={editProfil.description}
            onChange={(e) => setEditProfil({ ...editProfil, description: e.target.value })}
            placeholder="Parlez-nous de vous, de vos œuvres, de votre parcours..."
            rows={4}
          />
        </div>
        <Button onClick={handleSaveProfil} disabled={savingProfil}>
          {savingProfil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {/* Publications */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Mes publications</h2>
          <Button size="sm" onClick={() => setShowPubForm(!showPubForm)} className="gap-1.5">
            {showPubForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showPubForm ? "Annuler" : "Publier"}
          </Button>
        </div>

        {showPubForm && (
          <div className="px-6 py-4 border-b border-border space-y-3 bg-muted/20">
            <Input
              value={newPub.titre}
              onChange={(e) => setNewPub({ ...newPub, titre: e.target.value })}
              placeholder="Titre (optionnel)"
            />
            <Textarea
              value={newPub.contenu}
              onChange={(e) => setNewPub({ ...newPub, contenu: e.target.value })}
              placeholder="Décrivez votre œuvre..."
              rows={3}
            />
            {newPub.image_url && (
              <div className="relative">
                <img src={newPub.image_url} alt="Preview" className="max-h-48 rounded-lg object-cover" />
                <button onClick={() => setNewPub({ ...newPub, image_url: "" })} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input ref={pubImageRef} type="file" accept="image/*" className="hidden" onChange={handlePubImage} />
              <Button variant="outline" size="sm" onClick={() => pubImageRef.current?.click()} className="gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" /> Image
              </Button>
              <Button size="sm" onClick={handleCreatePub} className="ml-auto">Publier</Button>
            </div>
          </div>
        )}

        {pubsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : publications.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Aucune publication. Partagez vos œuvres !</p>
        ) : (
          <div className="divide-y divide-border">
            {publications.map((pub) => (
              <div key={pub.id} className="px-6 py-4 group">
                {pub.titre && <h3 className="font-semibold text-sm mb-1">{pub.titre}</h3>}
                {pub.contenu && <p className="text-sm text-foreground whitespace-pre-wrap">{pub.contenu}</p>}
                {pub.image_url && <img src={pub.image_url} alt={pub.titre || "Publication"} className="mt-2 rounded-lg max-h-64 object-cover" />}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(pub.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleDeletePub(pub.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Credentials */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Changer mes identifiants</h2>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nouveau nom d'utilisateur</label>
          <Input
            value={credentials.nouveau_nom_utilisateur}
            onChange={(e) => setCredentials({ ...credentials, nouveau_nom_utilisateur: e.target.value })}
            placeholder={membre.nom_utilisateur || "Laisser vide pour ne pas changer"}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nouveau mot de passe</label>
            <Input
              type="password"
              value={credentials.nouveau_mot_de_passe}
              onChange={(e) => setCredentials({ ...credentials, nouveau_mot_de_passe: e.target.value })}
              placeholder="••••••"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmer</label>
            <Input
              type="password"
              value={credentials.confirmer_mot_de_passe}
              onChange={(e) => setCredentials({ ...credentials, confirmer_mot_de_passe: e.target.value })}
              placeholder="••••••"
            />
          </div>
        </div>
        <Button onClick={handleSaveCredentials} disabled={savingCreds} variant="outline">
          {savingCreds ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Mettre à jour
        </Button>
      </div>
    </div>
  );
}