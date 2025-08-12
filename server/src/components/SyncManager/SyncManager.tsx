import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import { getPendingActions } from '../../utils/offlineStorage';
import styles from './SyncManager.module.css';

// Define the PendingAction interface
interface PendingAction {
  id: number;
  type: string;
  data: any;
  url?: string;
  method?: string;
  timestamp: number;
  processed: boolean;
}

interface SyncManagerProps {
  onSyncComplete?: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ onSyncComplete }) => {
  const { isOnline, syncPendingActions, isSyncing } = useNetwork();
  const [pendingCount, setPendingCount] = useState<number>(0);
  // We don't need showNotification state anymore since we're always showing the component in navbar

  // Check for pending actions
  useEffect(() => {
    const checkPendingActions = async () => {
      if (isOnline) {
        const actions = await getPendingActions() as PendingAction[];
        const unprocessedCount = actions.filter(a => !a.processed).length;
        setPendingCount(unprocessedCount);
      }
    };

    checkPendingActions();
    // Check every minute when online
    const interval = setInterval(() => {
      if (isOnline) {
        checkPendingActions();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Call onSyncComplete after successful sync
  useEffect(() => {
    if (!isSyncing && pendingCount === 0) {
      if (onSyncComplete) {
        onSyncComplete();
      }
    }
  }, [isSyncing, pendingCount, onSyncComplete]);

  const handleSync = async () => {
    await syncPendingActions();
    // Recheck pending count after sync
    const actions = await getPendingActions() as PendingAction[];
    const unprocessedCount = actions.filter(a => !a.processed).length;
    setPendingCount(unprocessedCount);
  };

  // We don't need handleDismiss anymore since we're not showing a dismissable notification

  // For navbar, we'll show a simple icon with a badge if there are pending changes
  return (
    <div className={styles.navbarContainer}>
      {isOnline && pendingCount > 0 && (
        <button 
          className={`${styles.navbarSyncButton} ${isSyncing ? styles.syncing : ''}`}
          onClick={handleSync}
          disabled={isSyncing}
          title={`${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} pending. Click to sync.`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span className={styles.badge}>{pendingCount}</span>
        </button>
      )}
    </div>
  );
};

export default SyncManager;