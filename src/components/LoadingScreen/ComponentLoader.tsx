import React from 'react';
import styles from './ComponentLoader.module.css';

interface ComponentLoaderProps {
  message?: string;
  variant?: 'default' | 'inline' | 'overlay';
  className?: string;
}

const ComponentLoader: React.FC<ComponentLoaderProps> = ({
  message = 'Loading...',
  variant = 'default',
  className = '',
}) => {
  const containerClass = `${styles.loaderContainer} ${
    variant === 'inline' ? styles.inline : ''
  } ${variant === 'overlay' ? styles.overlay : ''} ${className}`;

  return (
    <div className={containerClass}>
      <div className={styles.spinner}>
        <div className={styles.spinnerCircle}></div>
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
};

export default ComponentLoader;