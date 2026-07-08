import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, X, Send } from "lucide-react";

export default function AdminChatBubble() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const { data: initialMessages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => base44.entities.MessageAdmin.list("-created_date", 200),
    enabled: isAdmin && open,
  });

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin || !open) return;
    const unsub = base44.entities.MessageAdmin.subscribe((event) => {
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });
    return unsub;
  }, [isAdmin, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (contenu) =>
      base44.entities.MessageAdmin.create({
        contenu,
        auteur_nom: user?.full_name || user?.email || "Admin",
        auteur_id: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
  };

  if (!isAdmin) return null;

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const avatarColor = (name) => {
    const colors = [
      "from-amber-500 to-orange-600",
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-teal-600",
      "from-violet-500 to-purple-600",
      "from-rose-500 to-pink-600",
      "from-cyan-500 to-sky-600",
    ];
    const idx = (name || "").charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-36 right-4 sm:bottom-40 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group"
          title="Discussion entre admins"
        >
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-6 sm:w-96 sm:h-[32rem] z-50 flex flex-col bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Discussion Admins</h3>
                <p className="text-[10px] opacity-80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                  Espace privé · {messages.length} message{messages.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun message pour l'instant</p>
                <p className="text-xs text-muted-foreground">Lancez la conversation !</p>
              </div>
            ) : (
              [...messages].reverse().map((msg) => {
                const isMe = msg.auteur_id === user?.id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(msg.auteur_nom)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {(msg.auteur_nom || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      {!isMe && (
                        <span className="text-[10px] font-medium text-muted-foreground ml-1 mb-0.5">{msg.auteur_nom}</span>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          isMe
                            ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.contenu}
                        <span className={`text-[9px] ml-1.5 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Écrire un message..."
                className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}