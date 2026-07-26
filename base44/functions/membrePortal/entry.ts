import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // --- LOGIN ---
    if (action === "login") {
      const { nom_utilisateur, mot_de_passe } = body;
      if (!nom_utilisateur || !mot_de_passe) {
        return Response.json({ error: "Identifiants manquants" }, { status: 400 });
      }
      const membres = await base44.asServiceRole.entities.Membre.filter({ nom_utilisateur });
      const membre = membres[0];
      if (!membre || !membre.mot_de_passe || membre.mot_de_passe !== mot_de_passe) {
        return Response.json({ error: "Identifiants incorrects" }, { status: 401 });
      }
      const { mot_de_passe: _, ...membreData } = membre;
      return Response.json({ success: true, membre: membreData });
    }

    // --- GET PROFILS (public, for network page) ---
    if (action === "get_profils") {
      const membres = await base44.asServiceRole.entities.Membre.filter({ statut: "actif" });
      const profils = membres.map(m => ({
        id: m.id,
        nom: m.nom,
        nom_utilisateur: m.nom_utilisateur,
        photo_profil: m.photo_profil,
        photo_couverture: m.photo_couverture,
        statut_perso: m.statut_perso,
        description: m.description
      }));
      return Response.json({ success: true, profils });
    }

    // --- GET FULL PROFIL (public, for network page) ---
    if (action === "get_profil") {
      const { membre_id } = body;
      if (!membre_id) {
        return Response.json({ error: "ID membre manquant" }, { status: 400 });
      }
      const membre = await base44.asServiceRole.entities.Membre.get(membre_id);
      if (!membre || membre.statut !== "actif") {
        return Response.json({ error: "Membre introuvable" }, { status: 404 });
      }
      const publications = await base44.asServiceRole.entities.Publication.filter(
        { membre_id },
        "-created_date",
        100
      );
      return Response.json({
        success: true,
        profil: {
          id: membre.id,
          nom: membre.nom,
          nom_utilisateur: membre.nom_utilisateur,
          photo_profil: membre.photo_profil,
          photo_couverture: membre.photo_couverture,
          statut_perso: membre.statut_perso,
          description: membre.description,
          date_adhesion: membre.date_adhesion,
        },
        publications,
      });
    }

    // --- VALIDATE MEMBER FOR ALL OTHER ACTIONS ---
    const { membre_id, mot_de_passe } = body;
    if (!membre_id || !mot_de_passe) {
      return Response.json({ error: "Authentification requise" }, { status: 401 });
    }
    const membre = await base44.asServiceRole.entities.Membre.get(membre_id);
    if (!membre || !membre.mot_de_passe || membre.mot_de_passe !== mot_de_passe) {
      return Response.json({ error: "Authentification échouée" }, { status: 401 });
    }

    // --- UPDATE PROFIL ---
    if (action === "update_profil") {
      const { photo_profil, photo_couverture, statut_perso, description } = body;
      await base44.asServiceRole.entities.Membre.update(membre_id, {
        photo_profil: photo_profil ?? membre.photo_profil,
        photo_couverture: photo_couverture ?? membre.photo_couverture,
        statut_perso: statut_perso ?? membre.statut_perso,
        description: description ?? membre.description
      });
      return Response.json({ success: true });
    }

    // --- CHANGE CREDENTIALS ---
    if (action === "change_credentials") {
      const { nouveau_nom_utilisateur, nouveau_mot_de_passe } = body;
      if (!nouveau_nom_utilisateur && !nouveau_mot_de_passe) {
        return Response.json({ error: "Rien à modifier" }, { status: 400 });
      }
      const updateData: Record<string, string> = {};
      if (nouveau_nom_utilisateur) {
        // Check username uniqueness
        const existing = await base44.asServiceRole.entities.Membre.filter({ nom_utilisateur: nouveau_nom_utilisateur });
        if (existing.length > 0 && existing[0].id !== membre_id) {
          return Response.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
        }
        updateData.nom_utilisateur = nouveau_nom_utilisateur;
      }
      if (nouveau_mot_de_passe) updateData.mot_de_passe = nouveau_mot_de_passe;
      await base44.asServiceRole.entities.Membre.update(membre_id, updateData);
      return Response.json({ success: true });
    }

    // --- CREATE PUBLICATION ---
    if (action === "create_publication") {
      const { titre, contenu, image_url } = body;
      if (!titre && !contenu && !image_url) {
        return Response.json({ error: "Contenu manquant" }, { status: 400 });
      }
      const pub = await base44.asServiceRole.entities.Publication.create({
        titre: titre || "",
        contenu: contenu || "",
        image_url: image_url || "",
        membre_id,
        membre_nom: membre.nom,
        membre_photo: membre.photo_profil || ""
      });
      return Response.json({ success: true, publication: pub });
    }

    // --- DELETE PUBLICATION ---
    if (action === "delete_publication") {
      const { publication_id } = body;
      if (!publication_id) {
        return Response.json({ error: "ID publication manquant" }, { status: 400 });
      }
      const pub = await base44.asServiceRole.entities.Publication.get(publication_id);
      if (!pub || pub.membre_id !== membre_id) {
        return Response.json({ error: "Publication non trouvée" }, { status: 404 });
      }
      await base44.asServiceRole.entities.Publication.delete(publication_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}