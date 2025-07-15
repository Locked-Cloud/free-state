import React from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/product", label: "Product" },
  { to: "/contact", label: "Contact" },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Free State</div>
      <div className={styles.links}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              location.pathname === link.to
                ? `${styles.link} ${styles.active}`
                : styles.link
            }
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
