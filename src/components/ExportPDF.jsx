import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
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

export default function ExportPDF({ cotisations = [], depenses = [], membres = [] }) {
  const [open, setOpen] = useState(false);
  const [moisFilter, setMoisFilter] = useState("all");
  const [anneeFilter, setAnneeFilter] = useState("2025");
  const [reportType, setReportType] = useState("financier");
  const [loading, setLoading] = useState(false);

  const annees = [...new Set([
    ...cotisations.map(c => String(c.annee)),
    ...depenses.map(d => d.date?.split("-")[0]).filter(Boolean)
  ])].sort().reverse();

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = 0;

      const logoImg = await loadImage(LOGO_URL);

      // Header band
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
      let titre = "";
      if (reportType === "membres") {
        titre = "Liste des Membres";
      } else {
        titre = moisFilter === "all"
          ? `Bilan Financier - Annee ${anneeFilter}`
          : `Bilan Financier - ${moisFilter} ${anneeFilter}`;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(titre, margin + 32, 30);
      doc.setTextColor(200, 230, 200);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Edite le ${today}`, pageW - margin, 36, { align: "right" });

      y = 52;
      doc.setTextColor(30, 30, 30);

      const drawTable = (title, headers, rows, colWidths, color, showTotal) => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFillColor(...color);
        doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 4, y + 5.5);
        y += 10;

        doc.setFillColor(240, 248, 240);
        doc.rect(margin, y, contentW, 7, "F");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let xh = margin + 2;
        headers.forEach((h, i) => { doc.text(h, xh, y + 5); xh += colWidths[i]; });
        y += 7;

        doc.setFont("helvetica", "normal");
        rows.forEach((row, idx) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (idx % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(margin, y, contentW, 6.5, "F"); }
          doc.setTextColor(40, 40, 40);
          let xr = margin + 2;
          row.forEach((cell, i) => {
            const cellStr = String(cell ?? "-");
            const maxW = colWidths[i] - 2;
            const charW = doc.getStringUnitWidth("a") * 8 / doc.internal.scaleFactor;
            const truncated = doc.getStringUnitWidth(cellStr) * 8 / doc.internal.scaleFactor > maxW
              ? cellStr.substring(0, Math.floor(maxW / charW)) + "..."
              : cellStr;
            doc.text(truncated, xr, y + 4.5);
            xr += colWidths[i];
          });
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, y + 6.5, margin + contentW, y + 6.5);
          y += 6.5;
        });

        if (showTotal) {
          const totalVal = rows.reduce((s, r) => s + (parseFloat(String(r[r.length - 1]).replace(/[^\d.]/g, "")) || 0), 0);
          doc.setFillColor(220, 245, 220);
          doc.rect(margin, y, contentW, 7, "F");
          doc.setTextColor(34, 100, 34);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("TOTAL", margin + 2, y + 5);
          doc.text(`${totalVal.toLocaleString("fr-FR")} MRU`, margin + contentW - 2, y + 5, { align: "right" });
          y += 7;
        }
        y += 8;
      };

      if (reportType === "membres") {
        const actifs = membres.filter(m => m.statut === "actif");
        const inactifs = membres.filter(m => m.statut !== "actif");

        const cardH = 18;
        const cardW = (contentW - 6) / 3;
        [[margin, "TOTAL MEMBRES", membres.length, 34, 100, 150], [margin + cardW + 3, "ACTIFS", actifs.length, 34, 120, 60], [margin + (cardW + 3) * 2, "INACTIFS", inactifs.length, 180, 80, 50]].forEach(([x, label, value, r, g, b]) => {
          doc.setFillColor(r, g, b);
          doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(label, x + cardW / 2, y + 6, { align: "center" });
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(String(value), x + cardW / 2, y + 14, { align: "center" });
        });
        y += cardH + 10;

        drawTable(`Membres Actifs (${actifs.length})`, ["Nom", "Telephone", "Date adhesion", "Statut"], actifs.map(m => [m.nom, m.telephone || "-", m.date_adhesion || "-", "Actif"]), [70, 40, 45, 19], [34, 120, 60], false);
        if (inactifs.length > 0) {
          drawTable(`Membres Inactifs (${inactifs.length})`, ["Nom", "Telephone", "Date adhesion", "Statut"], inactifs.map(m => [m.nom, m.telephone || "-", m.date_adhesion || "-", "Inactif"]), [70, 40, 45, 19], [150, 100, 34], false);
        }

      } else {
        const filteredCot = cotisations.filter(c => {
          return String(c.annee) === anneeFilter && (moisFilter === "all" || c.mois === moisFilter);
        });
        const filteredDep = depenses.filter(d => {
          if (!d.date) return false;
          const [yr, mo] = d.date.split("-");
          return yr === anneeFilter && (moisFilter === "all" || MOIS[parseInt(mo) - 1] === moisFilter);
        });

        const totalCot = filteredCot.reduce((s, c) => s + (c.montant || 0), 0);
        const totalDep = filteredDep.reduce((s, d) => s + (d.montant || 0), 0);
        const solde = totalCot - totalDep;

        const cardH = 20;
        const cardW = (contentW - 8) / 3;
        [[margin, "COTISATIONS", `${totalCot.toLocaleString("fr-FR")} MRU`, 34, 139, 34], [margin + cardW + 4, "DEPENSES", `${totalDep.toLocaleString("fr-FR")} MRU`, 220, 80, 50], [margin + (cardW + 4) * 2, "SOLDE NET", `${solde.toLocaleString("fr-FR")} MRU`, solde >= 0 ? 34 : 180, solde >= 0 ? 100 : 40, solde >= 0 ? 130 : 40]].forEach(([x, label, value, r, g, b]) => {
          doc.setFillColor(r, g, b);
          doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(label, x + cardW / 2, y + 6, { align: "center" });
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(String(value), x + cardW / 2, y + 14, { align: "center" });
        });
        y += cardH + 10;

        if (filteredCot.length > 0) {
          drawTable(`Cotisations (${filteredCot.length})`, ["Membre", "Mois", "Annee", "Montant (MRU)"], filteredCot.map(c => [c.membre_nom, c.mois, c.annee, `${c.montant} MRU`]), [70, 35, 25, 44], [34, 120, 60], true);
        } else {
          doc.setTextColor(120, 120, 120); doc.setFontSize(9); doc.text("Aucune cotisation pour cette periode.", margin, y); y += 10;
        }

        if (filteredDep.length > 0) {
          if (y > 220) { doc.addPage(); y = 20; }
          drawTable(`Depenses (${filteredDep.length})`, ["Rubrique", "Description", "Date", "Montant (MRU)"], filteredDep.map(d => [d.rubrique, d.description || "-", d.date || "-", `${d.montant} MRU`]), [35, 70, 25, 44], [200, 60, 50], true);
        } else {
          doc.setTextColor(120, 120, 120); doc.setFontSize(9); doc.text("Aucune depense pour cette periode.", margin, y); y += 10;
        }
      }

      // Signature section
      if (y > 230) { doc.addPage(); y = 20; }
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, margin + contentW, y);
      y += 8;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("SIGNATURES ET APPROBATION", margin, y);
      y += 10;

      const sigBoxW = (contentW - 12) / 3;
      const sigBoxH = 28;
      ["Le President", "Le Tresorier", "Le Secretaire General"].forEach((label, i) => {
        const sx = margin + i * (sigBoxW + 6);
        doc.setDrawColor(180, 180, 180);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(sx, y, sigBoxW, sigBoxH, 2, 2, "FD");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(label, sx + sigBoxW / 2, y + 6, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 160, 160);
        doc.text("Nom & Signature", sx + sigBoxW / 2, y + 14, { align: "center" });
        doc.setDrawColor(180, 180, 180);
        doc.line(sx + 6, y + sigBoxH - 4, sx + sigBoxW - 6, y + sigBoxH - 4);
      });
      y += sigBoxH + 10;

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(34, 120, 60);
        doc.rect(0, 287, pageW, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("COACUM - Document officiel - Coalition des Acteurs des Cultures Urbaines de Mauritanie", margin, 293);
        doc.text(`Page ${i} / ${pageCount}`, pageW - margin, 293, { align: "right" });
      }

      const filename = reportType === "membres"
        ? `COACUM_Membres_${new Date().toISOString().slice(0, 10)}.pdf`
        : moisFilter === "all" ? `COACUM_Bilan_${anneeFilter}.pdf` : `COACUM_Bilan_${moisFilter}_${anneeFilter}.pdf`;
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
            <DialogTitle>Exporter en PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type de rapport</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="financier">Bilan Financier</SelectItem>
                  <SelectItem value="membres">Liste des Membres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "financier" && (
              <>
                <div>
                  <label className="text-sm font-medium">Periode</label>
                  <Select value={moisFilter} onValueChange={setMoisFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toute l'annee</SelectItem>
                      {MOIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Annee</label>
                  <Select value={anneeFilter} onValueChange={setAnneeFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(annees.length > 0 ? annees : ["2025", "2024"]).map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Ce PDF inclura :</p>
              <p>- Logo officiel COACUM</p>
              {reportType === "financier" && <p>- Resume financier (cotisations, depenses, solde)</p>}
              {reportType === "membres" && <p>- Liste complete des membres (actifs et inactifs)</p>}
              <p>- Section signatures (President, Tresorier, Secretaire)</p>
            </div>

            <Button onClick={generatePDF} className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {loading ? "Generation en cours..." : "Telecharger le PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}