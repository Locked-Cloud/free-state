import React from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import styles from './NetworkStatus.module.css';

interface NetworkStatusProps {
  showDetails?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ showDetails = false }) => {
  const { isOnline } = useNetwork();




  return (
    <div className={`${styles.container} ${isOnline ? styles.online : styles.offline} ${styles.navbarStyle}`}>
      <div className={styles.statusIndicator}>
        <span className={styles.dot}></span>
        
      </div>

      
    </div>
  );
};

export default NetworkStatus;