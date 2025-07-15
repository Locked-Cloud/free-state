import React from "react";
import styles from "./Forbidden.module.css";

const Forbidden: React.FC = () => (
  <div className={styles.container}>
    <h1 className={styles.title}>403 - Forbidden</h1>
    <p className={styles.text}>You are not allowed to access this page.</p>
  </div>
);

export default Forbidden;
