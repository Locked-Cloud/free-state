import React, { useState, useEffect } from 'react';
import styles from './PWAInstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');

    if (isAppInstalled) {
      return; // Don't show install prompt if already installed
    }

    // Store the install prompt event for later use
    const handleBeforeInstallPrompt = (e: Event) => {
      // Don't prevent default here to allow the browser to show its own UI if needed
      // Instead, we'll capture the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Only show our custom prompt if the user hasn't dismissed it before
      const hasUserDismissedPrompt = localStorage.getItem('pwaPromptDismissed');
      if (!hasUserDismissedPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    try {
      // Show the install prompt
      await installPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await installPrompt.userChoice;
      
      // Log the user's choice (for analytics purposes)
      console.log(`User ${choiceResult.outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
      
      // If the user accepted, we can hide our custom UI
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA was installed successfully');
      } else {
        // If dismissed, remember this choice to avoid showing again too soon
        localStorage.setItem('pwaPromptDismissed', 'true');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      // Clear the saved prompt since it can't be used twice
      setInstallPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that the user dismissed the prompt
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptContent}>
        <div className={styles.promptIcon}>📱</div>
        <div className={styles.promptText}>
          <h3>Install Free State App</h3>
          <p>Install this app on your device for a better experience with offline access.</p>
        </div>
        <div className={styles.promptActions}>
          <button className={styles.installButton} onClick={handleInstallClick}>
            Install
          </button>
          <button className={styles.dismissButton} onClick={handleDismiss}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;