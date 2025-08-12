import React from "react";
import styles from "./Unauthorized.module.css";

const Unauthorized: React.FC = () => (
  <div className={styles.container}>
    <h1 className={styles.title}>401 - Unauthorized</h1>
    <p className={styles.text}>You do not have permission to view this page.</p>
  </div>
);

export default Unauthorized;
