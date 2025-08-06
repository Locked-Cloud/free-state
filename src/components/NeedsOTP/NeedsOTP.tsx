import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./NeedsOTP.module.css";

const NeedsOTP: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useAuth();

  const handleLogout = () => {
    navigate("/logout");
  };

  return (
    <div className={styles.needsOtpContainer}>
      <div className={styles.needsOtpCard}>
        <h1 className={styles.needsOtpTitle}>OTP Setup Required</h1>

        <div className={styles.needsOtpIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z" />
          </svg>
        </div>

        <p className={styles.needsOtpMessage}>
          Hello <strong>{username || "User"}</strong>, your account requires OTP
          verification, but no OTP has been set up for you yet.
        </p>

        <p className={styles.needsOtpInstructions}>
          Please contact your administrator to set up an OTP for your account.
          Once the OTP is set up, you can log in again.
        </p>

        <div className={styles.needsOtpActions}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div className={styles.needsOtpFooter}>
          <p>For assistance, please contact your system administrator</p>
        </div>
      </div>
    </div>
  );
};

export default NeedsOTP;
