import jsPDF from "jspdf";

/**
 * Génère un reçu PDF pour une ou plusieurs cotisations.
 * @param {object} membre - Le membre concerné
 * @param {array} cotisations - Liste des cotisations { mois, annee, montant, paye }
 */
export default function generateRecuPDF(membre, cotisations) {
  if (!cotisations || cotisations.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  const now = new Date();
  const recuNum = `REC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-5)}`;

  // En-tête coloré
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE COTISATION", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("COACUM — Association des membres", margin, 21);
  doc.text(`N° ${recuNum}`, pageW - margin, 14, { align: "right" });
  doc.text(now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }), pageW - margin, 21, { align: "right" });

  let y = 40;

  // Infos membre
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "FD");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("MEMBRE", margin + 4, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(membre.nom || "—", margin + 4, y + 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  if (membre.telephone) doc.text(`Tél: ${membre.telephone}`, margin + 4, y + 18);
  if (membre.date_adhesion) doc.text(`Adhésion: ${membre.date_adhesion}`, margin + 80, y + 18);

  y += 30;

  // Tableau des cotisations
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Désignation", margin + 4, y + 5.5);
  doc.text("Année", margin + 110, y + 5.5);
  doc.text("Statut", margin + 135, y + 5.5);
  doc.text("Montant", pageW - margin - 4, y + 5.5, { align: "right" });

  y += 8;

  let total = 0;
  cotisations.forEach((c, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y, contentW, 7, "F");
    }
    const isDonation = c.montant === 1000;
    const label = isDonation ? "Donation" : c.mois;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + 4, y + 5);
    doc.text(String(c.annee), margin + 110, y + 5);
    doc.text(c.paye ? "Payé" : "Impayé", margin + 135, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`${c.montant.toLocaleString("fr-FR")} MRU`, pageW - margin - 4, y + 5, { align: "right" });
    total += c.montant;
    y += 7;
  });

  // Total
  y += 2;
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL", margin + 4, y);
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(12);
  doc.text(`${total.toLocaleString("fr-FR")} MRU`, pageW - margin - 4, y, { align: "right" });

  // Signature
  y += 20;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin + 100, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Signature du trésorier", margin + 100, y + 4);

  // Pied de page
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 287, pageW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Document généré par l'application COACUM", margin, 293);
  doc.text(`Reçu N° ${recuNum}`, pageW - margin, 293, { align: "right" });

  const fileName = `Recu_${(membre.nom || "membre").replace(/\s+/g, "_")}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}