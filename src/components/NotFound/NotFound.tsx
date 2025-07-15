import React from "react";
import useTitle from "../../hooks/useTitle";
import styles from "./NotFound.module.css";

const NotFound: React.FC = () => {
  useTitle("404 | Free State");
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404 - Not Found</h1>
      <p className={styles.text}>
        The page you are looking for does not exist.
      </p>
    </div>
  );
};

export default NotFound;
