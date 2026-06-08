import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Send, Users, User, ChevronDown, ChevronUp, Search, CheckSquare, Square, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function cleanPhone(tel) {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  return d || null;
}

function buildWaLink(phone, message) {
  const num = cleanPhone(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

const TEMPLATES = [
  { label: "Rappel cotisation", text: "Bonjour {nom}, nous vous rappelons que votre cotisation COACUM est en attente. Merci de régulariser votre situation dès que possible. 🙏" },
  { label: "Invitation événement", text: "Bonjour {nom}, COACUM vous invite à son prochain événement. Votre présence est très importante pour nous ! 🎉" },
  { label: "Message personnalisé", text: "" },
];

export default function WhatsAppMessenger() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [templateIdx, setTemplateIdx] = useState(0);
  const [customText, setCustomText] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [filterNoPhone, setFilterNoPhone] = useState(false);

  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });

  // Members with retard (late on last 3 periods)
  const recentPeriods = useMemo(() => {
    const periods = [...new Set(cotisations.map(c => `${c.mois}|${c.annee}`))];
    return periods.slice(0, 3);
  }, [cotisations]);

  const retardIds = useMemo(() => {
    const paidNames = new Set(
      cotisations
        .filter(c => recentPeriods.some(p => `${c.mois}|${c.annee}` === p))
        .map(c => c.membre_nom)
    );
    return new Set(membres.filter(m => m.statut === "actif" && !paidNames.has(m.nom)).map(m => m.id));
  }, [membres, cotisations, recentPeriods]);

  const filtered = useMemo(() => {
    let list = membres.filter(m => m.statut === "actif");
    if (search) list = list.filter(m => m.nom?.toLowerCase().includes(search.toLowerCase()));
    if (filterNoPhone) list = list.filter(m => !cleanPhone(m.telephone));
    return list;
  }, [membres, search, filterNoPhone]);

  const messageText = templateIdx === 2 ? customText : TEMPLATES[templateIdx].text;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(m => m.id)));
  const selectRetard = () => setSelectedIds(new Set([...retardIds].filter(id => filtered.some(m => m.id === id))));
  const clearAll = () => setSelectedIds(new Set());

  const selectedMembers = membres.filter(m => selectedIds.has(m.id));
  const withPhone = selectedMembers.filter(m => cleanPhone(m.telephone));
  const withoutPhone = selectedMembers.filter(m => !cleanPhone(m.telephone));

  const getPersonalizedMessage = (membre) => {
    return messageText.replace(/\{nom\}/g, membre.nom.split(" ")[0]);
  };

  const openAll = () => {
    withPhone.forEach((m, i) => {
      const link = buildWaLink(m.telephone, getPersonalizedMessage(m));
      if (link) setTimeout(() => window.open(link, "_blank"), i * 500);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground">Messagerie WhatsApp</h2>
          <p className="text-xs text-muted-foreground">Envoyez des messages aux membres via WhatsApp</p>
        </div>
      </div>

      {/* Template selection */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Modèle de message</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => setTemplateIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${templateIdx === i ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {templateIdx === 2 ? (
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder="Écrivez votre message... Utilisez {nom} pour personnaliser avec le prénom du membre."
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
          />
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-sm text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
            {TEMPLATES[templateIdx].text || "—"}
          </div>
        )}
      </div>

      {/* Member selection */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={selectAll} className="px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
              <Users className="h-3 w-3" /> Tous actifs
            </button>
            <button onClick={selectRetard} className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-xs text-amber-700 dark:text-amber-400 hover:opacity-80 flex items-center gap-1">
              ⚠️ En retard ({retardIds.size})
            </button>
            <button onClick={clearAll} className="px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:bg-muted/80">
              Désélectionner
            </button>
            <button
              onClick={() => setFilterNoPhone(v => !v)}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${filterNoPhone ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              📵 Sans numéro
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-border">
          {filtered.map(m => {
            const phone = cleanPhone(m.telephone);
            const isSelected = selectedIds.has(m.id);
            const isLate = retardIds.has(m.id);
            return (
              <div
                key={m.id}
                onClick={() => toggleSelect(m.id)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-muted/30"}`}
              >
                <span className="text-muted-foreground">
                  {isSelected ? <CheckSquare className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{m.nom}</span>
                    {isLate && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">retard</span>}
                  </div>
                  {phone ? (
                    <span className="text-xs text-green-600 flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" /> {m.telephone}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pas de numéro</span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Aucun membre trouvé</p>
          )}
        </div>
      </div>

      {/* Summary & send */}
      {selectedIds.size > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{selectedIds.size} membre(s) sélectionné(s)</span>
            <span className="text-muted-foreground text-xs">
              <span className="text-green-600 font-medium">{withPhone.length} avec WhatsApp</span>
              {withoutPhone.length > 0 && <span className="text-destructive ml-2">{withoutPhone.length} sans numéro</span>}
            </span>
          </div>

          {withoutPhone.length > 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              ⚠️ Sans numéro : {withoutPhone.map(m => m.nom).join(", ")}
            </div>
          )}

          {withPhone.length > 0 && !messageText.trim() && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
              ✏️ Veuillez saisir un message avant d'envoyer.
            </div>
          )}

          {/* Individual links */}
          <button
            onClick={() => setShowLinks(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showLinks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showLinks ? "Masquer" : "Afficher"} les liens individuels
          </button>

          {showLinks && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {withPhone.map(m => {
                const link = buildWaLink(m.telephone, getPersonalizedMessage(m));
                return (
                  <a
                    key={m.id}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 transition-colors text-xs"
                  >
                    <span className="font-medium text-green-800 dark:text-green-300">{m.nom}</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <ExternalLink className="h-3 w-3" /> Ouvrir
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          <Button
            onClick={openAll}
            disabled={withPhone.length === 0 || !messageText.trim()}
            className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            <Send className="h-4 w-4" />
            Envoyer à {withPhone.length} membre(s) via WhatsApp
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Chaque conversation WhatsApp s'ouvrira avec le message pré-rempli. Vous devrez appuyer sur Envoyer dans WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}