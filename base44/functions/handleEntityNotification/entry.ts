import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!event || !event.entity_name) {
      return Response.json({ error: "Missing event data" }, { status: 400 });
    }

    let notification = null;

    if (event.entity_name === "Article") {
      if (data?.statut !== "publié") {
        return Response.json({ success: true, skipped: true });
      }
      if (event.type === "update" && old_data?.statut === "publié") {
        return Response.json({ success: true, skipped: true });
      }
      notification = {
        titre: "📰 Nouvel article publié",
        contenu: data.titre || "Consultez les actualités",
        type: "article",
        target_role: "all",
        link: "/articles"
      };
    } else if (event.entity_name === "Evenement") {
      notification = {
        titre: "📅 Nouvel événement",
        contenu: data?.titre || "Un nouvel événement a été planifié",
        type: "evenement",
        target_role: "all",
        link: "/evenements"
      };
    } else if (event.entity_name === "MessageAdmin") {
      const preview = data?.contenu ? data.contenu.substring(0, 60) : "Message vocal";
      notification = {
        titre: "💬 Nouveau message admin",
        contenu: `${data?.auteur_nom || "Admin"}: ${preview}`,
        type: "message",
        target_role: "admin",
        link: ""
      };
    }

    if (notification) {
      await base44.asServiceRole.entities.Notification.create(notification);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});