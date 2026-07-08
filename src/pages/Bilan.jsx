import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Wallet, Scale, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useAnimatedCounter from "../hooks/useAnimatedCounter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { jsPDF } from "jspdf";

const MOIS_ORDER = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MOIS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const COLORS = ["hsl(38,95%,48%)", "hsl(25,95%,53%)", "hsl(197,37%,32%)", "hsl(142,55%,40%)", "hsl(0,84%,60%)"];

function AnimatedStat({ value, suffix = "", prefix = "" }) {
  const animated = useAnimatedCounter(value);
  return <span>{prefix}{animated.toLocaleString()}{suffix}</span>;
}

const RUBRIQUE_ICONS = {
  Transport: "🚗", Dejeuner: "🍽️", Collation: "☕", Communication: "📢",
  Location: "🏠", Matériel: "🎵", Autre: "📌"
};

export default function Bilan() {
  const [anneeFiltre, setAnneeFiltre] = useState("all");

  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });

  const annees = [...new Set(cotisations.map(c => c.annee))].sort((a, b) => b - a);
  const anneesDep = [...new Set(depenses.map(d => d.date ? new Date(d.date).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
  const allAnnees = [...new Set([...annees, ...anneesDep])].sort((a, b) => b - a);

  const cotisationsFiltrees = anneeFiltre === "all" ? cotisations : cotisations.filter(c => c.annee === parseInt(anneeFiltre));
  const depensesFiltrees = anneeFiltre === "all"
    ? depenses
    : depenses.filter(d => d.date && new Date(d.date).getFullYear() === parseInt(anneeFiltre));

  // Recettes
  const dons = cotisationsFiltrees.filter(c => c.montant === 1000);
  const cotisStd = cotisationsFiltrees.filter(c => c.montant !== 1000 && c.paye);
  const cotisImpayees = cotisationsFiltrees.filter(c => c.montant !== 1000 && !c.paye);
  const totalDons = dons.reduce((s, c) => s + (c.montant || 0), 0);
  const totalCotisStd = cotisStd.reduce((s, c) => s + (c.montant || 0), 0);
  const totalCotisImpayees = cotisImpayees.reduce((s, c) => s + (c.montant || 0), 0);
  const totalRecettes = totalCotisStd + totalDons;

  // Dépenses
  const totalDepenses = depensesFiltrees.reduce((s, d) => s + (d.montant || 0), 0);
  const depByRub = {};
  depensesFiltrees.forEach(d => { depByRub[d.rubrique] = (depByRub[d.rubrique] || 0) + (d.montant || 0); });
  const depByRubArray = Object.entries(depByRub).sort((a, b) => b[1] - a[1]);

  // Résultat
  const resultat = totalRecettes - totalDepenses;

  // Données mensuelles pour le graphique
  const monthData = {};
  MOIS_ORDER.forEach((mois, idx) => {
    monthData[idx] = { name: MOIS_SHORT[idx], recettes: 0, depenses: 0 };
  });
  cotisationsFiltrees.forEach(c => {
    const mIdx = MOIS_ORDER.indexOf(c.mois);
    if (mIdx >= 0) monthData[mIdx].recettes += (c.montant || 0);
  });
  depensesFiltrees.forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    const mIdx = date.getMonth();
    monthData[mIdx].depenses += (d.montant || 0);
  });
  const chartData = Object.values(monthData);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(38, 95, 48);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("COACUM — Bilan Comptable", 14, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(anneeFiltre === "all" ? "Toutes les années" : `Année ${anneeFiltre}`, 14, 22);

    y = 42;
    doc.setTextColor(0, 0, 0);

    // Summary cards
    const cardW = (pageW - 28 - 8) / 3;
    const cards = [
      { label: "Recettes", value: totalRecettes, color: [34, 139, 87] },
      { label: "Dépenses", value: totalDepenses, color: [200, 50, 50] },
      { label: "Résultat", value: resultat, color: resultat >= 0 ? [255, 153, 0] : [200, 50, 50] },
    ];
    cards.forEach((c, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setFillColor(245, 245, 240);
      doc.roundedRect(x, y, cardW, 24, 3, 3, "F");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(c.label, x + 4, y + 7);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
      doc.text(`${c.value.toLocaleString("fr-FR")} MRU`, x + 4, y + 16);
      doc.setFont("helvetica", "normal");
    });
    y += 34;

    // Recettes detail
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Recettes", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const recLines = [
      ["Cotisations standard payées", `${totalCotisStd.toLocaleString("fr-FR")} MRU`],
      ["Donations", `${totalDons.toLocaleString("fr-FR")} MRU`],
      ["Cotisations impayées", `${totalCotisImpayees.toLocaleString("fr-FR")} MRU`],
    ];
    recLines.forEach(([l, v]) => {
      doc.text(l, 18, y);
      doc.text(v, pageW - 14, y, { align: "right" });
      y += 5;
    });

    // Dépenses detail
    y += 4;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Dépenses par rubrique", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    depByRubArray.forEach(([rub, val]) => {
      doc.text(`${RUBRIQUE_ICONS[rub] || ""} ${rub}`, 18, y);
      doc.text(`${val.toLocaleString("fr-FR")} MRU`, pageW - 14, y, { align: "right" });
      y += 5;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} — COACUM`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`bilan_comptable_${anneeFiltre === "all" ? "global" : anneeFiltre}.pdf`);
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Bilan Comptable
          </h1>
          <p className="text-sm text-muted-foreground">Recettes, dépenses et résultat financier</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={anneeFiltre} onValueChange={setAnneeFiltre}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {allAnnees.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Three summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Recettes */}
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Recettes totales</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold"><AnimatedStat value={totalRecettes} suffix=" MRU" /></p>
          <div className="mt-3 space-y-1 text-xs text-white/70">
            <div className="flex justify-between"><span>Cotisations payées</span><span className="font-semibold text-white">{totalCotisStd.toLocaleString("fr-FR")}</span></div>
            <div className="flex justify-between"><span>Donations</span><span className="font-semibold text-white">{totalDons.toLocaleString("fr-FR")}</span></div>
            <div className="flex justify-between"><span>Impayées</span><span className="font-semibold text-white/80">{totalCotisImpayees.toLocaleString("fr-FR")}</span></div>
          </div>
        </div>

        {/* Dépenses */}
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Dépenses totales</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold"><AnimatedStat value={totalDepenses} suffix=" MRU" /></p>
          <div className="mt-3 space-y-1 text-xs text-white/70">
            <div className="flex justify-between"><span>Nombre d'entrées</span><span className="font-semibold text-white">{depensesFiltrees.length}</span></div>
            <div className="flex justify-between"><span>Rubriques</span><span className="font-semibold text-white">{depByRubArray.length}</span></div>
            <div className="flex justify-between"><span>Moyenne / entrée</span><span className="font-semibold text-white">{depensesFiltrees.length > 0 ? Math.round(totalDepenses / depensesFiltrees.length).toLocaleString("fr-FR") : 0}</span></div>
          </div>
        </div>

        {/* Résultat */}
        <div className={`rounded-2xl p-5 sm:p-6 text-white shadow-lg ${resultat >= 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Résultat</p>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold"><AnimatedStat value={Math.abs(resultat)} prefix={resultat < 0 ? "−" : "+"} suffix=" MRU" /></p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20">
              {resultat >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {resultat >= 0 ? "Excédent" : "Déficit"}
            </span>
            <p className="text-[11px] text-white/60 mt-2">
              {resultat >= 0
                ? `Les recettes couvrent ${totalDepenses > 0 ? Math.round((totalRecettes / totalDepenses) * 100) : 100}% des dépenses`
                : "Les dépenses dépassent les recettes"}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-1">Recettes vs Dépenses par mois</h3>
        <p className="text-xs text-muted-foreground mb-5">
          {anneeFiltre === "all" ? "Vue globale" : `Année ${anneeFiltre}`}
        </p>
        {chartData.some(d => d.recettes > 0 || d.depenses > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(38,15%,90%)" vertical={false} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} MRU`} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              <Bar dataKey="recettes" fill="hsl(142,55%,45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Aucune donnée</div>
        )}
      </div>

      {/* Dépenses par rubrique */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Dépenses par rubrique</h3>
        {depByRubArray.length > 0 ? (
          <div className="space-y-2.5">
            {depByRubArray.map(([rub, val], idx) => {
              const pct = totalDepenses > 0 ? Math.round((val / totalDepenses) * 100) : 0;
              return (
                <div key={rub}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <span>{RUBRIQUE_ICONS[rub] || "📌"}</span>{rub}
                    </span>
                    <span className="text-muted-foreground">{val.toLocaleString("fr-FR")} MRU <span className="text-[10px] text-muted-foreground/70">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: COLORS[idx % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-6">Aucune dépense enregistrée</p>
        )}
      </div>
    </div>
  );
}