import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Shield, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function Administration() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: users = [], refetch } = useQuery({
    queryKey: ["users-admin"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center px-8">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground max-w-sm">
          Cette page est réservée aux administrateurs. Contactez un administrateur pour obtenir les droits nécessaires.
        </p>
      </div>
    );
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), "admin");
      toast.success(`Invitation envoyée à ${email}`);
      setEmail("");
      refetch();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const admins = users.filter((u) => u.role === "admin");
  const regularUsers = users.filter((u) => u.role !== "admin");

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">Gérer les accès et inviter des administrateurs</p>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Rôles :</strong> Les <strong>administrateurs</strong> peuvent tout créer, modifier et supprimer. Les <strong>membres connectés</strong> peuvent uniquement consulter les données (lecture seule).
      </div>

      {/* Invite form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Inviter un administrateur</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          L'invité recevra un email pour créer son compte avec les droits d'administration complets.
        </p>
        <form onSubmit={handleInvite} className="flex gap-3">
          <Input
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            {loading ? "Envoi..." : "Inviter"}
          </Button>
        </form>
      </div>

      {/* Admins list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Administrateurs ({admins.length})</h2>
        </div>
        {admins.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun administrateur trouvé</p>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Admin</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regular users */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Membres connectés — Lecture seule ({regularUsers.length})</h2>
        </div>
        {regularUsers.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun membre connecté</p>
        ) : (
          <div className="divide-y divide-border">
            {regularUsers.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Lecture seule</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}