import React from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  message?: string;
  subText?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  subText = 'Please wait while we load your content',
}) => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <div className={styles.spinner}>
          <div className={styles.spinnerOuter}></div>
          <div className={styles.spinnerMiddle}></div>
          <div className={styles.spinnerInner}></div>
        </div>
        <p className={styles.loadingText}>{message}</p>
        {subText && <p className={styles.loadingSubtext}>{subText}</p>}
      </div>
    </div>
  );
};

export default LoadingScreen;