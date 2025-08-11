import React from "react";
import { Link } from "react-router-dom";
import styles from "./OutOfStock.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface OutOfStockProps {
  companyName: string;
  companyImage: string;
}

const OutOfStock: React.FC<OutOfStockProps> = ({
  companyName,
  companyImage,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <Link to="/" className={styles.backButton}>
          ← Back to Home
        </Link>
      </div>

      <div className={styles.outOfStockContainer}>
        <div className={styles.outOfStockContent}>
          <h1 className={styles.outOfStockTitle}>
            {companyName} is Currently Unavailable
          </h1>
          <div className={styles.outOfStockImageContainer}>
            <OptimizedImage
              src={companyImage}
              alt={companyName}
              className={styles.outOfStockImage}
              priority={true} // Always prioritize this image since it's the main content
              width={400}
              height={300}
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div className={styles.outOfStockMessage}>
            <p>
              We're sorry, but this developer's projects are currently
              unavailable.
            </p>
            <p>
              Please check back later or explore other developers on our
              platform.
            </p>
          </div>
          <Link to="/" className={styles.returnHomeButton}>
            Explore Other Developers
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OutOfStock;
