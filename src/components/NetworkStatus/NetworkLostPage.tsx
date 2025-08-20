import React, { useEffect } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import { useNavigate } from 'react-router-dom';
import OfflineNotification from './OfflineNotification';
import styles from './NetworkLostPage.module.css';

const NetworkLostPage: React.FC = () => {
  const { isOnline } = useNetwork();
  const navigate = useNavigate();

  // If user is online, redirect to network status page
  useEffect(() => {
    if (isOnline) {
      navigate('/network-status');
    }
  }, [isOnline, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <OfflineNotification 
        onRefresh={handleRefresh}
        onGoHome={handleGoHome}
      />
    </div>
  );
};

export default NetworkLostPage;