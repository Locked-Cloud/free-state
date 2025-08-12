// Enhanced Login component with improved security features
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../contexts/AuthContext";
import { fetchSheetData, parseCSV } from "../../utils/sheetUtils";
import { 
  checkRateLimit, 
  recordAttempt, 
  resetRateLimit,
  formatBlockedTime,
  sanitizeInput
} from "../../utils/securityUtils";

interface LoginFormData {
  username: string;
  password: string;
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
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isLimited: boolean;
    remainingAttempts: number;
    blockedUntil: number | null;
  }>({ isLimited: false, remainingAttempts: 5, blockedUntil: null });

  // Check rate limit on component mount
  useEffect(() => {
    if (formData.username) {
      const rateLimit = checkRateLimit('login', formData.username);
      setRateLimitInfo(rateLimit);
    }
  }, [formData.username]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if OTP is verified
      const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";

      if (isOtpVerified) {
        navigate("/");
      } else {
        navigate("/otp");
      }
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Sanitize input to prevent XSS
    const sanitizedValue = sanitizeInput(value);
    
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear error when user types
    if (error) setError(null);
    
    // Check rate limit when username changes
    if (name === 'username' && sanitizedValue) {
      const rateLimit = checkRateLimit('login', sanitizedValue);
      setRateLimitInfo(rateLimit);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Username and password are required");
      return;
    }

    // Check rate limiting
    const rateLimit = checkRateLimit('login', formData.username);
    setRateLimitInfo(rateLimit);
    
    if (rateLimit.isLimited) {
      setError(
        `Too many failed attempts. Please try again in ${formatBlockedTime(rateLimit.blockedUntil!)}.`
      );
      return;
    }

    setLoading(true);

    try {
      // Fetch user data with caching and error handling
      const result = await fetchSheetData('users');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to connect to the authentication server");
      }

      // Parse CSV data
      const rows = parseCSV(result.data || "");
      const headerRow = rows[0].map((col) => col.toLowerCase());

      // Find column indices
      const usernameIndex = headerRow.findIndex((col) => col === "username");
      const passwordIndex = headerRow.findIndex((col) => col === "password");
      const activeIndex = headerRow.findIndex((col) => col === "active");
      const roleIndex = headerRow.findIndex((col) => col === "role");

      if (usernameIndex === -1 || passwordIndex === -1) {
        throw new Error("Invalid user data format");
      }

      // Skip header row
      const dataRows = rows.slice(1);

      // Find user
      let authenticated = false;
      let isActive = true;
      let userRole = "user";

      for (const row of dataRows) {
        if (row.length <= Math.max(usernameIndex, passwordIndex)) continue;

        const username = row[usernameIndex];
        const password = row[passwordIndex];

        // Check if username and password match
        if (username === formData.username && password === formData.password) {
          authenticated = true;

          // Check if user is active
          if (activeIndex !== -1 && row[activeIndex] === "0") {
            isActive = false;
          }

          // Get user role if available
          if (roleIndex !== -1 && row[roleIndex]) {
            userRole = row[roleIndex];
          }

          break;
        }
      }

      if (!authenticated) {
        // Record failed attempt for rate limiting
        recordAttempt('login', formData.username);
        const updatedRateLimit = checkRateLimit('login', formData.username);
        setRateLimitInfo(updatedRateLimit);
        
        setError(`Invalid username or password. ${updatedRateLimit.remainingAttempts} attempts remaining.`);
      } else if (!isActive) {
        setError("Your account is inactive. Please contact support.");
      } else {
        // Reset rate limiting on successful login
        resetRateLimit('login', formData.username);
        
        // Reset OTP verification status
        sessionStorage.removeItem("otpVerified");

        // Use the login function from context with role
        login(formData.username, userRole);

        // Redirect will happen in the useEffect hook
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during login"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Login</h1>

        {error && <div className={styles.errorMessage}>{error}</div>}
        
        {rateLimitInfo.isLimited && rateLimitInfo.blockedUntil && (
          <div className={styles.blockedMessage}>
            Account temporarily locked. Try again in {formatBlockedTime(rateLimitInfo.blockedUntil)}.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Enter your username"
              disabled={loading || rateLimitInfo.isLimited}
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Enter your password"
              disabled={loading || rateLimitInfo.isLimited}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.loginButton}
            disabled={loading || rateLimitInfo.isLimited}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.securityNote}>
          <p>This login is secured with rate limiting and OTP verification</p>
        </div>

        <div className={styles.loginFooter}>
          <p>Don't have an account? Contact administrator</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
