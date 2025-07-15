import React from "react";
import useTitle from "../../hooks/useTitle";
import styles from "./Home.module.css";

const features = [
  {
    title: "Fast & Responsive",
    description:
      "Enjoy lightning-fast load times and a seamless experience on any device.",
  },
  {
    title: "Secure by Design",
    description:
      "Your data is protected with industry-leading security practices.",
  },
  {
    title: "Easy to Use",
    description: "A clean, intuitive interface that anyone can use.",
  },
];

const Home: React.FC = () => {
  useTitle("Home | Free State");
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.title}>Welcome to Free State</h1>
        <p className={styles.subtitle}>
          The modern starter template for your next big idea. Fast, secure, and
          easy to use.
        </p>
        <button
          className={styles.ctaButton}
          onClick={() => (window.location.href = "/product")}
        >
          Get Started
        </button>
      </section>
      {/* Features Section */}
      <section className={styles.features}>
        {features.map((feature, idx) => (
          <div key={idx} className={styles.featureCard}>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureDesc}>{feature.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Home;
