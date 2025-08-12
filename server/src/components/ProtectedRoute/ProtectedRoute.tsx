import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isOtpPath = location.pathname === "/otp";
  const hasCompletedOtp = sessionStorage.getItem("otpVerified") === "true";

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If this is the OTP page, allow access
  if (isOtpPath) {
    return <>{children}</>;
  }

  // If OTP verification is required but not completed, redirect to OTP page
  if (!hasCompletedOtp && !isOtpPath) {
    return <Navigate to="/otp" replace />;
  }

  // If authenticated and OTP is verified, allow access
  return <>{children}</>;
};

export default ProtectedRoute;
