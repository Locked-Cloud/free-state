import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPendingActions, markPendingActionProcessed } from '../utils/offlineStorage';

// Define the PendingAction interface based on the structure in offlineStorage.ts
interface PendingAction {
  id: number;
  type: string;
  data: any;
  url?: string;
  method?: string;
  timestamp: number;
  processed: boolean;
}

interface NetworkContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  syncPendingActions: () => Promise<void>;
  isSyncing: boolean;
  syncError: Error | null;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(isOnline ? new Date() : null);
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(!isOnline ? new Date() : null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Handle online status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOfflineAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  // Function to sync pending actions with the server
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncError(null);

      const pendingActions = await getPendingActions() as PendingAction[];
      const unprocessedActions = pendingActions.filter(action => !action.processed);

      if (unprocessedActions.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing ${unprocessedActions.length} pending actions...`);

      // Process each pending action
      for (const action of unprocessedActions as PendingAction[]) {
        try {
          if (action.url && action.method) {
            // If we have URL and method, make an API call
            const response = await fetch(action.url, {
              method: action.method,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });

            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
          } else {
            // Otherwise, handle based on action type
            // This would be implemented based on your app's specific needs
            console.log(`Processing action of type: ${action.type}`);
          }

          // Mark action as processed
          await markPendingActionProcessed(action.id);
        } catch (err) {
          console.error(`Error processing action ${action.id}:`, err);
          // We continue processing other actions even if one fails
        }
      }

      console.log('Sync completed successfully');
    } catch (err) {
      console.error('Error syncing pending actions:', err);
      setSyncError(err instanceof Error ? err : new Error('Failed to sync data'));
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Sync pending actions when back online
  useEffect(() => {
    if (isOnline) {
      syncPendingActions();
    }
  }, [isOnline, syncPendingActions]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        lastOnlineAt,
        lastOfflineAt,
        syncPendingActions,
        isSyncing,
        syncError,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};