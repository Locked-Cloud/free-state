import React from "react";
import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

const NotFound: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <Link to="/" className={styles.homeButton}>
          <i className="fas fa-home"></i> Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
