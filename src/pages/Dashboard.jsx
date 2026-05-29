import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Wallet, Receipt, Calendar } from "lucide-react";
import StatCard from "../components/StatCard";
import ExportPDF from "../components/ExportPDF";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(142,55%,40%)", "hsl(30,90%,55%)", "hsl(197,37%,24%)", "hsl(43,74%,66%)", "hsl(0,84%,60%)"];

export default function Dashboard() {
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  const totalCotisations = cotisations.reduce((s, c) => s + (c.montant || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const membresActifs = membres.filter((m) => m.statut === "actif").length;

  // Cotisations by month
  const cotByMonth = {};
  cotisations.forEach((c) => {
    const key = `${c.mois} ${c.annee}`;
    cotByMonth[key] = (cotByMonth[key] || 0) + (c.montant || 0);
  });
  const cotChartData = Object.entries(cotByMonth).map(([name, total]) => ({ name, total })).slice(-8);

  // Depenses by rubrique
  const depByRub = {};
  depenses.forEach((d) => {
    depByRub[d.rubrique] = (depByRub[d.rubrique] || 0) + (d.montant || 0);
  });
  const depChartData = Object.entries(depByRub).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Actions */}
      <div className="flex justify-end">
        <ExportPDF cotisations={cotisations} depenses={depenses} />
      </div>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <img
          src="https://media.base44.com/images/public/6a18cbfaee75eb22cc08c34e/2b2c866bd_generated_image.png"
          alt="COACUM"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Bienvenue sur COACUM</h1>
          <p className="text-white/80 text-sm md:text-base mt-2 max-w-lg">
            Coalition des Acteurs des Cultures Urbaines de Mauritanie
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Membres" value={membres.length} subtitle={`${membresActifs} actifs`} icon={Users} color="primary" href="/membres" />
        <StatCard title="Cotisations" value={`${totalCotisations.toLocaleString()} MRU`} subtitle={`${cotisations.length} paiements`} icon={Wallet} color="accent" href="/cotisations" />
        <StatCard title="Dépenses" value={`${totalDepenses.toLocaleString()} MRU`} subtitle={`${depenses.length} entrées`} icon={Receipt} color="destructive" href="/depenses" />
        <StatCard title="Événements" value={evenements.length} icon={Calendar} color="muted" href="/evenements" />
      </div>

      {/* Solde */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Solde (Cotisations - Dépenses)</h3>
        <p className={`text-3xl font-bold mt-2 ${totalCotisations - totalDepenses >= 0 ? "text-primary" : "text-destructive"}`}>
          {(totalCotisations - totalDepenses).toLocaleString()} MRU
        </p>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Cotisations par mois</h3>
          {cotChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cotChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: "hsl(150,5%,45%)" }} />
                <YAxis fontSize={11} tick={{ fill: "hsl(150,5%,45%)" }} />
                <Tooltip formatter={(v) => `${v} MRU`} />
                <Bar dataKey="total" fill="hsl(142,55%,40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Aucune donnée de cotisation</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Dépenses par catégorie</h3>
          {depChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={depChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {depChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} MRU`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Aucune dépense enregistrée</p>
          )}
        </div>
      </div>
    </div>
  );
}