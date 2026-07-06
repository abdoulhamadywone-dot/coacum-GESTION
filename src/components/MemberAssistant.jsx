import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Bot, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import ChatMessageBubble from "@/components/ChatMessageBubble";

const SUGGESTIONS = [
  "Marquer toutes les cotisations impayées de ce membre comme payées",
  "Quelles sont les cotisations en retard de ce membre ?",
  "Ajouter une cotisation pour le mois en cours",
  "Quel est le total dû par ce membre ?",
];

export default function MemberAssistant({ membre, cotisations, onDataChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initError, setInitError] = useState(null);
  const bottomRef = useRef(null);
  const pendingMessage = useRef(null);

  const membreCots = cotisations.filter(c => c.membre_nom === membre.nom);
  const totalPaye = membreCots.reduce((s, c) => s + (c.montant || 0), 0);

  const initConversation = async () => {
    setInitError(null);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "coacum_assistant",
        metadata: { name: `Profil: ${membre.nom}` },
      });

      const contextLines = [
        `[CONTEXTE MEMBRE] Tu es sur le profil d'un membre spécifique.`,
        `Nom: ${membre.nom}`,
        `ID: ${membre.id}`,
        `Statut: ${membre.statut || "actif"}`,
        `Téléphone: ${membre.telephone || "non renseigné"}`,
        `Date d'adhésion: ${membre.date_adhesion || "non renseignée"}`,
        `Total cotisations payées: ${totalPaye} MRU`,
        `Nombre de cotisations: ${membreCots.length}`,
        `Cotisations: ${membreCots.map(c => `${c.mois} ${c.annee} (${c.montant} MRU, ${c.paye ? "payé" : "impayé"})`).join(", ") || "aucune"}`,
        `[INSTRUCTION] L'admin veut gérer les cotisations et les dûs de CE membre précisément. Utilise toujours membre_id="${membre.id}" et membre_nom="${membre.nom}" pour toute opération sur les cotisations.`,
      ];

      await base44.agents.addMessage(conv, { role: "user", content: contextLines.join("\n") });
      setConversation(conv);

      // If user typed/sent a message while initializing, send it now
      if (pendingMessage.current) {
        const msg = pendingMessage.current;
        pendingMessage.current = null;
        await base44.agents.addMessage(conv, { role: "user", content: msg });
      }
    } catch (err) {
      setInitError(err.message || "Erreur de connexion à l'assistant");
    }
  };

  useEffect(() => {
    if (expanded && !conversation && !initError) {
      initConversation();
    }
  }, [expanded]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  const prevToolCount = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect when the agent completes write operations (create/update/delete on entities)
  useEffect(() => {
    if (!onDataChanged || !messages.length) return;
    const allToolCalls = messages.flatMap(m => m.tool_calls || []);
    const completedWrites = allToolCalls.filter(
      tc => ["success", "completed"].includes(tc.status) &&
        tc.name && /entities\.(Cotisation|Membre|Depense|Participation|Evenement)\.(create|update|delete|bulkCreate|bulkUpdate|updateMany|deleteMany)/i.test(tc.name)
    );
    if (completedWrites.length > prevToolCount.current) {
      prevToolCount.current = completedWrites.length;
      onDataChanged();
    }
  }, [messages, onDataChanged]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || sending) return;
    setInput("");
    // Queue the message if conversation isn't ready yet
    if (!conversation) {
      pendingMessage.current = content;
      setSending(true);
      return;
    }
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    setConversation(null);
    setMessages([]);
    setInitError(null);
    await initConversation();
  };

  const visibleMessages = messages.filter(m => !(m.role === "user" && m.content?.startsWith("[CONTEXTE")));

  const isThinking = sending || (visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1]?.role === "user");

  return (
    <div className="bg-card border border-amber-200 dark:border-amber-800/40 rounded-2xl overflow-hidden shadow-sm">
      {/* Header / Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Assistant IA <Sparkles className="h-3 w-3 text-amber-500" />
            </p>
            <p className="text-[11px] text-muted-foreground">Gérer les cotisations de {membre.nom}</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="flex flex-col" style={{ height: "420px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {initError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Assistant indisponible</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    {initError.includes("limit") || initError.includes("plan")
                      ? "Le quota mensuel de l'assistant IA est atteint."
                      : initError}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>Réessayer</Button>
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                  Posez une question ou utilisez une suggestion pour gérer les cotisations de {membre.nom}.
                </p>
                <div className="grid grid-cols-1 gap-1.5 w-full max-w-[280px]">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-[11px] px-3 py-2 rounded-lg border border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {visibleMessages.map((msg, i) => <ChatMessageBubble key={i} message={msg} />)}
                {isThinking && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border bg-muted/20">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Gérer les cotisations de ${membre.nom}...`}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground min-h-[40px] max-h-24"
                style={{ height: "auto" }}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="rounded-xl h-10 w-10 p-0 bg-amber-500 hover:bg-amber-600 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={reset} className="h-10 w-10 flex-shrink-0" title="Nouvelle session">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}