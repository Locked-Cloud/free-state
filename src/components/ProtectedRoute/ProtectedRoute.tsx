// Enhanced Protected Route Component
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOTP?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOTP = true 
}) => {
  const { isAuthenticated, username } = useAuth();
  const location = useLocation();
  const isOtpPath = location.pathname === "/otp";
  const isNeedsOtpPath = location.pathname === "/needs-otp";
  const isLogoutPath = location.pathname === "/logout";
  
  // Enhanced session validation
  const validateSession = (): boolean => {
    if (!isAuthenticated || !username) return false;

    // Check session timeout
    const sessionStartTime = sessionStorage.getItem("sessionStartTime");
    if (sessionStartTime) {
      const sessionAge = Date.now() - parseInt(sessionStartTime);
      if (sessionAge > 30 * 60 * 1000) { // 30 minutes
        sessionStorage.clear();
        return false;
      }
    }

    return true;
  };

  // Enhanced OTP validation
  const validateOTP = (): boolean => {
    if (!requireOTP) return true;

    const isOtpVerified = sessionStorage.getItem("otpVerified") === "true";
    const otpVerifiedAt = sessionStorage.getItem("otpVerifiedAt");
    
    if (!isOtpVerified || !otpVerifiedAt) return false;

    // Check if OTP verification is still valid (30 minutes)
    const verificationAge = Date.now() - parseInt(otpVerifiedAt);
    if (verificationAge > 30 * 60 * 1000) {
      sessionStorage.removeItem("otpVerified");
      sessionStorage.removeItem("otpVerifiedAt");
      return false;
    }

    return true;
  };

  // Session validation
  if (!validateSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Allow access to special pages
  if (isOtpPath || isNeedsOtpPath || isLogoutPath) {
    return <>{children}</>;
  }

  // OTP validation for protected routes
  if (requireOTP && !validateOTP()) {
    return <Navigate to="/otp" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;