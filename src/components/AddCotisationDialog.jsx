import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function AddCotisationDialog({ membre }) {
  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState(MOIS[new Date().getMonth()]);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [montant, setMontant] = useState("50");
  const [paye, setPaye] = useState(true);
  const queryClient = useQueryClient();

  const createCotisation = useMutation({
    mutationFn: (data) => base44.entities.Cotisation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotisations"] });
      toast.success("Cotisation ajoutée avec succès");
      setOpen(false);
      setMontant("50");
      setPaye(true);
    },
    onError: (err) => toast.error(err.message || "Erreur lors de l'ajout"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createCotisation.mutate({
      membre_id: membre.id,
      membre_nom: membre.nom,
      mois,
      annee: parseInt(annee),
      montant: parseFloat(montant),
      paye,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une cotisation — {membre.nom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Mois</label>
              <Select value={mois} onValueChange={setMois}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Année</label>
              <Input type="number" value={annee} onChange={e => setAnnee(e.target.value)} min="2000" max="2100" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Montant (MRU)</label>
            <Input type="number" value={montant} onChange={e => setMontant(e.target.value)} min="0" step="1" required />
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
          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createCotisation.isPending}>
            {createCotisation.isPending ? "Ajout en cours..." : "Ajouter la cotisation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}