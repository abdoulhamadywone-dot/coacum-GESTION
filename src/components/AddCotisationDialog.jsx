import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckCheck, FileDown } from "lucide-react";
import { toast } from "sonner";
import generateRecuPDF from "@/components/RecuPDF";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function AddCotisationDialog({ membre }) {
  const [open, setOpen] = useState(false);
  const [selectedMois, setSelectedMois] = useState([]);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [montant, setMontant] = useState("50");
  const [paye, setPaye] = useState(true);
  const [lastCreated, setLastCreated] = useState(null);
  const queryClient = useQueryClient();

  const toggleMois = (mois) => {
    setSelectedMois(prev => prev.includes(mois) ? prev.filter(m => m !== mois) : [...prev, mois]);
  };

  const selectAll = () => {
    setSelectedMois(selectedMois.length === MOIS.length ? [] : [...MOIS]);
  };

  const createCotisations = useMutation({
    mutationFn: async (records) => {
      return await base44.entities.Cotisation.bulkCreate(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotisations"] });
      const count = selectedMois.length;
      const created = selectedMois.map(mois => ({ mois, annee: parseInt(annee), montant: parseFloat(montant), paye }));
      setLastCreated(created);
      toast.success(`${count} cotisation${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""} — reçu disponible`);
      setSelectedMois([]);
      setMontant("50");
      setPaye(true);
    },
    onError: (err) => toast.error(err.message || "Erreur lors de l'ajout"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMois.length === 0) {
      toast.error("Veuillez sélectionner au moins un mois");
      return;
    }
    const records = selectedMois.map(mois => ({
      membre_id: membre.id,
      membre_nom: membre.nom,
      mois,
      annee: parseInt(annee),
      montant: parseFloat(montant),
      paye,
    }));
    createCotisations.mutate(records);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des cotisations — {membre.nom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Liste des mois en cases à cocher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Mois</label>
              <button type="button" onClick={selectAll} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> {selectedMois.length === MOIS.length ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 border border-border rounded-lg p-2 max-h-48 overflow-y-auto">
              {MOIS.map(mois => (
                <label key={mois} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${selectedMois.includes(mois) ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "hover:bg-muted/50"}`}>
                  <Checkbox checked={selectedMois.includes(mois)} onCheckedChange={() => toggleMois(mois)} />
                  <span>{mois}</span>
                </label>
              ))}
            </div>
            {selectedMois.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{selectedMois.length} mois sélectionné{selectedMois.length > 1 ? "s" : ""}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Année</label>
              <Input type="number" value={annee} onChange={e => setAnnee(e.target.value)} min="2000" max="2100" required />
            </div>
            <div>
              <label className="text-sm font-medium">Montant (MRU)</label>
              <Input type="number" value={montant} onChange={e => setMontant(e.target.value)} min="0" step="1" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Statut du paiement</label>
            <Select value={paye ? "paye" : "impaye"} onValueChange={v => setPaye(v === "paye")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paye">✅ Payé</SelectItem>
                <SelectItem value="impaye">⏳ Impayé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createCotisations.isPending || selectedMois.length === 0}>
            {createCotisations.isPending
              ? "Ajout en cours..."
              : `Ajouter ${selectedMois.length > 0 ? `${selectedMois.length} cotisation${selectedMois.length > 1 ? "s" : ""}` : ""}`}
          </Button>

          {lastCreated && lastCreated.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <FileDown className="h-4 w-4 text-violet-600 flex-shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-400 flex-1">Reçu prêt à télécharger.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100"
                onClick={() => generateRecuPDF(membre, lastCreated)}
              >
                <FileDown className="h-3.5 w-3.5" /> Reçu PDF
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}