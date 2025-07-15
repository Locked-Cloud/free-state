import React from "react";
import useTitle from "../../hooks/useTitle";
import styles from "./Contact.module.css";

const Contact: React.FC = () => {
  useTitle("Contact | Free State");
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Contact</h1>
      <p className={styles.text}>This is the Contact page.</p>
    </div>
  );
};

export default Contact;
