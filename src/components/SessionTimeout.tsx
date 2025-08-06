// Session Timeout Warning Component
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./SessionTimeout.module.css";

interface SessionTimeoutProps {
  warningThreshold?: number; // milliseconds before expiry to show warning
  onExtend?: () => void;
  onLogout?: () => void;
}

const SessionTimeout: React.FC<SessionTimeoutProps> = ({
  warningThreshold = 5 * 60 * 1000, // 5 minutes default
  onExtend,
  onLogout,
}) => {
  const { logout, isAuthenticated } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(warningThreshold);
  const [isExpiring, setIsExpiring] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    setShowWarning(isExpiring && timeRemaining > 0);
  }, [isExpiring, timeRemaining, isAuthenticated]);

  const handleExtendSession = async () => {
    try {
      setIsExtending(true);
      // Reset the timer
      setTimeRemaining(warningThreshold);
      setIsExpiring(false);
      onExtend?.();
      setShowWarning(false);
    } catch (error) {
      console.error("Failed to extend session:", error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout?.();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  if (!showWarning || !isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconContainer}>
          <div className={styles.warningIcon}>⏰</div>
        </div>

        <h2 className={styles.title}>Session Expiring Soon</h2>

        <div className={styles.timeDisplay}>
          <span className={styles.timeRemaining}>
            {Math.floor(timeRemaining / 60000)}:
            {((timeRemaining % 60000) / 1000).toFixed(0).padStart(2, "0")}
          </span>
          <p className={styles.subtitle}>remaining</p>
        </div>

        <p className={styles.message}>
          Your session will expire automatically for security reasons. You can
          extend your session or logout now.
        </p>

        <div className={styles.actions}>
          <button
            onClick={handleExtendSession}
            disabled={isExtending}
            className={styles.extendButton}
          >
            {isExtending ? (
              <>
                <span className={styles.spinner}></span>
                Extending...
              </>
            ) : (
              "Extend Session"
            )}
          </button>

          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout Now
          </button>
        </div>

        <div className={styles.securityNote}>
          <small>
            🔒 This security measure protects your account from unauthorized
            access.
          </small>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeout;
