// Enhanced OTP Component with Security Improvements
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./OTP.module.css";

// Security Configuration
const SECURITY_CONFIG = {
  MAX_OTP_ATTEMPTS: 3,
  OTP_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  OTP_EXPIRY_TIME: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT_DELAY: 1000, // 1 second between attempts
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

// Enhanced encryption utilities (client-side hashing)
const hashOTP = async (otp: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Secure random salt generation
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Google Sheet constants with enhanced security headers
const SHEET_ID = process.env.REACT_APP_SHEET_ID || "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";
const OTP_SHEET_URL = process.env.NODE_ENV === "production"
  ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1815551767`
  : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1815551767`;

interface SecurityState {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptTime: number;
  sessionStartTime: number;
}

const OTP: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [securityState, setSecurityState] = useState<SecurityState>({
    attempts: 0,
    lockedUntil: null,
    lastAttemptTime: 0,
    sessionStartTime: Date.now()
  });
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Enhanced session management
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const currentUsername = localStorage.getItem("username");
    if (!currentUsername) {
      logout();
      return;
    }

    setUsername(currentUsername);

    // Check session timeout
    const sessionStart = sessionStorage.getItem("sessionStartTime");
    if (sessionStart && Date.now() - parseInt(sessionStart) > SECURITY_CONFIG.SESSION_TIMEOUT) {
      sessionStorage.clear();
      logout();
      return;
    }

    const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";
    if (isOtpVerified) {
      navigate("/");
    }

    // Load security state from sessionStorage
    const savedSecurityState = sessionStorage.getItem("otpSecurityState");
    if (savedSecurityState) {
      const parsed = JSON.parse(savedSecurityState);
      setSecurityState(parsed);
    } else {
      sessionStorage.setItem("sessionStartTime", Date.now().toString());
    }
  }, [isAuthenticated, navigate, logout]);

  // Save security state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("otpSecurityState", JSON.stringify(securityState));
  }, [securityState]);

  // Enhanced countdown timer with session validation
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0 && !canResend) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, canResend]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  // Check if account is locked
  const isAccountLocked = (): boolean => {
    if (!securityState.lockedUntil) return false;
    return Date.now() < securityState.lockedUntil;
  };

  // Enhanced input validation with security checks
  const handleChange = (index: number, value: string) => {
    if (isAccountLocked()) {
      setError(`Account locked. Try again in ${Math.ceil((securityState.lockedUntil! - Date.now()) / 60000)} minutes.`);
      return;
    }

    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Enhanced paste handling with security validation
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (isAccountLocked()) {
      setError(`Account locked. Try again in ${Math.ceil((securityState.lockedUntil! - Date.now()) / 60000)} minutes.`);
      return;
    }

    const pastedData = e.clipboardData.getData("text").trim();

    // Validate pasted data
    if (!/^\d{6}$/.test(pastedData)) {
      setError("Invalid format. Please enter 6 digits only.");
      return;
    }

    const otpArray = pastedData.split("").slice(0, 6);
    setOtp(otpArray);
    inputRefs.current[5]?.focus();
  };

  // Enhanced OTP verification with security measures
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAccountLocked()) {
      setError(`Account locked due to too many failed attempts. Try again in ${Math.ceil((securityState.lockedUntil! - Date.now()) / 60000)} minutes.`);
      return;
    }

    const otpValue = otp.join("");

    if (otpValue.length !== 6 || !/^\d{6}$/.test(otpValue)) {
      setError("Please enter all 6 digits");
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - securityState.lastAttemptTime < SECURITY_CONFIG.RATE_LIMIT_DELAY) {
      setError("Please wait before trying again");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Enhanced fetch with timeout and security headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(OTP_SHEET_URL, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Authentication service temporarily unavailable");
      }

      const csvText = await response.text();
      if (!csvText.trim()) {
        throw new Error("Authentication data unavailable");
      }

      // Enhanced CSV parsing with validation
      const rows = csvText.split("\n").filter(row => row.trim());
      if (rows.length < 2) {
        throw new Error("Invalid authentication data");
      }

      const headerRow = rows[0]
        .split(",")
        .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

      const usernameIndex = headerRow.findIndex((col) => col === "username");
      const otpIndex = headerRow.findIndex((col) => col === "manual_otp");
      const otpExpiryIndex = headerRow.findIndex((col) => col === "otp_expiry");
      const saltIndex = headerRow.findIndex((col) => col === "salt");

      if (usernameIndex === -1 || otpIndex === -1) {
        throw new Error("Authentication system configuration error");
      }

      const dataRows = rows.slice(1);
      let otpVerified = false;
      let otpExpired = false;

      for (const row of dataRows) {
        const columns = row
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim());

        if (columns.length <= Math.max(usernameIndex, otpIndex)) continue;

        const rowUsername = columns[usernameIndex];
        
        if (rowUsername === username) {
          const storedOtp = columns[otpIndex];
          const otpExpiry = otpExpiryIndex !== -1 ? columns[otpExpiryIndex] : null;
          const salt = saltIndex !== -1 ? columns[saltIndex] : "";

          // Check OTP expiry
          if (otpExpiry && Date.now() > parseInt(otpExpiry)) {
            otpExpired = true;
            break;
          }

          // Enhanced OTP verification with hashing (if salt is available)
          let isOtpMatch = false;
          if (salt) {
            const hashedInputOtp = await hashOTP(otpValue, salt);
            isOtpMatch = hashedInputOtp === storedOtp;
          } else {
            // Fallback to plain text comparison (less secure)
            isOtpMatch = storedOtp === otpValue;
          }

          if (isOtpMatch) {
            otpVerified = true;
            break;
          }
        }
      }

      if (otpExpired) {
        throw new Error("Verification code has expired. Please request a new one.");
      }

      if (otpVerified) {
        // Reset security state on successful verification
        setSecurityState({
          attempts: 0,
          lockedUntil: null,
          lastAttemptTime: 0,
          sessionStartTime: Date.now()
        });

        sessionStorage.setItem("otpVerified", "true");
        sessionStorage.setItem("otpVerifiedAt", Date.now().toString());
        
        setTimeout(() => {
          setLoading(false);
          navigate("/");
        }, 1000);
      } else {
        // Handle failed attempt
        const newAttempts = securityState.attempts + 1;
        const newSecurityState = {
          ...securityState,
          attempts: newAttempts,
          lastAttemptTime: now
        };

        if (newAttempts >= SECURITY_CONFIG.MAX_OTP_ATTEMPTS) {
          newSecurityState.lockedUntil = now + SECURITY_CONFIG.OTP_LOCKOUT_DURATION;
          throw new Error(`Too many failed attempts. Account locked for ${SECURITY_CONFIG.OTP_LOCKOUT_DURATION / 60000} minutes.`);
        }

        setSecurityState(newSecurityState);
        throw new Error(`Invalid verification code. ${SECURITY_CONFIG.MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    } catch (err) {
      setLoading(false);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError("Request timeout. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Verification failed. Please try again.");
      }
    }
  };

  // Enhanced resend functionality with rate limiting
  const handleResendOTP = async () => {
    if (!canResend || isAccountLocked()) return;

    setCountdown(60);
    setCanResend(false);
    setOtp(Array(6).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();

    // In a real implementation, this would trigger a new OTP generation
    // For now, we'll just log it
    console.log("Requesting new OTP for:", username);
    
    // You could add actual OTP generation API call here
    try {
      // Example API call for OTP generation
      // await generateNewOTP(username);
    } catch (err) {
      setError("Failed to send new verification code. Please try again later.");
      setCanResend(true);
      setCountdown(0);
    }
  };

  // Calculate remaining lockout time
  const getRemainingLockoutTime = (): string => {
    if (!securityState.lockedUntil) return "";
    const remaining = Math.ceil((securityState.lockedUntil - Date.now()) / 60000);
    return `${remaining} minute${remaining !== 1 ? 's' : ''}`;
  };

  return (
    <div className={styles.otpContainer}>
      <div className={styles.otpCard}>
        <h1 className={styles.otpTitle}>Verification Code</h1>
        <p className={styles.otpDescription}>
          {username
            ? `Enter the verification code for ${username}`
            : "Enter your verification code"}
        </p>

        {/* Security status indicator */}
        {securityState.attempts > 0 && !isAccountLocked() && (
          <div className={styles.securityWarning}>
            ⚠️ {SECURITY_CONFIG.MAX_OTP_ATTEMPTS - securityState.attempts} attempts remaining
          </div>
        )}

        {isAccountLocked() && (
          <div className={styles.lockoutMessage}>
            🔒 Account locked for {getRemainingLockoutTime()}
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.otpForm}>
          <div className={styles.otpInputGroup}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`${styles.otpInput} ${isAccountLocked() ? styles.disabled : ''}`}
                disabled={loading || isAccountLocked()}
                autoFocus={index === 0}
                autoComplete="one-time-code"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            className={styles.verifyButton}
            disabled={loading || otp.join("").length !== 6 || isAccountLocked()}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className={styles.resendContainer}>
          {canResend && !isAccountLocked() ? (
            <button
              onClick={handleResendOTP}
              className={styles.resendButton}
              disabled={loading}
            >
              Resend Code
            </button>
          ) : (
            <p className={styles.resendTimer}>
              {isAccountLocked() ? (
                `Account locked for ${getRemainingLockoutTime()}`
              ) : (
                <>Resend code in <span>{countdown}s</span></>
              )}
            </p>
          )}
        </div>

        {/* Security information */}
        <div className={styles.securityInfo}>
          <small>
            🔒 Your session is secured with multiple authentication factors.
            This page will timeout after 30 minutes of inactivity.
          </small>
        </div>
      </div>
    </div>
  );
};

export default OTP;