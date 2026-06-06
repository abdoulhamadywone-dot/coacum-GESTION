import { QueryClient } from '@tanstack/react-query';
import { saveToCache, readFromCache } from '@/hooks/useOfflineSync';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Keep data in memory longer for offline use
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 30 * 60 * 1000, // 30 minutes in memory
			// Use cached data when offline
			networkMode: 'offlineFirst',
		},
		mutations: {
			networkMode: 'offlineFirst',
		},
	},
});

// Persist query data to localStorage whenever it changes
queryClientInstance.getQueryCache().subscribe((event) => {
	if (event?.type === 'updated' && event.query?.state?.data) {
		const key = JSON.stringify(event.query.queryKey);
		saveToCache(key, event.query.state.data);
	}
});