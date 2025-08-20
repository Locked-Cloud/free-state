import React, { useEffect, useState } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import styles from './NetworkStatusPage.module.css';
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Activity, Clock } from 'react-feather';

const NetworkStatusPage: React.FC = () => {
  const { isOnline, lastOnlineAt, lastOfflineAt, syncPendingActions, isSyncing, syncError } = useNetwork();
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get connection details if available
  useEffect(() => {
    const getConnectionDetails = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          return {
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink ? `${connection.downlink} Mbps` : 'unknown',
            rtt: connection.rtt ? `${connection.rtt} ms` : 'unknown',
            saveData: connection.saveData ? 'On' : 'Off',
          };
        }
      }
      return null;
    };

    setConnectionDetails(getConnectionDetails());

    // Set up event listener for connection changes if available
    const connection = (navigator as any).connection;
    if (connection) {
      const updateConnectionDetails = () => {
        setConnectionDetails(getConnectionDetails());
      };

      connection.addEventListener('change', updateConnectionDetails);
      return () => connection.removeEventListener('change', updateConnectionDetails);
    }
  }, []);

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  // Handle manual sync
  const handleSync = async () => {
    if (isOnline && !isSyncing) {
      setRefreshing(true);
      await syncPendingActions();
      setTimeout(() => setRefreshing(false), 1000); // Show refreshing state for at least 1 second
    }
  };

  // Handle connection test
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const testConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    
    try {
      const startTime = Date.now();
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache',
      });
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      setTestResult({
        success: true,
        message: `Connection successful! Latency: ${latency}ms`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed. You appear to be offline.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Network Status
      </h1>

      {/* Current Status */}
      <div className={`${styles.card} ${isOnline ? styles.online : styles.offline}`}>
        <div className={styles.statusHeader}>
          {isOnline ? (
            <CheckCircle size={24} className={styles.statusIcon} />
          ) : (
            <AlertCircle size={24} className={styles.statusIcon} />
          )}
          <h2 className={styles.statusTitle}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </h2>
        </div>
        <div className={styles.statusDetails}>
          {isOnline ? (
            <p>Your device is connected to the internet.</p>
          ) : (
            <p>Your device is currently offline. Some features may be limited.</p>
          )}
          <div className={styles.timestamps}>
            {isOnline ? (
              <p><Clock size={16} /> Connected since: {formatDate(lastOnlineAt)}</p>
            ) : (
              <p><Clock size={16} /> Disconnected since: {formatDate(lastOfflineAt)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Connection Details */}
      {connectionDetails && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Activity size={20} /> Connection Details
          </h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Connection Type:</span>
              <span className={styles.detailValue}>{connectionDetails.effectiveType}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Bandwidth:</span>
              <span className={styles.detailValue}>{connectionDetails.downlink}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Latency (RTT):</span>
              <span className={styles.detailValue}>{connectionDetails.rtt}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Data Saver:</span>
              <span className={styles.detailValue}>{connectionDetails.saveData}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <RefreshCw size={20} /> Synchronization
        </h2>
        <div className={styles.syncStatus}>
          <p>
            {isSyncing ? 'Synchronizing data with server...' : 'Data synchronization idle'}
            {syncError && <span className={styles.errorText}>Error: {syncError.message}</span>}
          </p>
          <button 
            className={`${styles.button} ${(isSyncing || !isOnline) ? styles.disabled : ''}`}
            onClick={handleSync}
            disabled={isSyncing || !isOnline}
          >
            {refreshing || isSyncing ? (
              <>
                <RefreshCw size={16} className={styles.spinIcon} /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={16} /> Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Connection Test */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />} Connection Test
        </h2>
        <div className={styles.testContainer}>
          <p>Test your connection to verify internet access</p>
          <button 
            className={`${styles.button} ${testingConnection ? styles.disabled : ''}`}
            onClick={testConnection}
            disabled={testingConnection}
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          
          {testResult && (
            <div className={`${styles.testResult} ${testResult.success ? styles.success : styles.error}`}>
              {testResult.success ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className={`${styles.card} ${!isOnline ? styles.offline : ''}`}>
        <h2 className={styles.cardTitle}>What you can do:</h2>
        <ul className={styles.tipsList}>
          <li>Check your Wi-Fi or cellular data connection</li>
          <li>Try turning your router off and on again</li>
          <li>Move to an area with better signal strength</li>
          <li>Contact your internet service provider if the problem persists</li>
        </ul>
      </div>
    </div>
  );
};

export default NetworkStatusPage;