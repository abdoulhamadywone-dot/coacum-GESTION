import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, X, Send, Mic, MicOff, Play, Pause, Trash2, Loader2 } from "lucide-react";

export default function AdminChatBubble() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioProcessing, setAudioProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

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

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageAdmin.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageAdmin.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  const handleSendText = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate({
      contenu: text,
      auteur_nom: user?.full_name || user?.email || "Admin",
      auteur_id: user?.id,
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const ext = mimeType === "audio/mp4" ? "m4a" : "webm";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) return; // too short, ignore
        const audioFile = new File([audioBlob], `message_vocal.${ext}`, { type: mimeType });
        setAudioProcessing(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
          sendMutation.mutate({
            contenu: "🎵 Message vocal",
            auteur_nom: user?.full_name || user?.email || "Admin",
            auteur_id: user?.id,
            audio_url: file_url,
          });
        } catch (err) {
          console.error("Erreur upload audio:", err);
        } finally {
          setAudioProcessing(false);
        }
      };

      recorder.start(500); // collect chunks every 500ms during recording
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 120) { // max 2 min
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      alert("Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres du navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null; // prevent upload
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  if (!isAdmin) return null;

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
      {/* Floating button — large & visible on mobile */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-36 right-4 sm:bottom-40 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group"
          title="Discussion entre admins"
        >
          <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background flex items-center justify-center">
            <span className="w-2 h-2 bg-green-600 rounded-full" />
          </span>
          <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-6 sm:w-96 sm:h-[34rem] z-50 flex flex-col bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex-shrink-0">
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
              [...messages].reverse().map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  isMe={msg.auteur_id === user?.id}
                  avatarColor={avatarColor}
                  formatTime={formatTime}
                  onDelete={() => deleteMutation.mutate(msg.id)}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Recording overlay */}
          {isRecording && (
            <div className="px-3 py-2.5 border-t border-border bg-red-50 dark:bg-red-950/20 flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-shrink-0">
                {formatDuration(recordingTime)}
              </span>
              <div className="flex-1 text-xs text-red-500 dark:text-red-400 text-center">
                Enregistrement en cours...
              </div>
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0"
              >
                Annuler
              </button>
              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Audio processing overlay */}
          {audioProcessing && (
            <div className="px-3 py-3 border-t border-border bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
              <span className="text-sm text-amber-600 dark:text-amber-400">Traitement du message vocal...</span>
            </div>
          )}

          {/* Input */}
          {!isRecording && !audioProcessing && (
            <div className="px-3 py-2.5 border-t border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                  placeholder="Écrire un message..."
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-0"
                />
                {input.trim() ? (
                  <button
                    onClick={handleSendText}
                    disabled={sendMutation.isPending}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0"
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-600 flex items-center justify-center transition-all flex-shrink-0"
                    title="Message vocal"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// --- Audio player sub-component ---
function AudioPlayer({ url, isMe }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isMe ? "bg-white/20 hover:bg-white/30" : "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50"
        }`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
        <div className="flex items-center gap-0.5 h-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full ${isMe ? "bg-white/40" : "bg-amber-300 dark:bg-amber-700"}`}
              style={{ height: `${30 + Math.sin(i * 0.5) * 40 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Message row ---
function MessageRow({ msg, isMe, avatarColor, formatTime, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const isAudio = !!msg.audio_url;

  return (
    <div
      className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {!isMe && (
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(msg.auteur_nom)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
          {(msg.auteur_nom || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col relative group`}>
        {!isMe && (
          <span className="text-[10px] font-medium text-muted-foreground ml-1 mb-0.5">{msg.auteur_nom}</span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm break-words ${
            isMe
              ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-md"
              : "bg-card border border-border text-foreground rounded-bl-md"
          } ${isAudio ? "min-w-[180px]" : ""}`}
        >
          {isAudio ? (
            <>
              <AudioPlayer url={msg.audio_url} isMe={isMe} />
              {msg.contenu && msg.contenu !== "🎵 Message vocal" && (
                <p className={`text-xs mt-1 ${isMe ? "text-white/80" : "text-muted-foreground"}`}>{msg.contenu}</p>
              )}
            </>
          ) : (
            msg.contenu
          )}
          <span className={`text-[9px] ml-1.5 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
            {formatTime(msg.created_date)}
          </span>
        </div>
      </div>
      {isMe && showDelete && (
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded-full bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}