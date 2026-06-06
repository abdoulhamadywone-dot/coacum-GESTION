import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "coacum_offline_cache";
const QUEUE_KEY = "coacum_sync_queue";

// Save data to localStorage cache
export function saveToCache(key, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    cache[key] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (_) {}
}

// Read from localStorage cache
export function readFromCache(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return cache[key]?.data || null;
  } catch (_) {
    return null;
  }
}

// Add a pending action to the sync queue
export function enqueueAction(action) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    queue.push({ ...action, id: Date.now() + Math.random() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

// Get pending queue
export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

// Clear the queue after sync
function clearQueue() {
  localStorage.setItem(QUEUE_KEY, "[]");
}

// Hook: online/offline state + auto-sync
export function useOfflineSync(onSyncDone) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getQueue().length);
  const [syncing, setSyncing] = useState(false);

  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    try {
      for (const action of queue) {
        const entity = base44.entities[action.entity];
        if (!entity) continue;
        if (action.type === "create") await entity.create(action.data);
        else if (action.type === "update") await entity.update(action.recordId, action.data);
        else if (action.type === "delete") await entity.delete(action.recordId);
      }
      clearQueue();
      setPendingCount(0);
      onSyncDone?.();
    } catch (_) {
    } finally {
      setSyncing(false);
    }
  }, [onSyncDone]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  useEffect(() => {
    setPendingCount(getQueue().length);
  }, []);

  return { isOnline, pendingCount, syncing };
}