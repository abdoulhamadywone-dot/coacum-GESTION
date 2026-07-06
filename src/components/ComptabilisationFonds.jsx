import { Wallet, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Gift } from "lucide-react";

const MOIS_ORDER = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function ComptabilisationFonds({ membre, cotisations }) {
  const membreCots = cotisations.filter(c => c.membre_nom === membre.nom);

  const standardCots = membreCots.filter(c => c.montant !== 1000);
  const donations = membreCots.filter(c => c.montant === 1000);
  const impayes = standardCots.filter(c => !c.paye);

  const totalStandard = standardCots.reduce((s, c) => s + (c.montant || 0), 0);
  const totalStandardPaye = standardCots.filter(c => c.paye).reduce((s, c) => s + (c.montant || 0), 0);
  const totalStandardImpaye = impayes.reduce((s, c) => s + (c.montant || 0), 0);
  const totalDons = donations.reduce((s, c) => s + (c.montant || 0), 0);
  const totalFonds = totalStandardPaye + totalDons;

  // Arriérés: mois attendus depuis adhesion
  const MONTANT_STD = 50;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonthIdx = now.getMonth();

  let arrearsMonths = 0;
  if (membre.date_adhesion) {
    const [yy, mm] = membre.date_adhesion.split("-");
    let yr = parseInt(yy), mi = parseInt(mm) - 1;
    while (yr < curYear || (yr === curYear && mi <= curMonthIdx)) {
      const moisLabel = `${MOIS_ORDER[mi]} ${yr}`;
      const hasPaid = standardCots.some(c => c.paye && `${c.mois} ${c.annee}` === moisLabel);
      if (!hasPaid) arrearsMonths++;
      mi++;
      if (mi > 11) { mi = 0; yr++; }
    }
  }
  const arrearsAmount = arrearsMonths * MONTANT_STD;

  const lignes = [
    { label: "Cotisations standard payées", value: totalStandardPaye, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Donations", value: totalDons, icon: Gift, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Cotisations impayées", value: totalStandardImpaye, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Arriérés estimés", value: arrearsAmount, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Wallet className="h-4 w-4 text-amber-500" />
        <h2 className="font-semibold text-sm">Comptabilisation des fonds</h2>
      </div>

      <div className="p-4 space-y-3">
        {/* Total fonds encaissés */}
        <div className="rounded-xl bg-gradient-to-br from-amber-400/10 to-orange-500/10 border border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total fonds encaissés</p>
              <p className="text-lg font-bold text-foreground">{totalFonds.toLocaleString("fr-FR")} MRU</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Solde dû</p>
            <p className="text-lg font-bold text-red-500">{(totalStandardImpaye + arrearsAmount).toLocaleString("fr-FR")} MRU</p>
          </div>
        </div>

        {/* Lignes de comptabilisation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {lignes.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.label} className={`rounded-xl ${l.bg} p-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${l.color}`} />
                  <span className="text-xs font-medium text-foreground">{l.label}</span>
                </div>
                <span className={`text-sm font-bold ${l.color}`}>{l.value.toLocaleString("fr-FR")} MRU</span>
              </div>
            );
          })}
        </div>

        {/* Détail par année */}
        {standardCots.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Répartition par année</p>
            <div className="space-y-1.5">
              {Object.entries(
                standardCots.reduce((acc, c) => {
                  if (!acc[c.annee]) acc[c.annee] = { paye: 0, impaye: 0, count: 0 };
                  if (c.paye) acc[c.annee].paye += c.montant || 0;
                  else acc[c.annee].impaye += c.montant || 0;
                  acc[c.annee].count++;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[0] - a[0])
                .map(([annee, data]) => (
                  <div key={annee} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/40">
                    <span className="font-medium text-foreground">{annee} <span className="text-muted-foreground">({data.count} mois)</span></span>
                    <div className="flex gap-3">
                      <span className="text-emerald-600 font-semibold">{data.paye.toLocaleString("fr-FR")} MRU</span>
                      {data.impaye > 0 && <span className="text-amber-600 font-semibold">-{data.impaye.toLocaleString("fr-FR")} MRU</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}