import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Bot, Sparkles, RefreshCw, MessageCircle, Maximize2, Minimize2, Download } from "lucide-react";
import jsPDF from "jspdf";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ExportPDF from "@/components/ExportPDF";
import AudioRecorder from "@/components/AudioRecorder";
import WhatsAppMessenger from "@/components/WhatsAppMessenger";

const SUGGESTIONS = [
  "Quel est le solde financier de l'association ?",
  "Quels sont les prochains événements ?",
  "Résume les dépenses du mois dernier",
];

export default function Assistant() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("chat");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initError, setInitError] = useState(null);
  const bottomRef = useRef(null);

  // Create conversation on mount
  useEffect(() => {
    if (!user || conversation || initError) return;
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "coacum_assistant",
          metadata: { name: `Session de ${user.full_name || "Membre"}`, user_role: user.role || "user", user_name: user.full_name || "Inconnu" },
        });
        setConversation(conv);
      } catch (err) {
        setInitError(err.message || "Erreur de connexion à l'assistant");
      }
    };
    init();
  }, [user?.id]);

  // Subscribe to updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        metadata: { name: `Session de ${user?.full_name || "Membre"}`, user_role: user?.role || "user", user_name: user?.full_name || "Inconnu" },
      });
      setConversation(conv);
      setMessages([]);
    } catch (err) {
      setInitError(err.message || "Erreur de connexion à l'assistant");
    }
  };

  const exportConversation = () => {
    const visibleMessages = messages.filter(m => m.role !== "user" || !m.content?.startsWith("[SYSTÈME]"));
    if (visibleMessages.length === 0) return;

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 18;
      const pageW = 210;
      const contentW = pageW - margin * 2;
      let y = margin;

      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, pageW, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Assistant COACUM — Conversation", margin, 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }), pageW - margin, 14, { align: "right" });
      y = 28;

      visibleMessages.forEach((msg) => {
        const isUser = msg.role === "user";
        const label = isUser ? (user?.full_name || "Vous") : "Assistant COACUM";

        doc.setFontSize(8);
        doc.setTextColor(isUser ? 37 : 245, isUser ? 99 : 158, isUser ? 235 : 11);
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", margin, y);
        y += 6;

        const text = msg.content || "";
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, contentW);
        lines.forEach((line) => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 5;
        });
        y += 3;
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 287, pageW, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Document généré par l'application COACUM", margin, 293);
        doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 293, { align: "right" });
      }

      doc.save(`COACUM_Conversation_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      // Fallback to text download
      const text = visibleMessages.map(m => {
        const who = m.role === "user" ? (user?.full_name || "Vous") : "Assistant COACUM";
        return `[${who}]\n${m.content || ""}\n`;
      }).join("\n---\n\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `COACUM_Conversation_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isThinking = sending || messages[messages.length - 1]?.role === "user";

  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[60] bg-background flex flex-col' : 'flex flex-col h-full max-h-[calc(100vh-4rem)] md:max-h-screen'}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground flex items-center gap-1.5">
              Assistant COACUM <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </h1>
            <p className="text-xs text-muted-foreground">IA connectée à votre base de données</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {isAdmin ? "🔓 Mode Admin — écriture autorisée" : "🔒 Mode Lecture seule"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isAdmin && <ExportPDF cotisations={cotisations} depenses={depenses} membres={membres} />}
          {activeTab === "chat" && (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={exportConversation} disabled={messages.filter(m => m.role !== "user" || !m.content?.startsWith("[SYSTÈME]")).length === 0} className="gap-1.5 text-xs" title="Exporter la conversation">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={resetConversation} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Nouvelle session
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8" title={isFullscreen ? "Quitter plein écran" : "Plein écran"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-border bg-card/60">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "chat" ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Bot className="h-3.5 w-3.5" /> Assistant IA
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === "whatsapp" ? "border-green-500 text-green-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </button>
        )}
      </div>

      {/* WhatsApp tab */}
      {activeTab === "whatsapp" && (
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <WhatsAppMessenger />
        </div>
      )}

      {/* Chat tab */}
      {activeTab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
            {initError ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center shadow-xl">
                  <Bot className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Assistant indisponible</h2>
                  <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                    {initError.includes("limit") || initError.includes("plan")
                      ? "Le quota mensuel de l'assistant IA est atteint. Veuillez mettre à niveau votre plan pour continuer à utiliser l'assistant."
                      : initError}
                  </p>
                </div>
                <Button variant="outline" onClick={resetConversation} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Réessayer
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Bonjour ! Je suis votre assistant COACUM</h2>
                  <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                    Posez-moi vos questions sur les membres, cotisations, dépenses ou événements de l'association.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-xs px-4 py-3 rounded-xl border border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessageBubble key={i} message={msg} />
                ))}
                {isThinking && messages[messages.length - 1]?.role !== "assistant" && (
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
          <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
              <AudioRecorder onTranscription={(text) => sendMessage(text)} disabled={sending || !conversation} />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Posez votre question ou utilisez le micro 🎙️ (pulaar / français)..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground min-h-[44px] max-h-32"
                style={{ height: "auto" }}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending || !conversation}
                className="rounded-xl h-11 w-11 p-0 bg-amber-500 hover:bg-amber-600 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              🎙️ Message vocal accepté en pulaar ou en français — L'assistant a accès aux données de l'association.
            </p>
          </div>
        </>
      )}
    </div>
  );
}