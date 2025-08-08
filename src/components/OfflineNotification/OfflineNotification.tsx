import React from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import styles from './OfflineNotification.module.css';

interface OfflineNotificationProps {
  lastUpdated?: Date | null;
  resourceType?: string;
}

const OfflineNotification: React.FC<OfflineNotificationProps> = ({
  lastUpdated,
  resourceType = 'data'
}) => {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'unknown time';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
      <div className={styles.message}>
        <p className={styles.title}>You're offline</p>
        <p className={styles.description}>
          Viewing cached {resourceType} from {formatDate(lastUpdated)}.
          Content will update automatically when you're back online.
        </p>
      </div>
    </div>
  );
};

export default OfflineNotification;