import React from "react";
import useTitle from "../../hooks/useTitle";
import styles from "./About.module.css";

const About: React.FC = () => {
  useTitle("About | Free State");
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About</h1>
      <p className={styles.text}>This is the About page.</p>
    </div>
  );
};

export default About;
