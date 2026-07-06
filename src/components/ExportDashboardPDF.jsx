import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

const MOIS_ORDER = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const LOGO_URL = "https://media.base44.com/images/public/6a18cbfaee75eb22cc08c34e/ef4d78394_logocoacum.jpg";

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ExportDashboardPDF({ membres = [], cotisations = [], depenses = [], evenements = [], compact = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = 0;

      const logoImg = await loadImage(LOGO_URL);

      // Header
      doc.setFillColor(34, 120, 60);
      doc.rect(0, 0, pageW, 42, "F");

      if (logoImg) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          canvas.getContext("2d").drawImage(logoImg, 0, 0);
          const imgData = canvas.toDataURL("image/jpeg");
          doc.addImage(imgData, "JPEG", margin, 4, 28, 28, undefined, "FAST");
        } catch (_) {}
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("COACUM", margin + 32, 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Coalition des Acteurs des Cultures Urbaines de Mauritanie", margin + 32, 20);

      const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau de bord", margin + 32, 30);
      doc.setTextColor(200, 230, 200);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Édité le ${today}`, pageW - margin, 36, { align: "right" });

      y = 52;
      doc.setTextColor(30, 30, 30);

      // Compute data
      const dons = cotisations.filter(c => c.montant === 1000);
      const totalDons = dons.reduce((s, c) => s + (c.montant || 0), 0);
      const totalCotisations = cotisations.filter(c => c.montant !== 1000).reduce((s, c) => s + (c.montant || 0), 0);
      const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
      const totalRevenus = totalCotisations + totalDons;
      const soldeNet = totalRevenus - totalDepenses;
      const membresActifs = membres.filter(m => m.statut === "actif").length;
      const evenementsPlanifies = evenements.filter(e => e.statut === "planifié").length;

      // Stats cards (4)
      const cardH = 18;
      const cardW = (contentW - 9) / 4;
      const stats = [
        [margin, "MEMBRES", String(membres.length), `${membresActifs} actifs`, 34, 100, 150],
        [margin + (cardW + 3), "COTISATIONS", `${totalCotisations.toLocaleString("fr-FR")} MRU`, `${cotisations.length} paiements`, 34, 120, 60],
        [margin + (cardW + 3) * 2, "DÉPENSES", `${totalDepenses.toLocaleString("fr-FR")} MRU`, `${depenses.length} entrées`, 220, 80, 50],
        [margin + (cardW + 3) * 3, "ÉVÉNEMENTS", String(evenements.length), `${evenementsPlanifies} planifiés`, 245, 158, 11],
      ];
      stats.forEach(([x, label, value, sub, r, g, b]) => {
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + cardW / 2, y + 4, { align: "center" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(String(value), x + cardW / 2, y + 9, { align: "center" });
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(sub, x + cardW / 2, y + 14, { align: "center" });
      });
      y += cardH + 8;

      // Solde net section
      doc.setFillColor(38, 95, 48);
      doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SOLDE NET", margin + 4, y + 5.5);
      y += 10;

      const snCardW = (contentW - 8) / 3;
      const soldeCards = [
        [margin, "REVENUS", `${totalRevenus.toLocaleString("fr-FR")} MRU`, "Cotisations + Dons", 34, 139, 34],
        [margin + snCardW + 4, "DÉPENSES", `${totalDepenses.toLocaleString("fr-FR")} MRU`, `${depenses.length} entrées`, 220, 80, 50],
        [margin + (snCardW + 4) * 2, "SOLDE NET", `${soldeNet.toLocaleString("fr-FR")} MRU`, soldeNet >= 0 ? "Excédent" : "Déficit", soldeNet >= 0 ? 245 : 200, soldeNet >= 0 ? 158 : 80, soldeNet >= 0 ? 11 : 50],
      ];
      soldeCards.forEach(([x, label, value, sub, r, g, b]) => {
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, snCardW, 20, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + snCardW / 2, y + 6, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(String(value), x + snCardW / 2, y + 12, { align: "center" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(sub, x + snCardW / 2, y + 17, { align: "center" });
      });
      y += 24;

      // Dons vs cotisations
      doc.setFillColor(240, 248, 240);
      doc.rect(margin, y, contentW, 14, "F");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Dons collectés:", margin + 3, y + 5.5);
      doc.setTextColor(139, 92, 246);
      doc.text(`${totalDons.toLocaleString("fr-FR")} MRU`, margin + 38, y + 5.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`(${dons.length} donations)`, margin + 65, y + 5.5);
      doc.text("Cotisations classiques:", margin + 3, y + 11);
      doc.setTextColor(34, 120, 60);
      doc.text(`${totalCotisations.toLocaleString("fr-FR")} MRU`, margin + 52, y + 11);
      doc.setTextColor(60, 60, 60);
      doc.text(`(${cotisations.length - dons.length} paiements)`, margin + 80, y + 11);
      y += 20;

      // Top 5 contributors
      if (y > 200) { doc.addPage(); y = 20; }
      doc.setFillColor(38, 95, 48);
      doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOP 5 CONTRIBUTEURS", margin + 4, y + 5.5);
      y += 10;

      const contrib = {};
      cotisations.forEach(c => { contrib[c.membre_nom] = (contrib[c.membre_nom] || 0) + (c.montant || 0); });
      const top5 = Object.entries(contrib).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxContrib = top5[0]?.[1] || 1;

      doc.setFontSize(8);
      top5.forEach(([nom, total], idx) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const medals = ["1.", "2.", "3.", "4.", "5."];
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "bold");
        doc.text(medals[idx], margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(nom, margin + 12, y + 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(38, 95, 48);
        doc.text(`${total.toLocaleString("fr-FR")} MRU`, pageW - margin - 2, y + 5, { align: "right" });

        // Bar
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(margin + 12, y + 7, contentW - 14, 2.5, 1, 1, "F");
        const barW = (contentW - 14) * (total / maxContrib);
        const barColors = [[38, 95, 48], [200, 80, 55], [25, 95, 53], [142, 55, 45], [120, 120, 120]];
        doc.setFillColor(...barColors[idx]);
        doc.roundedRect(margin + 12, y + 7, Math.max(barW, 2), 2.5, 1, 1, "F");
        y += 12;
      });
      y += 4;

      // Expenses by category
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFillColor(200, 60, 50);
      doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DÉPENSES PAR CATÉGORIE", margin + 4, y + 5.5);
      y += 10;

      const depByRub = {};
      depenses.forEach(d => { depByRub[d.rubrique] = (depByRub[d.rubrique] || 0) + (d.montant || 0); });
      const depEntries = Object.entries(depByRub).sort((a, b) => b[1] - a[1]);
      const maxDep = depEntries[0]?.[1] || 1;

      doc.setFontSize(8);
      depEntries.forEach(([rub, total], idx) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "bold");
        doc.text(rub, margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(`${total.toLocaleString("fr-FR")} MRU`, margin + 50, y + 5);
        doc.setTextColor(120, 120, 120);
        doc.text(`${Math.round((total / totalDepenses) * 100)}%`, margin + 80, y + 5);

        doc.setFillColor(230, 230, 230);
        doc.roundedRect(margin + 95, y + 2, contentW - 97, 2.5, 1, 1, "F");
        doc.setFillColor(200, 60, 50);
        doc.roundedRect(margin + 95, y + 2, Math.max((contentW - 97) * (total / maxDep), 2), 2.5, 1, 1, "F");
        y += 7;
      });
      if (depEntries.length === 0) {
        doc.setTextColor(120, 120, 120);
        doc.text("Aucune dépense enregistrée.", margin + 2, y + 5);
        y += 8;
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(34, 120, 60);
        doc.rect(0, 287, pageW, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("COACUM - Tableau de bord - Coalition des Acteurs des Cultures Urbaines de Mauritanie", margin, 293);
        doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 293, { align: "right" });
      }

      doc.save(`COACUM_Tableau_de_bord_${new Date().toISOString().slice(0, 10)}.pdf`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          title="Exporter tableau de bord"
        >
          <FileDown className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exporter tableau de bord
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exporter le tableau de bord</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Ce PDF inclura :</p>
              <p>- Statistiques générales (membres, cotisations, dépenses, événements)</p>
              <p>- Solde net (revenus, dépenses, solde)</p>
              <p>- Top 5 contributeurs</p>
              <p>- Répartition des dépenses par catégorie</p>
              <p>- Logo officiel COACUM et pied de page</p>
            </div>

            <Button onClick={generatePDF} className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {loading ? "Génération en cours..." : "Télécharger le PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}