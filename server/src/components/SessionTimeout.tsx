// Enhanced Session Timeout Warning Component with improved security
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./SessionTimeout.module.css";

interface SessionTimeoutProps {
  warningThreshold?: number; // milliseconds before expiry to show warning
  sessionDuration?: number; // total session duration in milliseconds
  onExtend?: () => void;
  onLogout?: () => void;
  checkInterval?: number; // how often to check for session expiry (ms)
}

const SessionTimeout: React.FC<SessionTimeoutProps> = ({
  warningThreshold = 5 * 60 * 1000, // 5 minutes default
  sessionDuration = 30 * 60 * 1000, // 30 minutes default
  onExtend,
  onLogout,
  checkInterval = 10000, // 10 seconds default
}) => {
  const { logout, isAuthenticated, updateLastActivity, lastActivity } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(warningThreshold);
  const [isExpiring, setIsExpiring] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Check if session is about to expire
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    // Set up interval to check session status
    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      
      // If user has been inactive for longer than session duration minus warning threshold
      if (inactiveTime >= sessionDuration - warningThreshold) {
        // Start warning countdown
        if (!isExpiring) {
          setIsExpiring(true);
          setTimeRemaining(warningThreshold);
        }
      } else if (isExpiring) {
        // User became active again, reset warning
        setIsExpiring(false);
      }
    }, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, sessionDuration, warningThreshold, isExpiring, checkInterval]);

  // Define logout handler with useCallback to prevent recreation on each render
  const handleLogout = useCallback(() => {
    try {
      // The logout function in AuthContext now handles clearing OTP verification
      logout();
      onLogout?.();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }, [logout, onLogout]);

  // Define session extension handler with useCallback
  const handleExtendSession = useCallback(() => {
    try {
      setIsExtending(true);
      // Reset the timer
      setTimeRemaining(warningThreshold);
      setIsExpiring(false);
      // Update last activity timestamp in AuthContext
      updateLastActivity();
      onExtend?.();
      setShowWarning(false);
    } catch (error) {
      console.error("Failed to extend session:", error);
    } finally {
      setIsExtending(false);
    }
  }, [warningThreshold, updateLastActivity, onExtend]);

  // Countdown timer for warning
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    setShowWarning(isExpiring && timeRemaining > 0);

    // If warning is active, start countdown
    let timer: NodeJS.Timeout;
    if (isExpiring && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1000;
          // If time is up, log out the user
          if (newTime <= 0) {
            handleLogout();
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isExpiring, timeRemaining, isAuthenticated, handleLogout]);

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
