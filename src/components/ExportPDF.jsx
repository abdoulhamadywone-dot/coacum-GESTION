import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function ExportPDF({ cotisations = [], depenses = [] }) {
  const [open, setOpen] = useState(false);
  const [moisFilter, setMoisFilter] = useState("all");
  const [anneeFilter, setAnneeFilter] = useState("2025");
  const [loading, setLoading] = useState(false);

  const annees = [...new Set([...cotisations.map(c => String(c.annee)), ...depenses.map(d => d.date?.split("-")[0]).filter(Boolean)])].sort().reverse();

  const generatePDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = 0;

      // ── Header band ──
      doc.setFillColor(34, 120, 60);
      doc.rect(0, 0, pageW, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("COACUM", margin, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Coalition des Acteurs des Cultures Urbaines de Mauritanie", margin, 23);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const titre = moisFilter === "all"
        ? `Bilan Financier — Année ${anneeFilter}`
        : `Bilan Financier — ${moisFilter} ${anneeFilter}`;
      doc.text(titre, margin, 32);

      // Date d'édition
      doc.setTextColor(200, 230, 200);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      doc.text(`Édité le ${today}`, pageW - margin, 34, { align: "right" });

      y = 48;
      doc.setTextColor(30, 30, 30);

      // Filter data
      const filteredCot = cotisations.filter(c => {
        const anneeMatch = String(c.annee) === anneeFilter;
        const moisMatch = moisFilter === "all" || c.mois === moisFilter;
        return anneeMatch && moisMatch;
      });
      const filteredDep = depenses.filter(d => {
        if (!d.date) return false;
        const [yr, mo] = d.date.split("-");
        const anneeMatch = yr === anneeFilter;
        const moisMatch = moisFilter === "all" || MOIS[parseInt(mo) - 1] === moisFilter;
        return anneeMatch && moisMatch;
      });

      const totalCot = filteredCot.reduce((s, c) => s + (c.montant || 0), 0);
      const totalDep = filteredDep.reduce((s, d) => s + (d.montant || 0), 0);
      const solde = totalCot - totalDep;

      // ── Summary cards ──
      const cardH = 20;
      const cardW = (contentW - 8) / 3;
      const drawCard = (x, label, value, r, g, b) => {
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + cardW / 2, y + 6, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + cardW / 2, y + 14, { align: "center" });
      };
      drawCard(margin, "COTISATIONS", `${totalCot.toLocaleString("fr-FR")} MRU`, 34, 139, 34);
      drawCard(margin + cardW + 4, "DÉPENSES", `${totalDep.toLocaleString("fr-FR")} MRU`, 220, 80, 50);
      drawCard(margin + (cardW + 4) * 2, "SOLDE NET", `${solde.toLocaleString("fr-FR")} MRU`, solde >= 0 ? 34 : 180, solde >= 0 ? 100 : 40, solde >= 0 ? 130 : 40);
      y += cardH + 10;

      // ── Helper: draw table ──
      const drawTable = (title, headers, rows, colWidths, color) => {
        // Section title
        doc.setFillColor(...color);
        doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 4, y + 5.5);
        y += 10;

        // Table header
        doc.setFillColor(240, 248, 240);
        doc.rect(margin, y, contentW, 7, "F");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let xh = margin + 2;
        headers.forEach((h, i) => { doc.text(h, xh, y + 5); xh += colWidths[i]; });
        y += 7;

        // Rows
        doc.setFont("helvetica", "normal");
        rows.forEach((row, idx) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (idx % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(margin, y, contentW, 6.5, "F"); }
          doc.setTextColor(40, 40, 40);
          let xr = margin + 2;
          row.forEach((cell, i) => {
            const cellStr = String(cell ?? "—");
            const maxW = colWidths[i] - 2;
            const truncated = doc.getStringUnitWidth(cellStr) * 8 / doc.internal.scaleFactor > maxW
              ? cellStr.substring(0, Math.floor(maxW / (doc.getStringUnitWidth("a") * 8 / doc.internal.scaleFactor))) + "…"
              : cellStr;
            doc.text(truncated, xr, y + 4.5);
            xr += colWidths[i];
          });
          // bottom border
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, y + 6.5, margin + contentW, y + 6.5);
          y += 6.5;
        });

        // Total row
        doc.setFillColor(220, 245, 220);
        doc.rect(margin, y, contentW, 7, "F");
        doc.setTextColor(34, 100, 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const totalVal = rows.reduce((s, r) => s + (parseFloat(String(r[r.length - 1]).replace(/[^\d.]/g, "")) || 0), 0);
        doc.text("TOTAL", margin + 2, y + 5);
        doc.text(`${totalVal.toLocaleString("fr-FR")} MRU`, margin + contentW - 2, y + 5, { align: "right" });
        y += 12;
      };

      // ── Cotisations table ──
      if (filteredCot.length > 0) {
        const cotHeaders = ["Membre", "Mois", "Année", "Montant (MRU)"];
        const cotWidths = [70, 35, 25, 44];
        const cotRows = filteredCot.map(c => [c.membre_nom, c.mois, c.annee, `${c.montant} MRU`]);
        drawTable(`Cotisations (${filteredCot.length})`, cotHeaders, cotRows, cotWidths, [34, 120, 60]);
      } else {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.text("Aucune cotisation pour cette période.", margin, y);
        y += 10;
      }

      // ── Dépenses table ──
      if (filteredDep.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        const depHeaders = ["Rubrique", "Description", "Date", "Montant (MRU)"];
        const depWidths = [35, 70, 25, 44];
        const depRows = filteredDep.map(d => [d.rubrique, d.description || "—", d.date || "—", `${d.montant} MRU`]);
        drawTable(`Dépenses (${filteredDep.length})`, depHeaders, depRows, depWidths, [200, 60, 50]);
      } else {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.text("Aucune dépense pour cette période.", margin, y);
        y += 10;
      }

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(34, 120, 60);
        doc.rect(0, 287, pageW, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("COACUM — Document généré automatiquement", margin, 293);
        doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 293, { align: "right" });
      }

      const filename = moisFilter === "all"
        ? `COACUM_Bilan_${anneeFilter}.pdf`
        : `COACUM_Bilan_${moisFilter}_${anneeFilter}.pdf`;
      doc.save(filename);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <FileDown className="h-4 w-4" />
        Exporter PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exporter le bilan financier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Période</label>
              <Select value={moisFilter} onValueChange={setMoisFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute l'année</SelectItem>
                  {MOIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Année</label>
              <Select value={anneeFilter} onValueChange={setAnneeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(annees.length > 0 ? annees : ["2025", "2024"]).map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generatePDF} className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {loading ? "Génération..." : "Télécharger le PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}