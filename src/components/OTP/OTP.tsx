import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./OTP.module.css";

// Google Sheet constants
const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";
const OTP_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=447441264`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=447441264`;

const OTP: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Get username from localStorage (set during login)
    const currentUsername = localStorage.getItem("username");
    setUsername(currentUsername);

    // Check if OTP is already verified
    const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";
    if (isOtpVerified) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for OTP resend
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

  // Initialize refs array when component mounts
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if multiple characters are pasted
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // Check if pasted content is a valid OTP (numbers only)
    if (!/^\d+$/.test(pastedData)) return;

    const otpArray = pastedData.split("").slice(0, 6);
    const newOtp = [...otp];

    otpArray.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);

    // Focus the next empty input or the last input
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

    // Validate OTP length
    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Fetch user data from Google Sheet to verify OTP
      const response = await fetch(OTP_SHEET_URL);
      if (!response.ok) {
        throw new Error("Failed to connect to the verification server");
      }

      const csvText = await response.text();
      if (!csvText.trim()) {
        throw new Error("No user data available");
      }

      // Parse CSV data
      const rows = csvText.split("\n");
      const headerRow = rows[0]
        .split(",")
        .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

      // Find column indices
      const usernameIndex = headerRow.findIndex((col) => col === "username");
      const otpIndex = headerRow.findIndex((col) => col === "manual_otp");

      if (usernameIndex === -1 || otpIndex === -1) {
        throw new Error("Invalid user data format");
      }

      // Skip header row
      const dataRows = rows.slice(1);

      // Find user and verify OTP
      let otpVerified = false;

      for (const row of dataRows) {
        const columns = row
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim());

        if (columns.length <= Math.max(usernameIndex, otpIndex)) continue;

        const rowUsername = columns[usernameIndex];
        const storedOtp = columns[otpIndex];

        // Check if username matches and OTP is valid
        if (rowUsername === username && storedOtp === otpValue) {
          otpVerified = true;
          break;
        }
      }

      if (otpVerified) {
        // Mark OTP as verified
        sessionStorage.setItem("otpVerified", "true");

        setTimeout(() => {
          setLoading(false);
          navigate("/");
        }, 1000);
      } else {
        throw new Error("Invalid verification code");
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleResendOTP = () => {
    if (!canResend) return;

    // Reset the countdown and resend status
    setCountdown(60);
    setCanResend(false);

    // Clear the inputs
    setOtp(Array(6).fill(""));
    setError(null);

    // Focus the first input
    inputRefs.current[0]?.focus();

    // In a real app, you would call your API to resend the OTP here
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
                disabled={loading}
                autoFocus={index === 0}
                required
              />
            ))}
          </div>

          <button
            type="submit"
            className={styles.verifyButton}
            disabled={loading || otp.join("").length !== 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className={styles.resendContainer}>
          {canResend ? (
            <button
              onClick={handleResendOTP}
              className={styles.resendButton}
              disabled={loading}
            >
              Resend Code
            </button>
          ) : (
            <p className={styles.resendTimer}>
              Resend code in <span>{countdown}s</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTP;
