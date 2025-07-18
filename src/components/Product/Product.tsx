import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./Product.module.css";
import useTitle from "../../hooks/useTitle";

const Product: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("projects");

  useTitle("Product Details");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simulate API call with timeout
        setTimeout(() => {
          // Mock data for demonstration
          const mockCompanyData = {
            id: id,
            name: "North Coast Developments",
            description:
              "North Coast Developments is a leading real estate developer specializing in premium residential and commercial properties along the beautiful North Coast. With over 15 years of experience, we have delivered exceptional quality and innovative designs that transform living and working spaces.",
            image:
              "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
            website: "https://example.com",
            location: "North Coast, Egypt",
            projects: [
              {
                id: "1",
                title: "Coastal Heights",
                location: "North Coast, Egypt",
                image:
                  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
                features: [
                  "Beachfront Access",
                  "Swimming Pools",
                  "Smart Home Systems",
                ],
              },
              {
                id: "2",
                title: "Marina Residences",
                location: "North Coast, Egypt",
                image:
                  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
                features: [
                  "Private Marina",
                  "Fitness Center",
                  "Gated Community",
                ],
              },
              {
                id: "3",
                title: "Sunset Gardens",
                location: "North Coast, Egypt",
                image:
                  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
                features: [
                  "Landscaped Gardens",
                  "Infinity Pools",
                  "Panoramic Views",
                ],
              },
            ],
          };

          setCompanyData(mockCompanyData);
          setLoading(false);
        }, 1500);
      } catch (err) {
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Re-fetch data
  };

  const renderContent = () => {
    if (activeTab === "projects") {
      return (
        <div className={styles.projectsSection}>
          <h2>Projects</h2>
          {companyData.projects && companyData.projects.length > 0 ? (
            <div className={styles.projectsGrid}>
              {companyData.projects.map((project: any) => (
                <div
                  key={project.id}
                  className={styles.projectCard}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className={styles.projectImageContainer}>
                    <img
                      src={project.image}
                      alt={project.title}
                      className={styles.projectImage}
                    />
                  </div>
                  <div className={styles.projectInfo}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    <div className={styles.projectLocation}>
                      {project.location}
                    </div>
                    <div className={styles.projectFeatures}>
                      <ul>
                        {project.features
                          .slice(0, 3)
                          .map((feature: string, index: number) => (
                            <li key={index}>{feature}</li>
                          ))}
                      </ul>
                    </div>
                    <button className={styles.viewButton}>View Details</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noProjects}>
              <p>No projects available at the moment.</p>
            </div>
          )}
        </div>
      );
    } else if (activeTab === "about") {
      return (
        <div className={`${styles.section} ${styles.fadeIn}`}>
          <h2>About {companyData.name}</h2>
          <p>{companyData.description}</p>
          <p>
            At {companyData.name}, we are committed to creating exceptional
            living spaces that blend luxury, comfort, and sustainability. Our
            team of experienced architects, designers, and construction
            professionals work together to deliver projects that exceed
            expectations and stand the test of time.
          </p>
          <p>
            With a focus on innovation and quality, we have established
            ourselves as a trusted name in the real estate industry. Our
            commitment to excellence is reflected in every project we undertake.
          </p>
        </div>
      );
    } else if (activeTab === "contact") {
      return (
        <div className={`${styles.section} ${styles.fadeIn}`}>
          <h2>Contact Information</h2>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <h3>Address</h3>
              <p>123 Development Avenue, North Coast, Egypt</p>
            </div>
            <div className={styles.contactItem}>
              <h3>Phone</h3>
              <p>+20 123 456 7890</p>
            </div>
            <div className={styles.contactItem}>
              <h3>Email</h3>
              <p>info@northcoastdev.com</p>
            </div>
            <div className={styles.contactItem}>
              <h3>Working Hours</h3>
              <p>Sunday - Thursday: 9:00 AM - 5:00 PM</p>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonButton}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <Link to="/" className={styles.backButton}>
          ← Back to Home
        </Link>
      </div>

      <div className={styles.companyDetails}>
        <div className={styles.imageSection}>
          <img
            src={companyData.image}
            alt={companyData.name}
            className={styles.companyImage}
          />
        </div>
        <div className={styles.infoSection}>
          <h1 className={styles.companyName}>{companyData.name}</h1>
          <p className={styles.description}>{companyData.description}</p>
          <div className={styles.actions}>
            <a
              href={companyData.website}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.websiteButton}
            >
              Visit Website
            </a>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "projects" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("projects")}
        >
          Projects
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "about" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("about")}
        >
          About
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "contact" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("contact")}
        >
          Contact
        </button>
      </div>

      {renderContent()}
    </div>
  );
};

export default Product;
