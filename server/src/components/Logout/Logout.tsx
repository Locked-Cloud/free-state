import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Logout: React.FC = () => {
  const { logout } = useAuth();

  useEffect(() => {
    // Clear OTP verification status
    sessionStorage.removeItem("otpVerified");

    // Logout user
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
};

export default Logout;
