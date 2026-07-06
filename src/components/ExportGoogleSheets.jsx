import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet } from "lucide-react";
import { toast } from "sonner";

const MOIS_LIST = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DECEMBRE"];
const MOIS_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MOIS_NUM = { JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,AOÛT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12 };
const SEUIL_DON = 1000;

function normMois(m) {
  return (m || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("Û", "U");
}

export default function ExportGoogleSheets({ cotisations }) {
  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState(MOIS_LIST[new Date().getMonth()]);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));

  const handleExport = () => {
    const targetMois = normMois(mois);
    const filtered = cotisations.filter(c => normMois(c.mois) === targetMois && String(c.annee) === annee);

    if (filtered.length === 0) {
      toast.error(`Aucune cotisation trouvée pour ${MOIS_LABELS[MOIS_NUM[targetMois] - 1]} ${annee}`);
      return;
    }

    const cots = filtered.filter(c => (c.montant || 0) !== SEUIL_DON);
    const dons = filtered.filter(c => (c.montant || 0) === SEUIL_DON);
    const totalCots = cots.reduce((s, c) => s + (c.montant || 0), 0);
    const totalDons = dons.reduce((s, c) => s + (c.montant || 0), 0);

    const rows = [
      ["Récapitulatif mensuel — COACUM"],
      ["Mois", MOIS_LABELS[MOIS_NUM[targetMois] - 1]],
      ["Année", annee],
      [],
      ["COTISATIONS"],
      ["Membre", "Montant (MRU)"],
      ...cots.map(c => [c.membre_nom, c.montant]),
      ["Total Cotisations", totalCots],
      [],
      ["DONS"],
      ["Membre", "Montant (MRU)"],
      ...dons.map(c => [c.membre_nom, c.montant]),
      ["Total Dons", totalDons],
      [],
      ["Total Général", totalCots + totalDons],
    ];

    const csv = rows.map(r =>
      r.map(cell => {
        const s = String(cell ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Recap_Cotisations_Dons_${MOIS_LABELS[MOIS_NUM[targetMois] - 1]}_${annee}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Export généré : ${cots.length} cotisations, ${dons.length} dons — ouvrez le fichier dans Google Sheets`);
    setOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 bg-white/90 backdrop-blur">
        <Sheet className="h-4 w-4 text-emerald-600" /> Google Sheets
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter vers Google Sheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Sélectionnez le mois à exporter. Un fichier CSV sera téléchargé — ouvrez-le dans Google Sheets pour votre comptabilité.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Mois</label>
                <Select value={mois} onValueChange={setMois}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOIS_LIST.map((m, i) => <SelectItem key={m} value={m}>{MOIS_LABELS[i]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Année</label>
                <Select value={annee} onValueChange={setAnnee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleExport} className="gap-2">
              <Sheet className="h-4 w-4" /> Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}