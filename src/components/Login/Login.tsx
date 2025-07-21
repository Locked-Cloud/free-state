import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../contexts/AuthContext";

// Google Sheet constants
const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
// Use a more reliable CORS proxy
const CORS_PROXY = "https://corsproxy.io/?";
const LOGIN_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=447441264`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=447441264`;

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if there's a saved redirect path
      const redirectPath = sessionStorage.getItem("redirectPath") || "/";
      sessionStorage.removeItem("redirectPath"); // Clear after use
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Fetch user data from Google Sheet
      const response = await fetch(LOGIN_SHEET_URL);
      if (!response.ok) {
        throw new Error("Failed to connect to the authentication server");
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
      const passwordIndex = headerRow.findIndex((col) => col === "password");
      const activeIndex = headerRow.findIndex((col) => col === "active");

      if (usernameIndex === -1 || passwordIndex === -1) {
        throw new Error("Invalid user data format");
      }

      // Skip header row
      const dataRows = rows.slice(1);

      // Find user
      let authenticated = false;
      let isActive = true;

      for (const row of dataRows) {
        const columns = row
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim());

        if (columns.length <= Math.max(usernameIndex, passwordIndex)) continue;

        const username = columns[usernameIndex];
        const password = columns[passwordIndex];

        // Check if username and password match
        if (username === formData.username && password === formData.password) {
          authenticated = true;

          // Check if user is active
          if (activeIndex !== -1 && columns[activeIndex] === "0") {
            isActive = false;
          }

          break;
        }
      }

      if (!authenticated) {
        setError("Invalid username or password");
      } else if (!isActive) {
        setError("Your account is inactive. Please contact support.");
      } else {
        // Use the login function from context
        login(formData.username);

        // Redirect will happen in the useEffect hook
      }
    } catch (err) {
      // Replace detailed error logging with generic message
      console.error("Authentication error occurred");
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>Don't have an account? Contact administrator</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
