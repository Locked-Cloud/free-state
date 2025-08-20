import React from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import styles from './NetworkStatus.module.css';

interface NetworkStatusProps {
  showDetails?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ showDetails = false }) => {
  const { isOnline, lastOnlineAt, lastOfflineAt, isSyncing } = useNetwork();

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className={`${styles.container} ${isOnline ? styles.online : styles.offline} ${styles.navbarStyle}`}>
      <div className={styles.statusIndicator}>
        <span className={styles.dot}></span>
        
      </div>

      
    </div>
  );
};

export default NetworkStatus;