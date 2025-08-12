import React from "react";
import styles from "./ServerError.module.css";

const ServerError: React.FC = () => (
  <div className={styles.container}>
    <h1 className={styles.title}>500 - Server Error</h1>
    <p className={styles.text}>
      Something went wrong on our end. Please try again later.
    </p>
  </div>
);

export default ServerError;
