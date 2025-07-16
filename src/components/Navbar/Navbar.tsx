import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo} onClick={closeMenu}>
        Free State
      </Link>
      <button
        className={`${styles.menuButton} ${isMenuOpen ? styles.menuOpen : ""}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className={styles.menuIcon}></span>
      </button>
      <div className={`${styles.links} ${isMenuOpen ? styles.linksOpen : ""}`}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              location.pathname === link.to
                ? `${styles.link} ${styles.active}`
                : styles.link
            }
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
