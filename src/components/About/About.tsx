import React from "react";
import styles from "./About.module.css";

const About: React.FC = () => {
  const stats = [
    { number: "50+", label: "Real Estate Companies" },
    { number: "1000+", label: "Properties Listed" },
    { number: "10K+", label: "Happy Clients" },
    { number: "5+", label: "Years Experience" },
  ];

  

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
          <h2>Our Vision</h2>
          <p>
            At Free State, we envision a future where finding your dream
            property in Egypt is seamless and transparent. We're committed to
            transforming the real estate landscape by connecting you with the
            most trusted developers and agencies in the market.
          </p>
        </section>

        <section className={styles.statsSection}>
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <h3 className={styles.statNumber}>{stat.number}</h3>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>What Sets Us Apart</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <i className="fas fa-check-circle"></i>
              <h3>Verified Companies</h3>
              <p>
                We thoroughly vet each company to ensure they meet our high
                standards of quality and reliability.
              </p>
            </div>
            <div className={styles.feature}>
              <i className="fas fa-sync-alt"></i>
              <h3>Real-Time Updates</h3>
              <p>
                Stay informed with the latest property listings and market
                developments as they happen.
              </p>
            </div>
            <div className={styles.feature}>
              <i className="fas fa-shield-alt"></i>
              <h3>Trusted Platform</h3>
              <p>
                Our platform provides a secure and transparent environment for
                your real estate journey.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Our Process</h2>
          <div className={styles.process}>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>1</div>
              <h3>Company Verification</h3>
              <p>
                We carefully evaluate each real estate company's credentials and
                track record.
              </p>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>2</div>
              <h3>Quality Assurance</h3>
              <p>
                Regular monitoring ensures all listed properties meet our
                quality standards.
              </p>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>3</div>
              <h3>Client Support</h3>
              <p>
                Our team provides continuous support throughout your property
                search journey.
              </p>
            </div>
          </div>
        </section>


        <section className={styles.section}>
          <h2>Our Values</h2>
          <div className={styles.values}>
            <div className={styles.value}>
              <i className="fas fa-handshake"></i>
              <h3>Trust</h3>
              <p>
                Building lasting relationships through transparency and honesty
                in every interaction.
              </p>
            </div>
            <div className={styles.value}>
              <i className="fas fa-chart-line"></i>
              <h3>Excellence</h3>
              <p>
                Continuously striving to provide the best service and experience
                for our users.
              </p>
            </div>
            <div className={styles.value}>
              <i className="fas fa-users"></i>
              <h3>Community</h3>
              <p>
                Creating a supportive ecosystem for both companies and property
                seekers.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>Ready to Find Your Dream Property?</h2>
          <p>
            Browse through our curated list of Egypt's top real estate companies
            and start your journey today.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className={styles.ctaButton}
          >
            Explore Companies
          </button>
        </section>
      </div>
    </div>
  );
};

export default About;
