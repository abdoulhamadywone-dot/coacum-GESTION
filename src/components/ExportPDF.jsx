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

export default function ExportPDF({ cotisations = [], depenses = [], membres = [], compact = false }) {
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

      if (reportType === "cotisations") {
        const MONTANT_STD = 50;
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonthIdx = now.getMonth(); // 0-11

        // Build per-member data
        const memberMap = {};
        cotisations.forEach(c => {
          const key = c.membre_nom || "Inconnu";
          if (!memberMap[key]) memberMap[key] = { nom: key, cots: [], dons: [] };
          if (c.montant === 1000) memberMap[key].dons.push(c);
          else memberMap[key].cots.push(c);
        });

        // Add members with no cotisations
        membres.forEach(m => {
          if (!memberMap[m.nom]) memberMap[m.nom] = { nom: m.nom, cots: [], dons: [], membre: m };
        });

        const memberNames = Object.keys(memberMap).sort();
        const allMemberCots = Object.values(memberMap);

        const totalCot = allMemberCots.reduce((s, mc) => s + mc.cots.reduce((s2, c) => s2 + (c.montant || 0), 0), 0);
        const totalDons = allMemberCots.reduce((s, mc) => s + mc.dons.reduce((s2, c) => s2 + (c.montant || 0), 0), 0);

        // Summary cards
        const cardH = 20;
        const cardW = (contentW - 8) / 3;
        [[margin, "TOTAL COTISATIONS", `${totalCot.toLocaleString("fr-FR")} MRU`, 34, 139, 34],
         [margin + cardW + 4, "TOTAL DONS", `${totalDons.toLocaleString("fr-FR")} MRU`, 139, 92, 246],
         [margin + (cardW + 4) * 2, "MEMBRES", String(allMemberCots.length), 245, 158, 11]].forEach(([x, label, value, r, g, b]) => {
          doc.setFillColor(r, g, b);
          doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(label, x + cardW / 2, y + 6, { align: "center" });
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(String(value), x + cardW / 2, y + 14, { align: "center" });
        });
        y += cardH + 6;

        // Helper: compute expected months from date_adhesion (or earliest cot) to now
        const computeArrears = (mc) => {
          const membre = mc.membre || membres.find(m => m.nom === mc.nom);
          let startYear, startMonthIdx;
          if (membre?.date_adhesion) {
            const [yy, mm] = membre.date_adhesion.split("-");
            startYear = parseInt(yy);
            startMonthIdx = parseInt(mm) - 1;
          } else if (mc.cots.length > 0) {
            const earliest = mc.cots.reduce((min, c) => {
              const mi = MOIS.indexOf(c.mois);
              if (c.annee < min.annee || (c.annee === min.annee && mi < min.mi)) return { annee: c.annee, mi };
              return min;
            }, { annee: 9999, mi: 99 });
            startYear = earliest.annee;
            startMonthIdx = earliest.mi;
          } else {
            startYear = curYear;
            startMonthIdx = curMonthIdx;
          }

          // Expected months list
          const expected = [];
          let yr = startYear, mi = startMonthIdx;
          while (yr < curYear || (yr === curYear && mi <= curMonthIdx)) {
            expected.push(`${MOIS[mi]} ${yr}`);
            mi++;
            if (mi > 11) { mi = 0; yr++; }
          }

          // Paid months set (standard cotisations, paye=true)
          const paidSet = new Set(mc.cots.filter(c => c.paye).map(c => `${c.mois} ${c.annee}`));
          const arrearsMonths = expected.filter(m => !paidSet.has(m));
          const arrearsAmount = arrearsMonths.length * MONTANT_STD;
          return { expected, paidSet, arrearsMonths, arrearsAmount };
        };

        // Per-member detailed blocks
        allMemberCots.forEach((mc, idx) => {
          if (y > 250) { doc.addPage(); y = 20; }

          // Member header bar
          const ar = computeArrears(mc);
          const membreInfo = mc.membre || membres.find(m => m.nom === mc.nom);
          const totalPaye = mc.cots.reduce((s, c) => s + (c.montant || 0), 0) + mc.dons.reduce((s, c) => s + (c.montant || 0), 0);
          const hasArrears = ar.arrearsMonths.length > 0;
          const barColor = hasArrears ? [220, 80, 50] : [34, 139, 34];
          doc.setFillColor(...barColor);
          doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`${idx + 1}. ${mc.nom}`, margin + 4, y + 6);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`Tel: ${membreInfo?.telephone || "-"}`, margin + 90, y + 6);
          doc.text(`Adhesion: ${membreInfo?.date_adhesion || "-"}`, margin + 130, y + 6);
          doc.setFont("helvetica", "bold");
          doc.text(`Total: ${totalPaye.toLocaleString("fr-FR")} MRU`, pageW - margin - 2, y + 6, { align: "right" });
          y += 10;

          // Cotisations list — chronological order
          const allCots = [...mc.cots, ...mc.dons].sort((a, b) => {
            if (a.annee !== b.annee) return a.annee - b.annee;
            return MOIS.indexOf(a.mois) - MOIS.indexOf(b.mois);
          });

          if (allCots.length > 0) {
            // Sub-header
            doc.setFillColor(240, 248, 240);
            doc.rect(margin, y, contentW, 6, "F");
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text("COTISATIONS PAYEES", margin + 2, y + 4.5);
            doc.text("MONTANT", pageW - margin - 2, y + 4.5, { align: "right" });
            y += 6;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            allCots.forEach((c, ci) => {
              if (y > 275) { doc.addPage(); y = 20; }
              if (ci % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(margin, y, contentW, 5.5, "F"); }
              doc.setTextColor(40, 40, 40);
              const isDon = c.montant === 1000;
              const label = isDon ? `Donation - ${c.annee}` : `${c.mois} ${c.annee}`;
              doc.text(label, margin + 4, y + 4);
              if (!c.paye) { doc.setTextColor(220, 80, 50); doc.text("(impayé)", margin + 60, y + 4); }
              doc.setTextColor(isDon ? 139 : 34, isDon ? 92 : 139, isDon ? 246 : 34);
              doc.setFont("helvetica", "bold");
              doc.text(`${c.montant.toLocaleString("fr-FR")} MRU`, pageW - margin - 2, y + 4, { align: "right" });
              doc.setFont("helvetica", "normal");
              y += 5.5;
            });
          } else {
            doc.setTextColor(120, 120, 120);
            doc.setFontSize(8);
            doc.text("Aucune cotisation enregistree.", margin + 2, y + 4);
            y += 6;
          }

          // Arrears section
          if (hasArrears) {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFillColor(255, 240, 230);
            doc.rect(margin, y, contentW, 6, "F");
            doc.setTextColor(200, 80, 30);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text(`ARRETES (${ar.arrearsMonths.length} mois impayes)`, margin + 2, y + 4.5);
            doc.text(`${ar.arrearsAmount.toLocaleString("fr-FR")} MRU`, pageW - margin - 2, y + 4.5, { align: "right" });
            y += 6;

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(180, 80, 40);
            // Arrears months in columns
            const colW = 42;
            const cols = Math.floor(contentW / colW);
            ar.arrearsMonths.forEach((m, mi2) => {
              if (mi2 > 0 && mi2 % cols === 0) { y += 5; if (y > 275) { doc.addPage(); y = 20; } }
              const col = mi2 % cols;
              doc.text(`✗ ${m}`, margin + 2 + col * colW, y + 4);
            });
            y += 6;

            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(255, 245, 235);
            doc.roundedRect(margin, y, contentW, 7, 1, 1, "F");
            doc.setTextColor(200, 80, 30);
            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.text(`Action requise: ${ar.arrearsAmount.toLocaleString("fr-FR")} MRU a regulariser pour etre a jour.`, margin + 2, y + 5);
            y += 9;
          } else if (allCots.length > 0) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(235, 250, 235);
            doc.roundedRect(margin, y, contentW, 6, 1, 1, "F");
            doc.setTextColor(34, 139, 34);
            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.text("✓ A jour — aucun arrete.", margin + 2, y + 4.5);
            y += 8;
          }
          y += 4;
        });

      } else if (reportType === "sans_cotisation") {
        const MONTANT_STD = 50;
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonthIdx = now.getMonth();

        // Members who have at least one cotisation
        const cotisedNames = new Set(cotisations.map(c => c.membre_nom));
        // Members who never cotised
        const sansCot = membres.filter(m => !cotisedNames.has(m.nom));

        const cardH = 20;
        const cardW = (contentW - 8) / 3;
        const totalArrears = sansCot.reduce((s, m) => {
          if (!m.date_adhesion) return s;
          const [yy, mm] = m.date_adhesion.split("-");
          let yr = parseInt(yy), mi = parseInt(mm) - 1;
          let months = 0;
          while (yr < curYear || (yr === curYear && mi <= curMonthIdx)) { months++; mi++; if (mi > 11) { mi = 0; yr++; } }
          return s + months * MONTANT_STD;
        }, 0);

        [[margin, "MEMBRES SANS COTISATION", String(sansCot.length), 220, 80, 50],
         [margin + cardW + 4, "TOTAL MEMBRES", String(membres.length), 34, 120, 60],
         [margin + (cardW + 4) * 2, "ARRETES ESTIMES", `${totalArrears.toLocaleString("fr-FR")} MRU`, 245, 158, 11]].forEach(([x, label, value, r, g, b]) => {
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
        y += cardH + 8;

        if (sansCot.length > 0) {
          drawTable(`Membres n'ayant jamais cotise (${sansCot.length})`,
            ["Nom", "Telephone", "Date adhesion", "Arrieres (MRU)"],
            sansCot.map(m => {
              let arrears = 0, months = 0;
              if (m.date_adhesion) {
                const [yy, mm] = m.date_adhesion.split("-");
                let yr = parseInt(yy), mi = parseInt(mm) - 1;
                while (yr < curYear || (yr === curYear && mi <= curMonthIdx)) { months++; mi++; if (mi > 11) { mi = 0; yr++; } }
                arrears = months * MONTANT_STD;
              }
              return [m.nom, m.telephone || "-", m.date_adhesion || "-", `${arrears.toLocaleString("fr-FR")} (${months} mois)`];
            }),
            [60, 40, 40, 34], [200, 80, 50], true);

          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFillColor(255, 240, 230);
          doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
          doc.setTextColor(200, 80, 30);
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("Action requise: contacter ces membres pour regulariser leur situation.", margin + 2, y + 6.5);
          y += 12;
        } else {
          doc.setTextColor(34, 139, 34);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Tous les membres ont au moins une cotisation enregistree.", margin, y + 6);
          y += 12;
        }

      } else if (reportType === "membres") {
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
        : reportType === "cotisations"
        ? `COACUM_Toutes_Cotisations_${new Date().toISOString().slice(0, 10)}.pdf`
        : reportType === "sans_cotisation"
        ? `COACUM_Sans_Cotisation_${new Date().toISOString().slice(0, 10)}.pdf`
        : moisFilter === "all" ? `COACUM_Bilan_${anneeFilter}.pdf` : `COACUM_Bilan_${moisFilter}_${anneeFilter}.pdf`;
      doc.save(filename);
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
          title="Exporter PDF"
        >
          <FileDown className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exporter PDF
        </Button>
      )}

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
                  <SelectItem value="cotisations">Toutes les Cotisations</SelectItem>
                  <SelectItem value="sans_cotisation">Membres sans cotisation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(reportType === "financier") && (
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
              {reportType === "cotisations" && <p>- Detail par membre (cotisations + arrieres)</p>}
              {reportType === "sans_cotisation" && <p>- Membres n'ayant jamais cotise avec arrieres</p>}
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