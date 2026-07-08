import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Bot, Send, Sparkles, RefreshCw, Minimize2 } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ExportPDF from "@/components/ExportPDF";

const SUGGESTIONS = [
  "Membres en retard de cotisation ?",
  "Quel est le solde financier ?",
  "Prochains événements ?",
  "Nombre de membres actifs ?",
];

export default function AssistantBubble() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(true); // notification badge
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initError, setInitError] = useState(null);
  const bottomRef = useRef(null);

  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });

  // Lazy init conversation — only when user opens the chat (saves integration credits)
  useEffect(() => {
    if (!open || !user || conversation || initError) return;
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "coacum_assistant",
          metadata: { name: `Session de ${user.full_name || "Membre"}` },
        });
        await base44.agents.addMessage(conv, {
          role: "user",
          content: `[SYSTÈME] Utilisateur connecté : ${user.full_name || "Inconnu"} — Rôle : ${user.role || "user"}. Applique les règles de sécurité correspondantes.`,
        });
        setConversation(conv);
      } catch (err) {
        setInitError(err.message || "Erreur de connexion à l'assistant");
      }
    };
    init();
  }, [open, user?.id]);

  // Subscribe to updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
    });
    return unsubscribe;
  }, [conversation?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const openChat = () => {
    setOpen(true);
    setHasNew(false);
  };

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || !conversation || sending) return;
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } finally {
      setSending(false);
    }
  };

  const resetConversation = async () => {
    setInitError(null);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "coacum_assistant",
        metadata: { name: `Session de ${user?.full_name || "Membre"}` },
      });
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `[SYSTÈME] Utilisateur connecté : ${user?.full_name || "Inconnu"} — Rôle : ${user?.role || "user"}. Applique les règles de sécurité correspondantes.`,
      });
      setConversation(conv);
      setMessages([]);
    } catch (err) {
      setInitError(err.message || "Erreur de connexion à l'assistant");
    }
  };

  const isThinking = sending || (messages.length > 0 && messages[messages.length - 1]?.role === "user");

  // Filter out system messages for display
  const visibleMessages = messages.filter(m => !m.content?.startsWith("[SYSTÈME]"));

  // Ne pas afficher sur la page assistant dédiée
  if (location.pathname === "/assistant") return null;

  return (
    <>
      {/* Floating bubble button */}
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-200 amber-glow"
          aria-label="Ouvrir l'assistant"
        >
          <Bot className="h-6 w-6 text-white" />
          {hasNew && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-md">
              1
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-300">

          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1">
                  Assistant COACUM <Sparkles className="h-3 w-3" />
                </p>
                <span className="text-[10px] text-white/80">
                  {isAdmin ? "🔓 Admin" : "🔒 Lecture seule"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && <ExportPDF cotisations={cotisations} depenses={depenses} membres={membres} compact />}
              <button
                onClick={resetConversation}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Nouvelle session"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Fermer"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {initError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Assistant indisponible</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    {initError.includes("limit") || initError.includes("plan")
                      ? "Le quota mensuel de l'assistant IA est atteint. Veuillez mettre à niveau votre plan."
                      : initError}
                  </p>
                </div>
                <button onClick={resetConversation} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                  Réessayer
                </button>
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Bonjour, {user?.full_name?.split(" ")[0] || "Membre"} ! 👋</p>
                  <p className="text-xs text-muted-foreground mt-1">Comment puis-je vous aider ?</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 w-full">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-xs px-3 py-2 rounded-xl border border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {visibleMessages.map((msg, i) => (
                  <ChatMessageBubble key={i} message={msg} />
                ))}
                {isThinking && visibleMessages[visibleMessages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-white dark:bg-card border border-border rounded-2xl px-3 py-2 shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-border bg-card/80">
            <div className="flex gap-2 items-end">
              <AudioRecorder onTranscription={(text) => sendMessage(text)} disabled={sending || !conversation} />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Question ou message vocal 🎙️..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground min-h-[38px] max-h-24"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending || !conversation}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}