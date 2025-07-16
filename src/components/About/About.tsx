import React from "react";
import styles from "./About.module.css";

const About: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>About Free State</h1>
        <p className={styles.subtitle}>
          Your Gateway to Egypt's Premier Real Estate Companies
        </p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Our Mission</h2>
          <p>
            Free State is dedicated to connecting you with Egypt's leading real
            estate companies. We provide a comprehensive platform that showcases
            the best developers and agencies, making it easier for you to make
            informed decisions about your property investments.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What We Offer</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🏢</div>
              <h3>Curated Selection</h3>
              <p>
                We carefully select and feature only the most reputable real
                estate companies in Egypt.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📊</div>
              <h3>Market Insights</h3>
              <p>
                Stay informed about the latest trends and developments in
                Egypt's real estate market.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🤝</div>
              <h3>Direct Connections</h3>
              <p>
                Connect directly with real estate companies through our
                platform.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Why Choose Us</h2>
          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <h3>Trusted Information</h3>
              <p>
                All companies featured on our platform are thoroughly vetted to
                ensure reliability and quality.
              </p>
            </div>
            <div className={styles.benefit}>
              <h3>Up-to-Date</h3>
              <p>
                Our information is regularly updated to reflect the latest
                developments in the real estate market.
              </p>
            </div>
            <div className={styles.benefit}>
              <h3>User-Friendly</h3>
              <p>
                Our platform is designed to make your search for real estate
                companies simple and efficient.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Our Values</h2>
          <div className={styles.values}>
            <div className={styles.value}>
              <h3>Transparency</h3>
              <p>
                We believe in providing clear, honest information about all
                listed companies.
              </p>
            </div>
            <div className={styles.value}>
              <h3>Quality</h3>
              <p>
                We maintain high standards in selecting companies to feature on
                our platform.
              </p>
            </div>
            <div className={styles.value}>
              <h3>Innovation</h3>
              <p>
                We continuously improve our platform to better serve your needs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
