import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, Wallet, Receipt, Calendar, TrendingUp, TrendingDown, AlertTriangle, Trophy } from "lucide-react";
import StatCard from "../components/StatCard";
import ExportPDF from "../components/ExportPDF";
import { useAuth } from "@/lib/AuthContext";
import useAnimatedCounter from "../hooks/useAnimatedCounter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine
} from "recharts";

const COLORS = ["hsl(38,95%,48%)", "hsl(25,95%,53%)", "hsl(197,37%,32%)", "hsl(142,55%,40%)", "hsl(0,84%,60%)"];
const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const MOIS_NUMS = { JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,AOÛT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12 };

function AnimatedStat({ value, suffix = "", prefix = "" }) {
  const animated = useAnimatedCounter(value);
  return <span>{prefix}{animated.toLocaleString()}{suffix}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list() });
  const { data: cotisations = [] } = useQuery({ queryKey: ["cotisations"], queryFn: () => base44.entities.Cotisation.list() });
  const { data: depenses = [] } = useQuery({ queryKey: ["depenses"], queryFn: () => base44.entities.Depense.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ["evenements"], queryFn: () => base44.entities.Evenement.list() });

  // For non-admin: find the matching membre record and filter personal cotisations
  const monMembre = !isAdmin ? membres.find(m => m.nom === user?.full_name) : null;
  const mesCotisations = !isAdmin ? cotisations.filter(c => c.membre_nom === user?.full_name) : [];

  const totalCotisations = cotisations.reduce((s, c) => s + (c.montant || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const membresActifs = membres.filter((m) => m.statut === "actif").length;
  const solde = totalCotisations - totalDepenses;

  // Personal stats for non-admin
  const monTotal = mesCotisations.reduce((s, c) => s + (c.montant || 0), 0);
  const monDernier = mesCotisations.sort((a,b) => {
    const key = (c) => (c.annee*100)+(MOIS_NUMS[(c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]||0);
    return key(b)-key(a);
  })[0];
  const monMoisPayes = mesCotisations.length;

  // Late members (actif, not paid in last 3 months of data)
  const allCols = [...new Set(cotisations.map(c => {
    const mNorm = (c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return `${mNorm}|${c.annee}`;
  }))].sort((a,b)=>{
    const [ma,ya]=a.split('|'), [mb,yb]=b.split('|');
    return (parseInt(yb)*100+(MOIS_NUMS[mb]||0))-(parseInt(ya)*100+(MOIS_NUMS[ma]||0));
  });
  const recentCols = allCols.slice(0,3);
  const paidInRecent = new Set(cotisations.filter(c => {
    const mNorm = (c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return recentCols.includes(`${mNorm}|${c.annee}`);
  }).map(c=>c.membre_nom));
  const lateMembers = membres.filter(m => m.statut === 'actif' && !paidInRecent.has(m.nom));

  // Monthly revenue vs expenses chart
  const monthData = {};
  cotisations.forEach(c => {
    const mNorm = (c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const key = `${mNorm}|${c.annee}`;
    if (!monthData[key]) monthData[key] = { name: `${c.mois?.slice(0,3)} ${String(c.annee).slice(2)}`, cotisations: 0, depenses: 0, _sort: (parseInt(c.annee)*100)+(MOIS_NUMS[mNorm]||0) };
    monthData[key].cotisations += (c.montant || 0);
  });
  depenses.forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    const mois = date.toLocaleDateString('fr-FR', { month: 'short' });
    const an = String(date.getFullYear()).slice(2);
    const key = `${mois} ${an}`;
    if (!monthData[key]) monthData[key] = { name: key, cotisations: 0, depenses: 0, _sort: date.getFullYear()*100+date.getMonth() };
    monthData[key].depenses += (d.montant || 0);
  });
  const areaData = Object.values(monthData).sort((a,b) => a._sort - b._sort).slice(-8);

  // Expenses by category
  const depByRub = {};
  depenses.forEach(d => { depByRub[d.rubrique] = (depByRub[d.rubrique] || 0) + (d.montant || 0); });
  const pieData = Object.entries(depByRub).map(([name, value]) => ({ name, value }));

  // Top 5 contributors
  const contrib = {};
  cotisations.forEach(c => { contrib[c.membre_nom] = (contrib[c.membre_nom] || 0) + (c.montant || 0); });
  const top5 = Object.entries(contrib).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxContrib = top5[0]?.[1] || 1;

  // Prochain événement
  const prochainEvenement = evenements
    .filter(e => e.statut === 'planifié' && e.date_debut)
    .sort((a,b) => new Date(a.date_debut) - new Date(b.date_debut))[0];

  // Countdown
  const daysUntil = prochainEvenement ? Math.ceil((new Date(prochainEvenement.date_debut) - new Date()) / 86400000) : null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-52 md:h-64 shadow-xl">
        <img src="https://media.base44.com/images/public/6a18cbfaee75eb22cc08c34e/2b2c866bd_generated_image.png" alt="COACUM" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Tableau de bord</p>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            Bienvenue{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-1">Coalition des Acteurs des Cultures Urbaines de Mauritanie</p>
        </div>
        {isAdmin && <div className="absolute top-4 right-4 no-print"><ExportPDF cotisations={cotisations} depenses={depenses} membres={membres} /></div>}
      </div>

      {/* Late members alert (admin only) */}
      {isAdmin && lateMembers.length > 0 && (
        <Link
          to="/membres"
          className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm">{lateMembers.length} membre{lateMembers.length > 1 ? 's' : ''} en retard de cotisation</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                {lateMembers.slice(0,5).map(m => m.nom).join(', ')}{lateMembers.length > 5 ? ` et ${lateMembers.length-5} autres...` : ''}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Gérer →</span>
        </Link>
      )}

      {/* Stats grid */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Membres" value={<AnimatedStat value={membres.length} />} subtitle={`${membresActifs} actifs`} icon={Users} color="primary" href="/membres" />
          <StatCard title="Cotisations" value={<AnimatedStat value={totalCotisations} suffix=" MRU" />} subtitle={`${cotisations.length} paiements`} icon={Wallet} color="accent" href="/cotisations" />
          <StatCard title="Dépenses" value={<AnimatedStat value={totalDepenses} suffix=" MRU" />} subtitle={`${depenses.length} entrées`} icon={Receipt} color="destructive" href="/depenses" />
          <StatCard title="Événements" value={<AnimatedStat value={evenements.length} />} subtitle={`${evenements.filter(e=>e.statut==='planifié').length} planifiés`} icon={Calendar} color="muted" href="/evenements" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Mes cotisations" value={<AnimatedStat value={monTotal} suffix=" MRU" />} subtitle={`${monMoisPayes} mois payés`} icon={Wallet} color="accent" href="/cotisations" />
          <StatCard title="Dernier paiement" value={monDernier ? `${monDernier.mois?.slice(0,3)} ${monDernier.annee}` : "—"} subtitle={monDernier ? `${monDernier.montant} MRU` : "Aucun"} icon={Calendar} color="primary" />
          <StatCard title="Événements" value={<AnimatedStat value={evenements.length} />} subtitle={`${evenements.filter(e=>e.statut==='planifié').length} à venir`} icon={Calendar} color="muted" href="/evenements" />
        </div>
      )}

      {/* Solde + prochain événement */}
      {isAdmin ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`rounded-2xl p-6 text-white shadow-lg ${solde >= 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">Solde financier</p>
              {solde >= 0 ? <TrendingUp className="h-5 w-5 text-white/70" /> : <TrendingDown className="h-5 w-5 text-white/70" />}
            </div>
            <p className="text-4xl font-bold"><AnimatedStat value={Math.abs(solde)} prefix={solde < 0 ? "-" : "+"} suffix=" MRU" /></p>
            <p className="text-xs text-white/60 mt-2">Cotisations − Dépenses</p>
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full transition-all duration-1000" style={{width: `${Math.min(100, (totalCotisations/(totalCotisations+totalDepenses||1))*100)}%`}} />
            </div>
            <p className="text-[10px] text-white/50 mt-1">Taux de couverture</p>
          </div>

          <Link to="/evenements" className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 block">
            <p className="text-sm font-medium text-muted-foreground mb-3">⏰ Prochain événement</p>
            {prochainEvenement ? (
              <>
                <p className="text-lg font-bold text-foreground">{prochainEvenement.titre}</p>
                <p className="text-sm text-muted-foreground mt-1">{prochainEvenement.date_debut}{prochainEvenement.lieu ? ` · ${prochainEvenement.lieu}` : ''}</p>
                {daysUntil !== null && daysUntil >= 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                    <span className="text-2xl font-bold text-primary">{daysUntil}</span>
                    <span className="text-xs text-primary/70">jour{daysUntil !== 1 ? 's' : ''} restant{daysUntil !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun événement à venir</p>
            )}
            <p className="text-xs text-primary/60 mt-3 font-medium">Voir tous les événements →</p>
          </Link>
        </div>
      ) : (
        /* Personal summary card for non-admin */
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">📋 Résumé de mes cotisations</h3>
          {mesCotisations.length > 0 ? (
            <div className="space-y-2">
              {mesCotisations.sort((a,b) => {
                const key = (c) => (c.annee*100)+(MOIS_NUMS[(c.mois||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]||0);
                return key(b)-key(a);
              }).slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{c.mois} {c.annee}</span>
                  <span className="text-sm font-bold text-emerald-600">{c.montant} MRU</span>
                </div>
              ))}
              {mesCotisations.length > 6 && (
                <Link to="/cotisations" className="text-xs text-primary hover:underline block text-center pt-1">
                  Voir les {mesCotisations.length} paiements →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune cotisation enregistrée. Contactez un administrateur.</p>
          )}
          {mesCotisations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm font-semibold">
              <span>Total versé</span>
              <span className="text-amber-600">{monTotal.toLocaleString()} MRU</span>
            </div>
          )}
        </div>
      )}

      {/* Charts & Analytics (admin only) */}
      {isAdmin && (
        <>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-1">Revenus vs Dépenses</h3>
            <p className="text-xs text-muted-foreground mb-5">Évolution sur les 8 derniers mois</p>
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="gradCot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38,95%,48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38,95%,48%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(38,15%,90%)" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [`${v.toLocaleString()} MRU`, n === 'cotisations' ? 'Cotisations' : 'Dépenses']} />
                  <Area type="monotone" dataKey="cotisations" stroke="hsl(38,95%,48%)" strokeWidth={2} fill="url(#gradCot)" />
                  <Area type="monotone" dataKey="depenses" stroke="hsl(0,84%,60%)" strokeWidth={2} fill="url(#gradDep)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Aucune donnée</div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Top 5 Contributeurs</h3>
              <p className="text-xs text-muted-foreground mb-4">Membres ayant le plus cotisé</p>
              <div className="space-y-3">
                {top5.map(([nom, total], idx) => (
                  <div key={nom} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{MEDALS[idx]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{nom}</p>
                        <p className="text-xs font-bold text-primary ml-2">{total.toLocaleString()} MRU</p>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(total/maxContrib)*100}%`, background: idx === 0 ? 'hsl(38,95%,48%)' : idx === 1 ? 'hsl(200,80%,55%)' : idx === 2 ? 'hsl(25,95%,53%)' : 'hsl(142,55%,45%)' }} />
                      </div>
                    </div>
                  </div>
                ))}
                {top5.length === 0 && <p className="text-muted-foreground text-sm">Aucune donnée</p>}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-1">Dépenses par catégorie</h3>
              <p className="text-xs text-muted-foreground mb-4">Répartition des dépenses</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="44%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v.toLocaleString()} MRU`, '']} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm"><Receipt className="h-6 w-6 mr-2 opacity-30" />Aucune dépense</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}