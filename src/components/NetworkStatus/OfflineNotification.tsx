import React from 'react';
import { WifiOff, RefreshCw, Home } from 'react-feather';


import styles from './OfflineNotification.module.css';

interface OfflineNotificationProps {
  onRefresh?: () => void;
  onGoHome?: () => void;
}

const OfflineNotification: React.FC<OfflineNotificationProps> = ({ 
  onRefresh = () => window.location.reload(), 
  onGoHome = () => window.location.href = '/' 
}) => {

  return (
    <div className={styles.offlineContainer}>
      <WifiOff size={48} className={styles.icon} />
      
      <h1 className={styles.title}>No Internet Connection</h1>
      
      <p className={styles.message}>
        It seems that you've lost your internet connection. You're currently
        viewing cached content in offline mode.
      </p>
      
      <div className={styles.tipsContainer}>
        <h2 className={styles.tipsTitle}>What you can do:</h2>
        <ul className={styles.tipsList}>
          <li>Check your Wi-Fi or cellular data connection</li>
          <li>Try turning your router off and on again</li>
          <li>Move to an area with better signal strength</li>
          <li>Contact your internet service provider if the problem persists</li>
        </ul>
      </div>
      
      <div className={styles.buttonContainer}>
        <button 
          className={styles.button} 
          onClick={onRefresh}
        >
          <RefreshCw size={16} /> Refresh Page
        </button>
        
        <button 
          className={`${styles.button} ${styles.secondaryButton}`} 
          onClick={onGoHome}
        >
          <Home size={16} /> Go to Homepage
        </button>
      </div>
    </div>
  );
};

export default OfflineNotification;