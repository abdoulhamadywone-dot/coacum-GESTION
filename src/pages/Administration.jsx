import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import {
  UserPlus, Shield, ShieldOff, Users, Lock, TrendingUp, Calendar, Newspaper, Wallet,
  Bot, Sparkles, Send, RefreshCw, Activity, FileText, Layers, ArrowUpRight,
  MessageCircle, Brain, Target, Database, BarChart3
} from "lucide-react";
import ChatMessageBubble from "@/components/ChatMessageBubble";

const MOIS_NUMS = { JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,AOÛT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12 };

export default function Administration() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInitError, setChatInitError] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(null);
  const bottomRef = useRef(null);

  // Fetch all data
  const { data: users = [], refetch, isPending: uP } = useQuery({ queryKey: ["users-admin"], queryFn: () => base44.entities.User.list(), enabled: isAdmin });
  const { data: membres = [], isPending: mP } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list(), enabled: isAdmin });
  const { data: cotisations = [], isPending: cP } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list(), enabled: isAdmin });
  const { data: depenses = [], isPending: dP } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list(), enabled: isAdmin });
  const { data: evenements = [], isPending: eP } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list(), enabled: isAdmin });
  const { data: articles = [], isPending: aP } = useQuery({ queryKey: ["articles"], queryFn: () => base44.entities.Article.list(), enabled: isAdmin });
  const { data: participations = [], isPending: pP } = useQuery({ queryKey: ["participations"], queryFn: () => base44.entities.Participation.list(), enabled: isAdmin });
  const dataLoading = uP || mP || cP || dP || eP || aP || pP;

  // Lazy init agent chat — only when admin opens the chat section
  useEffect(() => {
    if (!isAdmin || !chatReady || conversation || chatInitError) return;
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "coacum_assistant",
          metadata: { name: "Admin Training Session" },
        });
        setConversation(conv);
      } catch (err) {
        setChatInitError(err.message || "Erreur de connexion");
      }
    };
    init();
  }, [isAdmin, chatReady]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setChatMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !conversation || chatSending) return;
    setChatInput("");
    setChatSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } finally {
      setChatSending(false);
    }
  };

  const resetChat = async () => {
    setChatInitError(null);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "coacum_assistant",
        metadata: { name: "Admin Training Session" },
      });
      setConversation(conv);
      setChatMessages([]);
    } catch (err) {
      setChatInitError(err.message || "Erreur de connexion");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-8">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground max-w-sm">
          Cette page est réservée aux administrateurs. Contactez un administrateur pour obtenir les droits nécessaires.
        </p>
      </div>
    );
  }

  const toggleRole = async (u) => {
    if (u.id === user?.id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle");
      return;
    }
    setRoleLoading(u.id);
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await base44.entities.User.update(u.id, { role: newRole });
      toast.success(`${u.full_name || u.email} est maintenant ${newRole === "admin" ? "administrateur" : "membre"}`);
      refetch();
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de rôle");
    } finally {
      setRoleLoading(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), "admin");
      toast.success(`Invitation envoyée à ${email}`);
      setEmail("");
      refetch();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const admins = users.filter(u => u.role === "admin");
  const regularUsers = users.filter(u => u.role !== "admin");
  const membresActifs = membres.filter(m => m.statut === "actif").length;
  const totalCotisations = cotisations.reduce((s, c) => s + (c.montant || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const solde = totalCotisations - totalDepenses;
  const evenementsPlanifies = evenements.filter(e => e.statut === "planifié").length;
  const articlesPublies = articles.filter(a => a.statut === "publié").length;

  // Progress: monthly completion rate
  const allCols = [...new Set(cotisations.map(c => {
    const mNorm = (c.mois || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${mNorm}|${c.annee}`;
  }))].sort((a, b) => {
    const [ma, ya] = a.split("|"), [mb, yb] = b.split("|");
    return (parseInt(yb) * 100 + (MOIS_NUMS[mb] || 0)) - (parseInt(ya) * 100 + (MOIS_NUMS[ma] || 0));
  }).slice(0, 6);

  const paidByMonth = {};
  allCols.forEach(col => {
    const paidCount = cotisations.filter(c => {
      const mNorm = (c.mois || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return `${mNorm}|${c.annee}` === col;
    }).length;
    const [mois, an] = col.split("|");
    paidByMonth[col] = { mois: (mois || "").slice(0, 3), annee: an?.slice(2), paidCount, rate: membresActifs > 0 ? Math.round((paidCount / membresActifs) * 100) : 0 };
  });

  // Participation stats
  const presentCount = participations.filter(p => p.statut === "présent").length;
  const absentCount = participations.filter(p => p.statut === "absent").length;
  const totalParticipations = participations.length;
  const participationRate = totalParticipations > 0 ? Math.round((presentCount / totalParticipations) * 100) : 0;

  // Entity totals
  const entityStats = [
    { label: "Membres", value: membres.length, active: membresActifs, icon: Users, color: "from-blue-500 to-blue-600", href: "/membres" },
    { label: "Événements", value: evenements.length, active: evenementsPlanifies, icon: Calendar, color: "from-amber-500 to-orange-600", href: "/evenements" },
    { label: "Articles", value: articles.length, active: articlesPublies, icon: Newspaper, color: "from-emerald-500 to-teal-600", href: "/articles-admin" },
    { label: "Cotisations", value: cotisations.length, active: totalCotisations, icon: Wallet, color: "from-violet-500 to-purple-600", href: "/cotisations" },
  ];

  if (dataLoading && users.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tableau de bord administrateur — supervision complète de l'application</p>
        </div>
      </div>

      {/* Entity stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {entityStats.map(s => (
          <Link key={s.label} to={s.href} className="bg-card rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.label}
              {s.label === "Cotisations" ? ` — ${s.active.toLocaleString()} MRU` : ` · ${s.active} actif${s.active > 1 ? "s" : ""}`}
            </p>
          </Link>
        ))}
      </div>

      {/* Progress + Solde */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Progress: taux de cotisation par mois */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-amber-500" /> Taux de cotisation mensuel
          </h3>
          {Object.values(paidByMonth).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(paidByMonth).slice(-4).reverse().map(([key, data]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{data.mois} {data.annee}</span>
                    <span className={`font-bold ${data.rate >= 80 ? "text-emerald-600" : data.rate >= 50 ? "text-amber-600" : "text-red-600"}`}>{data.rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${data.rate >= 80 ? "bg-emerald-500" : data.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{data.paidCount} / {membresActifs} membres</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participation globale */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-emerald-500" /> Participation aux événements
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Taux de présence</span>
                <span className="font-bold text-emerald-600">{participationRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${participationRate}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <span className="text-emerald-600 font-medium">{presentCount} présents</span>
                <span className="text-muted-foreground">{absentCount} absents</span>
                <span className="text-muted-foreground">{totalParticipations} total</span>
              </div>
            </div>
            <div className="w-20 h-20 rounded-full border-4 border-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-emerald-600">{participationRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users section + Invite */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Users list */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Utilisateurs ({users.length})</h2>
            </div>
            <span className="text-xs text-muted-foreground">{admins.length} admin{admins.length > 1 ? "s" : ""} · {regularUsers.length} membre{regularUsers.length > 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {users.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Aucun utilisateur</p>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${u.role === "admin" ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name || "Sans nom"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.role === "admin" ? "Admin" : "Membre"}
                    </span>
                    {u.id !== user?.id && (
                      <Button
                        size="sm"
                        variant={u.role === "admin" ? "outline" : "default"}
                        disabled={roleLoading === u.id}
                        onClick={() => toggleRole(u)}
                        className="h-7 px-2 text-[10px] gap-1"
                      >
                        {roleLoading === u.id ? "..." : u.role === "admin" ? (
                          <><ShieldOff className="h-3 w-3" /> Rétrograder</>
                        ) : (
                          <><Shield className="h-3 w-3" /> Admin</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite + Quick info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Inviter</h2>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" disabled={loading} className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                {loading ? "Envoi..." : "Inviter un admin"}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2">L'invité recevra un email pour créer son compte administrateur.</p>
          </div>

          {/* Resources summary */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-violet-500" /> Ressources
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "Dépenses totales", value: `${totalDepenses.toLocaleString()} MRU` },
                { label: "Articles publiés", value: articlesPublies },
                { label: "Solde", value: `${solde >= 0 ? "+" : "-"}${Math.abs(solde).toLocaleString()} MRU`, color: solde >= 0 ? "text-emerald-600" : "text-red-600" },
                { label: "Brouillons", value: articles.length - articlesPublies },
                { label: "Événements terminés", value: evenements.filter(e => e.statut === "terminé").length },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-semibold ${r.color || "text-foreground"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Training Chat */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                Entraîner l'agent IA <Sparkles className="h-3 w-3 text-amber-500" />
              </h2>
              <p className="text-[10px] text-muted-foreground">Discutez avec l'assistant pour améliorer ses réponses et sa connaissance de l'association</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Nouvelle session
          </Button>
        </div>

        <div className="flex flex-col" style={{ height: "400px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!chatReady ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Brain className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  Cliquez pour démarrer une session d'entraînement avec l'assistant IA.
                </p>
                <Button onClick={() => setChatReady(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Démarrer
                </Button>
              </div>
            ) : chatInitError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Assistant indisponible</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    {chatInitError.includes("limit") || chatInitError.includes("plan")
                      ? "Le quota mensuel de l'assistant IA est atteint. Veuillez mettre à niveau votre plan."
                      : chatInitError}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetChat}>Réessayer</Button>
              </div>
            ) : chatMessages.length === 0 || chatMessages.every(m => m.role === "user" && m.content?.startsWith("[SYSTÈME]")) ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Bot className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  Posez une question, donnez des instructions ou corrigez l'assistant pour améliorer son comportement futur.
                </p>
              </div>
            ) : (
              <>
                {chatMessages.filter(m => m.role !== "user" || !m.content?.startsWith("[SYSTÈME]")).map((msg, i) => (
                  <ChatMessageBubble key={i} message={msg} />
                ))}
                {chatSending && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-muted rounded-xl px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex gap-2" style={{ opacity: chatReady && !chatInitError ? 1 : 0.5, pointerEvents: chatReady && !chatInitError ? "auto" : "none" }}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Donnez des instructions à l'assistant..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[40px] max-h-24"
              />
              <Button onClick={sendChat} disabled={!chatInput.trim() || chatSending || !conversation} className="rounded-xl h-10 w-10 p-0 bg-amber-500 hover:bg-amber-600 flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}