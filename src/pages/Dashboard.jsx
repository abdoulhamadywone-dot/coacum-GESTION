import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Wallet, Receipt, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import StatCard from "../components/StatCard";
import ExportPDF from "../components/ExportPDF";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useAuth } from "@/lib/AuthContext";

const COLORS = ["hsl(142,55%,40%)", "hsl(30,90%,55%)", "hsl(197,37%,24%)", "hsl(43,74%,66%)", "hsl(0,84%,60%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  const totalCotisations = cotisations.reduce((s, c) => s + (c.montant || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const membresActifs = membres.filter((m) => m.statut === "actif").length;
  const solde = totalCotisations - totalDepenses;

  const cotByMonth = {};
  cotisations.forEach((c) => {
    const key = `${c.mois} ${c.annee}`;
    cotByMonth[key] = (cotByMonth[key] || 0) + (c.montant || 0);
  });
  const cotChartData = Object.entries(cotByMonth).map(([name, total]) => ({ name, total })).slice(-8);

  const depByRub = {};
  depenses.forEach((d) => {
    depByRub[d.rubrique] = (depByRub[d.rubrique] || 0) + (d.montant || 0);
  });
  const depChartData = Object.entries(depByRub).map(([name, value]) => ({ name, value }));

  const prochainEvenement = evenements
    .filter(e => e.statut === 'planifié' && e.date_debut)
    .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))[0];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-52 md:h-64">
        <img
          src="https://media.base44.com/images/public/6a18cbfaee75eb22cc08c34e/2b2c866bd_generated_image.png"
          alt="COACUM"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">Tableau de bord</p>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            Bienvenue{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-1">
            Coalition des Acteurs des Cultures Urbaines de Mauritanie
          </p>
        </div>
        <div className="absolute top-4 right-4">
          <ExportPDF cotisations={cotisations} depenses={depenses} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Membres" value={membres.length} subtitle={`${membresActifs} actifs`} icon={Users} color="primary" href="/membres" />
        <StatCard title="Cotisations" value={`${totalCotisations.toLocaleString()} MRU`} subtitle={`${cotisations.length} paiements`} icon={Wallet} color="accent" href="/cotisations" />
        <StatCard title="Dépenses" value={`${totalDepenses.toLocaleString()} MRU`} subtitle={`${depenses.length} entrées`} icon={Receipt} color="destructive" href="/depenses" />
        <StatCard title="Événements" value={evenements.length} subtitle={`${evenements.filter(e => e.statut === 'planifié').length} planifiés`} icon={Calendar} color="muted" href="/evenements" />
      </div>

      {/* Solde + prochain événement */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`rounded-2xl p-6 text-white ${solde >= 0 ? 'bg-gradient-to-br from-primary to-emerald-700' : 'bg-gradient-to-br from-destructive to-red-700'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Solde financier</p>
            {solde >= 0 ? <TrendingUp className="h-5 w-5 text-white/70" /> : <TrendingDown className="h-5 w-5 text-white/70" />}
          </div>
          <p className="text-4xl font-bold">{solde.toLocaleString()} MRU</p>
          <p className="text-xs text-white/60 mt-2">Cotisations − Dépenses</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Prochain événement</p>
          {prochainEvenement ? (
            <>
              <p className="text-lg font-bold text-foreground">{prochainEvenement.titre}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {prochainEvenement.date_debut}{prochainEvenement.lieu ? ` · ${prochainEvenement.lieu}` : ''}
              </p>
              <span className="inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">Planifié</span>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun événement à venir</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-1">Cotisations par mois</h3>
          <p className="text-xs text-muted-foreground mb-5">Historique des 8 derniers mois</p>
          {cotChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cotChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,92%)" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tick={{ fill: "hsl(150,5%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} tick={{ fill: "hsl(150,5%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} MRU`, 'Total']} />
                <Bar dataKey="total" fill="hsl(142,55%,40%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Aucune donnée de cotisation</p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-1">Dépenses par catégorie</h3>
          <p className="text-xs text-muted-foreground mb-5">Répartition des dépenses</p>
          {depChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={depChartData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {depChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v.toLocaleString()} MRU`, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Aucune dépense enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}