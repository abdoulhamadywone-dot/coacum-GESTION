import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, MapPin, CalendarDays, Clock, Users, UserPlus, UserCheck, UserX, X, MessageCircle, ChevronDown, LayoutGrid, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import EventCalendar from "@/components/EventCalendar";

const STATUT_CONFIG = {
  planifié: { label: "Planifié", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", border: "border-l-blue-400", gradient: "from-blue-500 to-indigo-600" },
  en_cours: { label: "En cours", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-400", gradient: "from-amber-500 to-orange-600" },
  terminé: { label: "Terminé", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", border: "border-l-emerald-400", gradient: "from-emerald-500 to-teal-600" },
  annulé: { label: "Annulé", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", border: "border-l-red-400", gradient: "from-red-500 to-rose-600" },
};

function getCountdown(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return "Demain";
  return `Dans ${diff} jours`;
}

export default function Evenements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" });
  const [filterStatut, setFilterStatut] = useState("all");
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [modeEnvoi, setModeEnvoi] = useState(null); // null | 'whatsapp' | 'contact'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'calendar'

  const { data: evenements = [], isLoading } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });
  const { data: participations = [] } = useQuery({ queryKey: ["participations"], queryFn: () => base44.entities.Participation.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list(), enabled: isAdmin });

  const createEvt = useMutation({ mutationFn: (d) => base44.entities.Evenement.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); toast.success("Événement créé"); } });
  const updateEvt = useMutation({ mutationFn: ({ id, data }) => base44.entities.Evenement.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDialogOpen(false); setEditing(null); toast.success("Événement modifié"); } });
  const deleteEvt = useMutation({ mutationFn: (id) => base44.entities.Evenement.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evenements"] }); setDeleteId(null); toast.success("Événement supprimé"); } });

  const createParticipation = useMutation({ mutationFn: (d) => base44.entities.Participation.create(d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["participations"] }) });
  const deleteParticipation = useMutation({ mutationFn: (id) => base44.entities.Participation.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["participations"] }) });
  const updateParticipation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Participation.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["participations"] }) });

  const openCreate = () => { setEditing(null); setForm({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", statut: "planifié", notes: "" }); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ titre: e.titre, description: e.description||"", date_debut: e.date_debut||"", date_fin: e.date_fin||"", lieu: e.lieu||"", statut: e.statut||"planifié", notes: e.notes||"" }); setDialogOpen(true); };
  const handleSubmit = (e) => { e.preventDefault(); if (!form.titre.trim()) return; if (editing) updateEvt.mutate({ id: editing.id, data: form }); else createEvt.mutate(form); };

  const filtered = filterStatut === "all" ? evenements : evenements.filter(e => e.statut === filterStatut);
  const statusCounts = Object.fromEntries(Object.keys(STATUT_CONFIG).map(k => [k, evenements.filter(e => e.statut === k).length]));

  function getEventParticipations(eventId) {
    return participations.filter(p => p.evenement_id === eventId);
  }

  function formatWaLink(tel, text) {
    if (!tel) return null;
    let cleaned = tel.replace(/\D/g, "");
    if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
    return cleaned ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(text)}` : null;
  }

  function toggleMembreAttendance(eventData, membre, currentParticipation) {
    if (currentParticipation) {
      deleteParticipation.mutate(currentParticipation.id);
    } else {
      createParticipation.mutate({
        membre_id: membre.id,
        membre_nom: membre.nom,
        evenement_id: eventData.id,
        evenement_titre: eventData.titre,
        statut: "présent"
      });
    }
  }

  function changeParticipationStatut(participation, newStatut) {
    updateParticipation.mutate({ id: participation.id, data: { statut: newStatut } });
  }

  // Filter membres for attendance dialog
  const attendanceParts = attendanceEvent ? getEventParticipations(attendanceEvent.id) : [];
  const attendancePartMap = new Map(attendanceParts.map(p => [p.membre_id, p]));
  const memberSearchResults = attendanceEvent
    ? membres
        .filter(m => !attendanceSearch || m.nom.toLowerCase().includes(attendanceSearch.toLowerCase()))
        .sort((a, b) => {
          const aPres = attendancePartMap.has(a.id);
          const bPres = attendancePartMap.has(b.id);
          if (aPres && !bPres) return -1;
          if (!aPres && bPres) return 1;
          return a.nom.localeCompare(b.nom);
        })
    : [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-orange-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">COACUM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Événements</h1>
            <p className="opacity-90 mt-1 text-sm">{evenements.length} événement{evenements.length !== 1 ? 's' : ''} programmé{evenements.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && <Button onClick={openCreate} variant="secondary" className="gap-2 flex-shrink-0 shadow-md"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvel événement</span></Button>}
        </div>
      </div>

      {/* Status filter pills + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterStatut("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${filterStatut === "all" ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            Tous <span className="ml-1 text-xs opacity-70">({evenements.length})</span>
          </button>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => statusCounts[k] > 0 && (
            <button key={k} onClick={() => setFilterStatut(k)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${filterStatut === k ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {v.label} <span className="ml-1 text-xs opacity-70">({statusCounts[k]})</span>
            </button>
          ))}
        </div>
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <button onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "grid" ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> Cartes
          </button>
          <button onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "calendar" ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Calendar className="h-3.5 w-3.5" /> Calendrier
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === "calendar" ? (
        <EventCalendar events={filtered} onEventClick={(evt) => openEdit(evt)} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Aucun événement</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((evt) => {
            const cfg = STATUT_CONFIG[evt.statut] || STATUT_CONFIG.planifié;
            const countdown = evt.statut === 'planifié' ? getCountdown(evt.date_debut) : null;
            const isEnCours = evt.statut === 'en_cours';
            const evtParts = getEventParticipations(evt.id);
            const evtPresent = evtParts.filter(p => p.statut === "présent");
            const isExpanded = attendanceEvent?.id === evt.id;
            const dateObj = evt.date_debut ? new Date(evt.date_debut) : null;
            return (
              <div key={evt.id} className={`bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 group`}>
                <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />
                <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Calendar block */}
                  {dateObj && (
                    <div className={`flex-shrink-0 w-14 h-16 rounded-xl bg-gradient-to-br ${cfg.gradient} flex flex-col items-center justify-center text-white shadow-md`}>
                      <span className="text-[10px] font-bold uppercase opacity-90">{dateObj.toLocaleDateString("fr-FR", { month: "short" })}</span>
                      <span className="text-xl font-bold leading-none">{dateObj.getDate()}</span>
                      <span className="text-[9px] opacity-80 mt-0.5">{dateObj.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color} ${isEnCours ? 'relative' : ''}`}>
                        {isEnCours && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
                        {cfg.label}
                      </span>
                      {countdown && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Clock className="h-3 w-3" />{countdown}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base">{evt.titre}</h3>
                    {evt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      {evt.date_debut && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {evt.date_debut}{evt.date_fin ? ` → ${evt.date_fin}` : ""}
                        </span>
                      )}
                      {evt.lieu && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{evt.lieu}
                        </span>
                      )}
                    </div>
                    {evt.notes && <p className="text-xs text-muted-foreground/70 mt-2 italic">{evt.notes}</p>}

                    {/* Attendance summary */}
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => setAttendanceEvent(isExpanded ? null : evt)}
                          className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {evtParts.length > 0 ? (
                            <span><span className="text-emerald-600 font-bold">{evtPresent.length}</span> présents sur {evtParts.length} inscrits</span>
                          ) : (
                            <span className="text-muted-foreground/60">Aucune présence enregistrée</span>
                          )}
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setAttendanceEvent(evt)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <UserPlus className="h-3 w-3" /> Gérer
                          </button>
                        )}
                      </div>

                      {/* Expanded attendance list */}
                      {isExpanded && evtParts.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {evtParts.sort((a, b) => {
                            const order = { présent: 0, excusé: 1, absent: 2 };
                            return (order[a.statut] || 0) - (order[b.statut] || 0);
                          }).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-[11px] py-0.5">
                              <div className="flex items-center gap-1.5">
                                {p.statut === "présent" ? <UserCheck className="h-3 w-3 text-emerald-500" />
                                 : p.statut === "excusé" ? <MessageCircle className="h-3 w-3 text-amber-500" />
                                 : <UserX className="h-3 w-3 text-red-400" />}
                                <span className="font-medium text-foreground">{p.membre_nom}</span>
                                <span className="text-muted-foreground">— {p.statut}</span>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                  {["présent", "excusé", "absent"].filter(s => s !== p.statut).map(s => (
                                    <button key={s} onClick={() => changeParticipationStatut(p, s)} className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-border transition-colors text-muted-foreground">
                                      → {s}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(evt)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteId(evt.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance management dialog */}
      <Dialog open={!!attendanceEvent && modeEnvoi === null} onOpenChange={(open) => { if (!open) { setAttendanceEvent(null); setAttendanceSearch(""); setModeEnvoi(null); } }}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              {attendanceEvent?.titre}
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
              <UserCheck className="h-3 w-3 text-emerald-600" />
              <span>{attendanceParts.filter(p => p.statut === "présent").length} présents</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
              <MessageCircle className="h-3 w-3 text-amber-600" />
              <span>{attendanceParts.filter(p => p.statut === "excusé").length} excusés</span>
            </div>
            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full">
              <UserX className="h-3 w-3 text-red-500" />
              <span>{attendanceParts.filter(p => p.statut === "absent").length} absents</span>
            </div>
          </div>

          {/* Search */}
          <Input
            placeholder="Rechercher un membre..."
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
            className="text-sm"
          />

          {/* Members list */}
          <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
            {memberSearchResults.map(m => {
              const part = attendancePartMap.get(m.id);
              return (
                <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-xl transition-colors text-sm ${part ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : 'hover:bg-muted/50'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {part?.statut === "présent" ? <UserCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                     : part?.statut === "excusé" ? <MessageCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                     : part?.statut === "absent" ? <UserX className="h-4 w-4 text-red-400 flex-shrink-0" />
                     : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />}
                    <span className="font-medium truncate">{m.nom}</span>
                    {part && <span className="text-[10px] text-muted-foreground">— {part.statut}</span>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {part ? (
                      <>
                        <button
                          onClick={() => toggleMembreAttendance(attendanceEvent, m, part)}
                          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          title="Retirer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <select
                          value={part.statut}
                          onChange={(e) => changeParticipationStatut(part, e.target.value)}
                          className="text-[10px] border border-border rounded-lg px-1.5 py-0.5 bg-card"
                        >
                          <option value="présent">Présent</option>
                          <option value="excusé">Excusé</option>
                          <option value="absent">Absent</option>
                        </select>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleMembreAttendance(attendanceEvent, m, null)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium hover:bg-emerald-200 transition-colors"
                      >
                        + Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Foot with WhatsApp action */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModeEnvoi("contact")}
              className="flex-1 gap-1.5 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
              Rappeler absents WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp contact mode - participants list with send links */}
      <Dialog open={modeEnvoi === "contact"} onOpenChange={(open) => { if (!open) setModeEnvoi(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Rappeler les absents
            </DialogTitle>
          </DialogHeader>
          {attendanceEvent && (() => {
            const absentParts = attendanceParts.filter(p => p.statut !== "présent");
            if (absentParts.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-4">Tous les membres sont présents 🎉</p>;
            }
            const messageTemplate = `Bonjour, nous te rappelons l'événement "${attendanceEvent.titre}"${attendanceEvent.date_debut ? ` prévu le ${attendanceEvent.date_debut}` : ""}${attendanceEvent.lieu ? ` à ${attendanceEvent.lieu}` : ""}. Ta présence est importante ! 🙏`;
            return (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Clique sur un membre pour ouvrir WhatsApp avec un message pré-rempli :</p>
                {absentParts.map(p => {
                  const m = membres.find(mb => mb.id === p.membre_id);
                  const link = m?.telephone ? formatWaLink(m.telephone, messageTemplate) : null;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-2">
                        {p.statut === "excusé" ? <MessageCircle className="h-3.5 w-3.5 text-amber-500" /> : <UserX className="h-3.5 w-3.5 text-red-400" />}
                        <span className="text-sm font-medium">{p.membre_nom}</span>
                      </div>
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700">
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Pas de tél.</span>
                      )}
                    </div>
                  );
                })}
                <a
                  href={formatWaLink("22249161424", `Liste des absents pour "${attendanceEvent.titre}" :\n${absentParts.map(p => `- ${p.membre_nom} (${p.statut})`).join("\n")}\n\nMerci de les contacter.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button size="sm" className="w-full mt-2 gap-1.5 text-xs bg-green-500 hover:bg-green-600">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Envoyer la liste au bureau COACUM
                  </Button>
                </a>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Titre *</label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Date début</label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Date fin</label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">Lieu</label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUT_CONFIG).map(([k,v]) => (
                  <button key={k} type="button" onClick={() => setForm({...form, statut: k})}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.statut === k ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full" disabled={createEvt.isPending || updateEvt.isPending}>{editing ? "Enregistrer" : "Créer"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteEvt.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}