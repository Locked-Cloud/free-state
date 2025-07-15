import React from "react";
import useTitle from "../../hooks/useTitle";
import styles from "./Product.module.css";

const Product: React.FC = () => {
  useTitle("Product | Free State");
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Product</h1>
      <p className={styles.text}>This is the Product page.</p>
    </div>
  );
};

export default Product;
