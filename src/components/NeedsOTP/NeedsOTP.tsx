// Enhanced NeedsOTP Component
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./NeedsOTP.module.css";

const NeedsOTP: React.FC = () => {
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleContactAdmin = () => {
    // In a real implementation, this could open a support ticket or email
    const subject = encodeURIComponent("OTP Setup Request");
    const body = encodeURIComponent(
      `Hello Administrator,\n\nI need OTP setup for my account: ${username}\n\nPlease assist me with configuring two-factor authentication.\n\nThank you.`
    );
    
    // This would typically be your organization's support email
    window.open(`mailto:admin@yourcompany.com?subject=${subject}&body=${body}`);
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
            width="64"
            height="64"
          >
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z" />
          </svg>
        </div>

        <p className={styles.needsOtpMessage}>
          Hello <strong>{username || "User"}</strong>, your account requires 
          two-factor authentication, but OTP has not been configured yet.
        </p>

        <div className={styles.securityExplanation}>
          <h3>Why is OTP required?</h3>
          <ul>
            <li>🔒 Enhanced account security</li>
            <li>🛡️ Protection against unauthorized access</li>
            <li>✅ Compliance with security policies</li>
            <li>📱 Additional layer of verification</li>
          </ul>
        </div>

        <p className={styles.needsOtpInstructions}>
          Please contact your administrator to set up OTP for your account.
          This typically involves configuring a mobile authenticator app or 
          receiving SMS codes.
        </p>

        <div className={styles.needsOtpActions}>
          <button 
            onClick={handleContactAdmin} 
            className={styles.contactButton}
          >
            Contact Administrator
          </button>
          <button 
            onClick={handleLogout} 
            className={styles.logoutButton}
          >
            Logout
          </button>
        </div>

        <div className={styles.needsOtpFooter}>
          <div className={styles.supportInfo}>
            <h4>Need immediate assistance?</h4>
            <p>📞 Support: +1 (555) 123-4567</p>
            <p>📧 Email: support@yourcompany.com</p>
            <p>🕒 Hours: Mon-Fri 9AM-5PM EST</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeedsOTP;