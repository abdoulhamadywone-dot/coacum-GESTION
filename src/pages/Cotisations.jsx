import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ExportPDF from "@/components/ExportPDF";

const MOIS_LIST = ["JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"];
const MOIS_NUM = { JANVIER:1, FEVRIER:2, MARS:3, AVRIL:4, MAI:5, JUIN:6, JUILLET:7, AOUT:8, AOÛT:8, SEPTEMBRE:9, OCTOBRE:10, NOVEMBRE:11, DECEMBRE:12 };
const MOIS_ABBR = { JANVIER:"Jan", FEVRIER:"Fév", MARS:"Mar", AVRIL:"Avr", MAI:"Mai", JUIN:"Jun", JUILLET:"Jul", AOUT:"Aoû", AOÛT:"Aoû", SEPTEMBRE:"Sep", OCTOBRE:"Oct", NOVEMBRE:"Nov", DECEMBRE:"Déc" };
const MOIS_FORM = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function Cotisations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filterAnnee, setFilterAnnee] = useState("all");
  const [form, setForm] = useState({ membre_nom: "", mois: "JANVIER", annee: 2025, montant: 50 });

  const { data: cotisations = [], isLoading } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });

  // Non-admin: show only their own cotisations
  const userCotisations = !isAdmin ? cotisations.filter(c => c.membre_nom === user?.full_name) : cotisations;

  const createCot = useMutation({
    mutationFn: (data) => base44.entities.Cotisation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDialogOpen(false); toast.success("Cotisation ajoutée"); },
  });
  const updateCot = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cotisation.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDialogOpen(false); setEditing(null); toast.success("Cotisation modifiée"); },
  });
  const deleteCot = useMutation({
    mutationFn: (id) => base44.entities.Cotisation.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cotisations"] }); setDeleteTarget(null); toast.success("Cotisation supprimée"); },
  });

  // Build pivot data - use restricted set for non-admin
  const displayData = !isAdmin ? userCotisations : cotisations;
  const filtered = filterAnnee === "all" ? displayData : displayData.filter(c => String(c.annee) === filterAnnee);
  const years = [...new Set(cotisations.map(c => c.annee))].sort();

  // Unique ordered month-year columns
  const colSet = new Set();
  filtered.forEach(c => {
    const moisNorm = c.mois?.toUpperCase().replace("Û","U").replace("É","E").replace("È","E").replace("Â","A") || "";
    colSet.add(`${moisNorm}|${c.annee}`);
  });
  const columns = [...colSet].sort((a, b) => {
    const [ma, ya] = a.split("|");
    const [mb, yb] = b.split("|");
    return (parseInt(ya) * 100 + (MOIS_NUM[ma] || 0)) - (parseInt(yb) * 100 + (MOIS_NUM[mb] || 0));
  });

  // Unique members who have payments in filtered set
  const memberNames = [...new Set(filtered.map(c => c.membre_nom))].sort();

  // Lookup: membre_nom -> "MOIS|ANNEE" -> cotisation record
  const lookup = {};
  filtered.forEach(c => {
    const moisNorm = c.mois?.toUpperCase().replace("Û","U").replace("É","E").replace("È","E").replace("Â","A") || "";
    const key = `${moisNorm}|${c.annee}`;
    if (!lookup[c.membre_nom]) lookup[c.membre_nom] = {};
    lookup[c.membre_nom][key] = c;
  });

  const total = filtered.reduce((s, c) => s + (c.montant || 0), 0);

  const openCreate = () => { setEditing(null); setForm({ membre_nom: "", mois: "JANVIER", annee: 2025, montant: 50 }); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ membre_nom: c.membre_nom, mois: c.mois?.toUpperCase() || "JANVIER", annee: c.annee, montant: c.montant }); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.membre_nom.trim()) return;
    if (editing) updateCot.mutate({ id: editing.id, data: { ...form, paye: true } });
    else createCot.mutate({ ...form, paye: true });
  };

  // Group columns by year for header
  const yearGroups = {};
  columns.forEach(col => {
    const [, y] = col.split("|");
    if (!yearGroups[y]) yearGroups[y] = [];
    yearGroups[y].push(col);
  });

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cotisations</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? `${memberNames.length} membres · Total : ` : `Mes paiements · Total : `}
            <span className="font-semibold text-primary">{total.toLocaleString()} MRU</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterAnnee} onValueChange={setFilterAnnee}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportPDF cotisations={displayData} depenses={[]} membres={membres.filter(m => isAdmin || m.nom === user?.full_name)} />
          {isAdmin && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : memberNames.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune cotisation trouvée</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                {/* Year group header */}
                <tr className="bg-primary/10 border-b border-border">
                  <th className="sticky left-0 z-20 bg-primary/10 p-3 text-left font-semibold text-foreground min-w-[160px]">Membre</th>
                  {Object.entries(yearGroups).map(([year, cols]) => (
                    <th key={year} colSpan={cols.length} className="p-2 text-center font-bold text-primary border-l border-border">
                      {year}
                    </th>
                  ))}
                  {isAdmin && <th className="p-2 text-center font-medium text-muted-foreground border-l border-border min-w-[60px]">Actions</th>}
                </tr>
                {/* Month header */}
                <tr className="bg-muted/50 border-b border-border">
                  <th className="sticky left-0 z-20 bg-muted/50 p-2 text-left font-medium text-muted-foreground min-w-[160px]"></th>
                  {columns.map(col => {
                    const [m] = col.split("|");
                    return (
                      <th key={col} className="p-2 text-center font-medium text-muted-foreground border-l border-border whitespace-nowrap min-w-[52px]">
                        {MOIS_ABBR[m] || m.slice(0,3)}
                      </th>
                    );
                  })}
                  {isAdmin && <th className="border-l border-border"></th>}
                </tr>
              </thead>
              <tbody>
                {memberNames.map((nom, idx) => (
                  <tr key={nom} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className={`sticky left-0 z-10 p-2 font-medium text-foreground min-w-[160px] border-r border-border ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}>
                      {nom}
                    </td>
                    {columns.map(col => {
                      const cot = lookup[nom]?.[col];
                      return (
                        <td key={col} className="p-1 text-center border-l border-border">
                          {cot ? (
                            <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold rounded px-1.5 py-0.5 text-[10px]">
                              {cot.montant}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                    {isAdmin && (
                      <td className="p-1 border-l border-border">
                        <div className="flex justify-center gap-0.5">
                          {/* Row-level actions not shown per-cell; use add button */}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-muted/40 border-t-2 border-border font-semibold">
                  <td className="sticky left-0 z-10 bg-muted/40 p-2 text-foreground border-r border-border">Total</td>
                  {columns.map(col => {
                    const colTotal = memberNames.reduce((s, nom) => s + (lookup[nom]?.[col]?.montant || 0), 0);
                    return (
                      <td key={col} className="p-1 text-center border-l border-border text-primary text-[10px] font-bold">
                        {colTotal > 0 ? colTotal : ""}
                      </td>
                    );
                  })}
                  {isAdmin && <td className="border-l border-border"></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block bg-primary/10 text-primary font-semibold rounded px-1.5 py-0.5 text-[10px]">50</span> = montant payé (MRU)</span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground/30 text-sm">—</span> = non payé</span>
      </div>

      {/* Admin: Manage individual records */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm">Gestion des paiements</h2>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-muted-foreground">Membre</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Mois</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Année</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Montant</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-medium">{c.membre_nom}</td>
                    <td className="p-2 text-muted-foreground">{c.mois}</td>
                    <td className="p-2 text-muted-foreground">{c.annee}</td>
                    <td className="p-2 text-right text-primary font-medium">{c.montant} MRU</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-muted"><Edit2 className="h-3 w-3 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la cotisation" : "Nouvelle cotisation"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Membre *</label>
              <Select value={form.membre_nom} onValueChange={(v) => setForm({ ...form, membre_nom: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
                <SelectContent>
                  {membres.map((m) => <SelectItem key={m.id} value={m.nom}>{m.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Mois</label>
                <Select value={form.mois} onValueChange={(v) => setForm({ ...form, mois: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Année</label><Input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value) })} /></div>
            </div>
            <div><label className="text-sm font-medium">Montant (MRU)</label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: parseInt(e.target.value) })} /></div>
            <Button type="submit" className="w-full" disabled={createCot.isPending || updateCot.isPending}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette cotisation ?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.membre_nom} — {deleteTarget?.mois} {deleteTarget?.annee}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCot.mutate(deleteTarget?.id)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}