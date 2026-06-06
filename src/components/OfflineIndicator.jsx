import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function OfflineIndicator() {
  const queryClient = useQueryClient();
  const { isOnline, pendingCount, syncing } = useOfflineSync(() => {
    queryClient.invalidateQueries();
  });

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-semibold transition-all duration-300 ${
      isOnline ? "bg-amber-500 text-white" : "bg-red-600 text-white"
    }`}>
      {isOnline ? (
        <>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisation en cours..." : `${pendingCount} action(s) en attente de sync`}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Hors ligne — Mode consultation activé
        </>
      )}
    </div>
  );
}