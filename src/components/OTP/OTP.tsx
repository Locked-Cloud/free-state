import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./OTP.module.css";
import { fetchSheetData, parseCSV } from "../../utils/sheetUtils";
import { 
  checkRateLimit, 
  recordAttempt, 
  resetRateLimit, 
  formatBlockedTime,
  sanitizeInput 
} from "../../utils/securityUtils";

const OTP: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isLimited: boolean;
    remainingAttempts: number;
    blockedUntil: number | null;
  }>({ isLimited: false, remainingAttempts: 3, blockedUntil: null });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { isAuthenticated, updateLastActivity, login } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const currentUsername = localStorage.getItem("username");
    setUsername(currentUsername);

    // Check rate limit for OTP attempts
    if (currentUsername) {
      const rateLimit = checkRateLimit('otp', currentUsername);
      setRateLimitInfo(rateLimit);
    }

    const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";
    if (isOtpVerified) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

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

  const handleChange = (index: number, value: string) => {
    // Sanitize input to prevent XSS attacks
    value = sanitizeInput(value);
    
    if (value && !/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Clear error when user types
    if (error) setError(null);
    
    // Check rate limit status when user starts typing
    if (username && index === 0) {
      const rateLimit = checkRateLimit('otp', username);
      setRateLimitInfo(rateLimit);
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(pastedData)) return;

    const otpArray = pastedData.split("").slice(0, 6);
    const newOtp = [...otp];

    otpArray.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex((val) => !val);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    // Check rate limiting
    if (!username) {
      setError("Username not found. Please log in again.");
      navigate("/login");
      return;
    }

    const rateLimit = checkRateLimit('otp', username);
    setRateLimitInfo(rateLimit);
    
    if (rateLimit.isLimited) {
      setError(
        `Too many failed attempts. Please try again in ${formatBlockedTime(rateLimit.blockedUntil!)}.`
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Fetch user data with caching and error handling
      const result = await fetchSheetData('users');
      
      if (!result.success) {
        throw new Error(result.error || "Failed to connect to the verification server");
      }

      // Parse the CSV data
      const rows = parseCSV(result.data || "");
      const headerRow = rows[0].map((col: string) => col.toLowerCase());

      const usernameIndex = headerRow.findIndex((col: string) => col === "username");
      const otpIndex = headerRow.findIndex((col: string) => col === "manual_otp");
      const roleIndex = headerRow.findIndex((col: string) => col === "role");

      if (usernameIndex === -1 || otpIndex === -1) {
        throw new Error(
          `Invalid user data format. Expected columns 'username' and 'manual_otp' but got: ${headerRow.join(", ")}`
        );
      }

      const dataRows = rows.slice(1);
      let otpVerified = false;
      let userRole = "user";

      for (const row of dataRows) {
        if (row.length <= Math.max(usernameIndex, otpIndex)) continue;

        const rowUsername = row[usernameIndex];
        const storedOtp = row[otpIndex];

        if (rowUsername === username && storedOtp === otpValue) {
          otpVerified = true;
          
          // Get user role if available
          if (roleIndex !== -1 && row[roleIndex]) {
            userRole = row[roleIndex];
          }
          
          break;
        }
      }

      if (otpVerified) {
        // Reset rate limiting on successful verification
        resetRateLimit('otp', username);
        
        // Mark OTP as verified
        sessionStorage.setItem("otpVerified", "true");
        
        // Update last activity timestamp
        updateLastActivity();

        // Persist role in auth context for later authorization logic
        if (username) {
          login(username, userRole);
        }

        setTimeout(() => {
          setLoading(false);
          navigate("/");
        }, 1000);
      } else {
        // Record failed attempt for rate limiting
        recordAttempt('otp', username);
        const updatedRateLimit = checkRateLimit('otp', username);
        setRateLimitInfo(updatedRateLimit);
        
        throw new Error(`Invalid verification code. ${updatedRateLimit.remainingAttempts} attempts remaining.`);
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleResendOTP = () => {
    if (!canResend || !username) return;

    // Check rate limiting for resend attempts
    const resendRateLimit = checkRateLimit('otp_resend', username);
    
    if (resendRateLimit.isLimited) {
      setError(
        `Too many resend attempts. Please try again in ${formatBlockedTime(resendRateLimit.blockedUntil!)}.`
      );
      return;
    }

    setCountdown(60);
    setCanResend(false);
    setOtp(Array(6).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();

    // Record this resend attempt
    recordAttempt('otp_resend', username);

    console.log("Resending OTP to:", username);
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

        {error && <div className={styles.errorMessage}>{error}</div>}
        
        {rateLimitInfo.isLimited && (
          <div className={styles.blockedMessage}>
            Account temporarily locked. Please try again in {formatBlockedTime(rateLimitInfo.blockedUntil!)}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.otpForm}>
          <div className={styles.otpInputGroup}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={styles.otpInput}
                disabled={loading || rateLimitInfo.isLimited}
                autoFocus={index === 0}
                required
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <button
            type="submit"
            className={styles.verifyButton}
            disabled={loading || otp.join("").length !== 6 || rateLimitInfo.isLimited}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className={styles.resendContainer}>
          {canResend ? (
            <button
              onClick={handleResendOTP}
              className={styles.resendButton}
              disabled={loading || rateLimitInfo.isLimited}
            >
              Resend Code
            </button>
          ) : (
            <p className={styles.resendTimer}>
              Resend code in <span>{countdown}s</span>
            </p>
          )}
        </div>
        
        <div className={styles.securityNote}>
          This verification is secured with rate limiting to prevent unauthorized access.
        </div>
      </div>
    </div>
  );
};

export default OTP;
