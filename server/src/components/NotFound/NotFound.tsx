import React from "react";
import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

const NotFound: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1>Page Not Found</h1>
        <p className={styles.message}>
          Oops! The page you are looking for might have been removed, had its
          name changed, or is temporarily unavailable.
        </p>
        <div className={styles.illustration}>
          <div className={styles.building}></div>
          <div className={styles.shadow}></div>
        </div>
        <div className={styles.actions}>
          <Link to="/" className={styles.homeButton}>
            <i className="fas fa-home"></i> Return Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className={styles.backButton}
          >
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
        </div>
        <div className={styles.suggestions}>
          <h2>You might want to:</h2>
          <ul>
            <li>
              <Link to="/">Browse our featured companies</Link>
            </li>
            <li>
              <Link to="/about">Learn more about Free State</Link>
            </li>
            <li>
              <Link to="/contact">Contact our support team</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
