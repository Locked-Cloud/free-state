import React from "react";

const Footer: React.FC = () => (
  <footer
    style={{
      padding: "1rem",
      background: "#eee",
      marginTop: "2rem",
      textAlign: "center",
    }}
  >
    <small>
      &copy; {new Date().getFullYear()} Free State. All rights reserved.
    </small>
  </footer>
);

export default Footer;
