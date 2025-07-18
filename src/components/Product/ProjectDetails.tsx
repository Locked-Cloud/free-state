import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProjectDetails.module.css";
import useTitle from "../../hooks/useTitle";

interface ProjectDetail {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  developer: string;
  launchDate: string;
  deliveryDate: string;
  mainFeatures: string[];
  sections: Section[];
  documents: Document[];
}

interface Section {
  title: string;
  features: string[];
  propertyTypes: PropertyType[];
  paymentPlan: string[];
}

interface PropertyType {
  type: string;
  size: string;
  bedrooms: string;
  price: string;
}

interface Document {
  name: string;
  url: string;
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useTitle("Project Details");

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simulate API call with timeout
        setTimeout(() => {
          // Mock data for demonstration
          const mockProject: ProjectDetail = {
            id: id || "1",
            name: "Coastal Heights",
            location: "North Coast, Egypt",
            description:
              "Coastal Heights is a premium residential project offering luxury apartments and villas with stunning sea views. Located in the most coveted area of the North Coast, this development combines modern architecture with natural beauty.",
            image:
              "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
            developer: "North Coast Developments",
            launchDate: "March 2023",
            deliveryDate: "December 2025",
            mainFeatures: [
              "Premium Beachfront Location",
              "Private Beach Access",
              "Smart Home Technology",
              "Infinity Swimming Pools",
              "Landscaped Gardens",
              "24/7 Security",
              "Fitness Center & Spa",
              "Children's Play Area",
            ],
            sections: [
              {
                title: "AMENITIES",
                features: [
                  "Private Beach Club",
                  "Olympic-sized Swimming Pool",
                  "State-of-the-art Fitness Center",
                  "Tennis & Padel Courts",
                  "Jogging & Cycling Tracks",
                  "Kids Club & Playground",
                  "Spa & Wellness Center",
                  "Outdoor Yoga Area",
                  "Gourmet Restaurants",
                  "Business Center & Co-working Space",
                ],
                propertyTypes: [],
                paymentPlan: [],
              },
              {
                title: "PROPERTY TYPES",
                features: [],
                propertyTypes: [
                  {
                    type: "Apartment Type A",
                    size: "120m²",
                    bedrooms: "2 Bedrooms",
                    price: "$250,000",
                  },
                  {
                    type: "Apartment Type B",
                    size: "180m²",
                    bedrooms: "3 Bedrooms",
                    price: "$350,000",
                  },
                  {
                    type: "Villa Type A",
                    size: "250m²",
                    bedrooms: "4 Bedrooms",
                    price: "$500,000",
                  },
                  {
                    type: "Villa Type B",
                    size: "350m²",
                    bedrooms: "5 Bedrooms",
                    price: "$750,000",
                  },
                ],
                paymentPlan: [],
              },
              {
                title: "PAYMENT PLAN",
                features: [],
                propertyTypes: [],
                paymentPlan: [
                  "10% Down Payment",
                  "10% After 6 Months",
                  "10% After 12 Months",
                  "10% After 18 Months",
                  "60% On Delivery (December 2025)",
                ],
              },
            ],
            documents: [
              {
                name: "Project Brochure",
                url: "https://example.com/brochure.pdf",
              },
              {
                name: "Floor Plans",
                url: "https://example.com/floorplans.pdf",
              },
              {
                name: "Payment Schedule",
                url: "https://example.com/payment.pdf",
              },
              {
                name: "Legal Documents",
                url: "https://example.com/legal.pdf",
              },
            ],
          };

          setProject(mockProject);
          setLoading(false);
        }, 1500);
      } catch (err) {
        setError("Failed to load project data. Please try again.");
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [id]);

  const handleShareClick = () => {
    if (navigator.share) {
      navigator
        .share({
          title: project?.name || "Project Details",
          text: `Check out ${project?.name} at ${project?.location}`,
          url: window.location.href,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
        });
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Error copying to clipboard:", err);
        });
    }
  };

  const openPdf = (url: string) => {
    setActivePdf(url);
  };

  const closePdf = () => {
    setActivePdf(null);
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

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Project</h2>
          <p>{error || "Project not found"}</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Back
        </button>
      </div>

      <div className={styles.projectDetails}>
        <div className={styles.projectHeader}>
          <img
            src={project.image}
            alt={project.name}
            className={styles.projectImage}
          />
          <div className={styles.projectHeaderInfo}>
            <h1>{project.name}</h1>
            <p className={styles.location}>{project.location}</p>
            <div className={styles.highlightBadge}>Premium Property</div>
          </div>
          <button
            onClick={handleShareClick}
            className={styles.shareButton}
            aria-label="Share"
          >
            {copied ? "Link Copied!" : "Share"}
          </button>
        </div>

        {/* Project Overview */}
        <div className={styles.mainFeatures}>
          <h2>Project Overview</h2>
          <p>{project.description}</p>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewItem}>
              <h3>Developer</h3>
              <p>{project.developer}</p>
            </div>
            <div className={styles.overviewItem}>
              <h3>Launch Date</h3>
              <p>{project.launchDate}</p>
            </div>
            <div className={styles.overviewItem}>
              <h3>Delivery Date</h3>
              <p>{project.deliveryDate}</p>
            </div>
          </div>
        </div>

        {/* Main Features */}
        <div className={styles.mainFeatures}>
          <h2>Main Features</h2>
          <ul>
            {project.mainFeatures.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        {project.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={styles.section}>
            <h2>{section.title}</h2>

            {section.features.length > 0 && (
              <div className={styles.features}>
                <ul>
                  {section.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.propertyTypes.length > 0 && (
              <div className={styles.propertyTypes}>
                <h3>Available Options</h3>
                <div className={styles.propertyGrid}>
                  {section.propertyTypes.map((property, propertyIndex) => (
                    <div key={propertyIndex} className={styles.propertyCard}>
                      <h4>{property.type}</h4>
                      <div className={styles.propertyDetails}>
                        <span className={styles.propertySize}>
                          {property.size}
                        </span>
                        <span className={styles.propertyBedrooms}>
                          {property.bedrooms}
                        </span>
                        <span className={styles.price}>{property.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.paymentPlan.length > 0 && (
              <div className={styles.paymentPlan}>
                <h3>Payment Schedule</h3>
                <ul>
                  {section.paymentPlan.map((payment, paymentIndex) => (
                    <li key={paymentIndex} className={styles.paymentItem}>
                      {payment}
                    </li>
                  ))}
                </ul>
                <div className={styles.paymentMethods}>
                  Multiple payment methods available including cash, bank
                  transfer, and installment plans. Contact our sales team for
                  more details.
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Project Documents */}
        {project.documents.length > 0 && (
          <div className={styles.pdfSection}>
            <h2>Project Documents</h2>
            <div className={styles.pdfSlider}>
              <div className={styles.pdfContainer}>
                {project.documents.map((doc, index) => (
                  <div
                    key={index}
                    className={styles.pdfCard}
                    onClick={() => openPdf(doc.url)}
                  >
                    <div className={styles.pdfIcon}>📄</div>
                    <p className={styles.pdfName}>{doc.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {activePdf && (
        <div className={styles.pdfModal} onClick={closePdf}>
          <div
            className={styles.pdfContent}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={activePdf}
              className={styles.pdfViewer}
              title="PDF Viewer"
            />
            <button className={styles.closeButton} onClick={closePdf}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
