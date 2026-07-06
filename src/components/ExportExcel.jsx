import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

/**
 * Exporte les cotisations au format Excel (.xls) — pivot membre × mois/année.
 * @param {array} cotisations - liste des cotisations
 * @param {string} filterLabel - libellé du filtre année pour le nom de fichier
 */
export default function ExportExcel({ cotisations, filterLabel = "toutes" }) {
  const handleExport = () => {
    if (!cotisations || cotisations.length === 0) {
      toast.error("Aucune cotisation à exporter");
      return;
    }

    const MOIS_NUM = { JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,AOÛT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12 };

    // Colonnes mois|année triées
    const colSet = new Set();
    cotisations.forEach(c => {
      const mNorm = c.mois?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace("Û","U") || "";
      colSet.add(`${mNorm}|${c.annee}`);
    });
    const columns = [...colSet].sort((a, b) => {
      const [ma, ya] = a.split("|");
      const [mb, yb] = b.split("|");
      return (parseInt(ya) * 100 + (MOIS_NUM[ma] || 0)) - (parseInt(yb) * 100 + (MOIS_NUM[mb] || 0));
    });

    const memberNames = [...new Set(cotisations.map(c => c.membre_nom))].sort();

    const lookup = {};
    cotisations.forEach(c => {
      const mNorm = c.mois?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace("Û","U") || "";
      const key = `${mNorm}|${c.annee}`;
      if (!lookup[c.membre_nom]) lookup[c.membre_nom] = {};
      lookup[c.membre_nom][key] = c;
    });

    // Construction du HTML table pour Excel
    let html = `<table border="1"><thead><tr><th>Membre</th>`;
    columns.forEach(col => {
      const [m, y] = col.split("|");
      html += `<th>${m} ${y}</th>`;
    });
    html += `<th>Total</th></tr></thead><tbody>`;

    memberNames.forEach(nom => {
      let rowTotal = 0;
      html += `<tr><td>${nom}</td>`;
      columns.forEach(col => {
        const cot = lookup[nom]?.[col];
        if (cot) {
          rowTotal += cot.montant || 0;
          html += `<td style="text-align:right">${cot.montant}</td>`;
        } else {
          html += `<td></td>`;
        }
      });
      html += `<td style="text-align:right;font-weight:bold">${rowTotal}</td></tr>`;
    });

    // Ligne total
    let grandTotal = 0;
    html += `<tr style="font-weight:bold;background:#f3f4f6"><td>Total</td>`;
    columns.forEach(col => {
      const colTotal = memberNames.reduce((s, nom) => s + (lookup[nom]?.[col]?.montant || 0), 0);
      grandTotal += colTotal;
      html += `<td style="text-align:right">${colTotal > 0 ? colTotal : ""}</td>`;
    });
    html += `<td style="text-align:right">${grandTotal}</td></tr>`;

    html += `</tbody></table>`;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Cotisations</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>${html}</body></html>`;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cotisations_${filterLabel}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export Excel généré");
  };

  return (
    <Button variant="outline" onClick={handleExport} className="gap-2">
      <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
    </Button>
  );
}