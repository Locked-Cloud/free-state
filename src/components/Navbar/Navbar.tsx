import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/places", label: "Places" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, username, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo} onClick={closeMenu}>
        Free State
      </Link>

      {isAuthenticated && (
        <button
          className={`${styles.menuButton} ${
            isMenuOpen ? styles.menuOpen : ""
          }`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={styles.menuIcon}></span>
        </button>
      )}

      <div className={`${styles.links} ${isMenuOpen ? styles.linksOpen : ""}`}>
        {isAuthenticated ? (
          <>
            {/* Show navigation links only when authenticated */}
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`${styles.link} ${
                  location.pathname === link.to ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}

            <span className={styles.username}>Welcome, {username}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className={`${styles.link} ${styles.loginButton}`}
            onClick={closeMenu}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
