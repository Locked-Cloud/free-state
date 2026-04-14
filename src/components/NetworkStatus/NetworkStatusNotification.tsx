import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';


import styles from './NetworkStatusNotification.module.css';
import { WifiOff, Wifi, X } from 'react-feather';

const NetworkStatusNotification: React.FC = () => {
  const { isOnline } = useNetwork();
  const [visible, setVisible] = useState(false);
  const [lastStatus, setLastStatus] = useState(isOnline);

  // Show notification when network status changes
  useEffect(() => {
    if (lastStatus !== isOnline) {
      setVisible(true);
      setLastStatus(isOnline);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, lastStatus]);

  if (!visible) return null;

  return (
    <div className={`${styles.notification} ${isOnline ? styles.online : styles.offline}`}>
      <div className={styles.content}>
        {isOnline ? (
          <>
            <Wifi size={18} />
            <span>You're back online!</span>
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <span>You're offline. Some features may be limited.</span>
          </>
        )}
      </div>
      
      <div className={styles.actions}>
        
        <button className={styles.closeButton} onClick={() => setVisible(false)}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NetworkStatusNotification;