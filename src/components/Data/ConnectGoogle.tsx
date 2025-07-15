import React from "react";

const ConnectGoogle: React.FC = () => {
  const handleConnect = () => {
    // TODO: Add Google OAuth logic here
    alert("Connect with Google clicked!");
  };

  return (
    <button
      onClick={handleConnect}
      style={{
        padding: "0.5rem 1rem",
        background: "#4285F4",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      Connect with Google
    </button>
  );
};

export default ConnectGoogle;
