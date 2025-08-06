// Enhanced Login Component with Security Improvements
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../contexts/AuthContext";

// Security utilities
const hashPassword = async (
  password: string,
  salt: string
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Enhanced security configuration
const LOGIN_SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  RATE_LIMIT_DELAY: 2000, // 2 seconds between attempts
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

// Google Sheet constants
const SHEET_ID =
  process.env.REACT_APP_SHEET_ID ||
  "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";
const LOGIN_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1815551767`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1815551767`;

interface LoginFormData {
  username: string;
  password: string;
}

interface LoginSecurityState {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptTime: number;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [securityState, setSecurityState] = useState<LoginSecurityState>({
    attempts: 0,
    lockedUntil: null,
    lastAttemptTime: 0,
  });

  // Enhanced authentication state management
  useEffect(() => {
    if (isAuthenticated) {
      const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";
      const otpVerifiedAt = sessionStorage.getItem("otpVerifiedAt");

      // Check if OTP verification is still valid
      if (isOtpVerified && otpVerifiedAt) {
        const verificationAge = Date.now() - parseInt(otpVerifiedAt);
        if (verificationAge > LOGIN_SECURITY_CONFIG.SESSION_TIMEOUT) {
          sessionStorage.removeItem("otpVerified");
          sessionStorage.removeItem("otpVerifiedAt");
          navigate("/otp");
          return;
        }
        navigate("/");
      } else {
        navigate("/otp");
      }
    }

    // Load security state from localStorage (persistent across sessions)
    const savedSecurityState = localStorage.getItem("loginSecurityState");
    if (savedSecurityState) {
      const parsed = JSON.parse(savedSecurityState);
      // Reset if lockout has expired
      if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
        parsed.attempts = 0;
        parsed.lockedUntil = null;
      }
      setSecurityState(parsed);
    }
  }, [isAuthenticated, navigate]);

  // Save security state
  useEffect(() => {
    localStorage.setItem("loginSecurityState", JSON.stringify(securityState));
  }, [securityState]);

  const isAccountLocked = (): boolean => {
    if (!securityState.lockedUntil) return false;
    return Date.now() < securityState.lockedUntil;
  };

  // Enhanced input validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Input sanitization
    const sanitizedValue = value.replace(/[<>]/g, ""); // Basic XSS prevention

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Enhanced form validation
  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return "Username is required";
    }

    if (formData.username.length < 3) {
      return "Username must be at least 3 characters";
    }

    if (!formData.password) {
      return "Password is required";
    }

    if (formData.password.length < LOGIN_SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${LOGIN_SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters`;
    }

    // Check for basic password complexity
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return "Password must contain uppercase, lowercase, and numeric characters";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAccountLocked()) {
      const remaining = Math.ceil(
        (securityState.lockedUntil! - Date.now()) / 60000
      );
      setError(
        `Account locked for ${remaining} more minutes due to too many failed attempts`
      );
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (
      now - securityState.lastAttemptTime <
      LOGIN_SECURITY_CONFIG.RATE_LIMIT_DELAY
    ) {
      setError("Please wait before trying again");
      return;
    }

    // Form validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Enhanced fetch with security headers and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(LOGIN_SHEET_URL, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Authentication service is temporarily unavailable");
      }

      const csvText = await response.text();
      if (!csvText.trim()) {
        throw new Error("Authentication data is temporarily unavailable");
      }

      // Enhanced CSV parsing with validation
      const rows = csvText.split("\n").filter((row) => row.trim());
      if (rows.length < 2) {
        throw new Error("Invalid authentication configuration");
      }

      const headerRow = rows[0]
        .split(",")
        .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

      const usernameIndex = headerRow.findIndex((col) => col === "username");
      const passwordIndex = headerRow.findIndex((col) => col === "password");
      const activeIndex = headerRow.findIndex((col) => col === "active");
      const saltIndex = headerRow.findIndex((col) => col === "salt");
      const lastLoginIndex = headerRow.findIndex((col) => col === "last_login");
      const hasOtpIndex = headerRow.findIndex((col) => col === "has_otp");

      if (usernameIndex === -1 || passwordIndex === -1) {
        throw new Error("Authentication system configuration error");
      }

      const dataRows = rows.slice(1);
      let authenticated = false;
      let isActive = true;
      let hasOtpSetup = false;

      for (const row of dataRows) {
        const columns = row
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim());

        if (columns.length <= Math.max(usernameIndex, passwordIndex)) continue;

        const username = columns[usernameIndex];

        if (username === formData.username) {
          const storedPassword = columns[passwordIndex];
          const salt = saltIndex !== -1 ? columns[saltIndex] : "";
          const lastLogin =
            lastLoginIndex !== -1 ? columns[lastLoginIndex] : null;
          const hasOtp =
            hasOtpIndex !== -1 ? columns[hasOtpIndex] === "1" : false;

          // Enhanced password verification with hashing
          let isPasswordMatch = false;
          if (salt) {
            const hashedInputPassword = await hashPassword(
              formData.password,
              salt
            );
            isPasswordMatch = hashedInputPassword === storedPassword;
          } else {
            // Fallback to plain text (less secure, should be upgraded)
            isPasswordMatch = storedPassword === formData.password;
          }

          if (isPasswordMatch) {
            authenticated = true;
            hasOtpSetup = hasOtp;

            // Check if user is active
            if (activeIndex !== -1 && columns[activeIndex] === "0") {
              isActive = false;
            }

            // Check for suspicious login patterns (optional)
            if (lastLogin) {
              const lastLoginTime = parseInt(lastLogin);
              const timeSinceLastLogin = now - lastLoginTime;

              // Log suspicious activity if last login was very recent (possible concurrent sessions)
              if (timeSinceLastLogin < 60000) {
                // Less than 1 minute
                console.warn("Suspicious login activity detected");
              }
            }

            break;
          }
        }
      }

      if (!authenticated) {
        // Handle failed attempt
        const newAttempts = securityState.attempts + 1;
        const newSecurityState = {
          attempts: newAttempts,
          lastAttemptTime: now,
          lockedUntil:
            newAttempts >= LOGIN_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
              ? now + LOGIN_SECURITY_CONFIG.LOCKOUT_DURATION
              : null,
        };

        setSecurityState(newSecurityState);

        if (newAttempts >= LOGIN_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
          throw new Error(
            `Too many failed login attempts. Account locked for ${LOGIN_SECURITY_CONFIG.LOCKOUT_DURATION / 60000} minutes.`
          );
        } else {
          throw new Error(
            `Invalid credentials. ${LOGIN_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.`
          );
        }
      } else if (!isActive) {
        throw new Error(
          "Account is inactive. Please contact your administrator."
        );
      } else if (!hasOtpSetup) {
        // Redirect to OTP setup page if OTP is not configured
        navigate("/needs-otp");
        return;
      } else {
        // Successful login - reset security state
        setSecurityState({
          attempts: 0,
          lockedUntil: null,
          lastAttemptTime: 0,
        });

        // Clear any existing session data
        sessionStorage.removeItem("otpVerified");
        sessionStorage.removeItem("otpVerifiedAt");
        sessionStorage.setItem("sessionStartTime", now.toString());

        // Use the login function from context
        login(formData.username);

        // Navigate to OTP verification
        navigate("/otp");
      }
    } catch (err) {
      console.error(
        "Login attempt failed:",
        err instanceof Error ? err.message : "Unknown error"
      );

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError(
            "Request timeout. Please check your connection and try again."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getRemainingLockoutTime = (): string => {
    if (!securityState.lockedUntil) return "";
    const remaining = Math.ceil(
      (securityState.lockedUntil - Date.now()) / 60000
    );
    return `${remaining} minute${remaining !== 1 ? "s" : ""}`;
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Secure Login</h1>

        {/* Security status */}
        {isAccountLocked() && (
          <div className={styles.securityWarning}>
            <i className="fas fa-lock" />
            <span>Account locked for {getRemainingLockoutTime()}</span>
          </div>
        )}

        {securityState.attempts > 0 && !isAccountLocked() && (
          <div className={styles.securityInfo}>
            <i className="fas fa-exclamation-triangle" />
            <span>
              {LOGIN_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS -
                securityState.attempts}{" "}
              attempts remaining
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading || isAccountLocked()}
              required
              autoComplete="username"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading || isAccountLocked()}
                required
                autoComplete="current-password"
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                disabled={loading || isAccountLocked()}
              >
                <i className={`fas fa-${showPassword ? "eye-slash" : "eye"}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isAccountLocked()}
            className={styles.loginButton}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt" />
                Login
              </>
            )}
          </button>
        </form>

        <div className={styles.securityFeatures}>
          <div className={styles.securityFeature}>
            <i className="fas fa-shield-alt" />
            <span>Enhanced Security</span>
          </div>
          <div className={styles.securityFeature}>
            <i className="fas fa-lock" />
            <span>Account Protection</span>
          </div>
          <div className={styles.securityFeature}>
            <i className="fas fa-clock" />
            <span>Session Management</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
