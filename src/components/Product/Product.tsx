import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./Product.module.css";
import useTitle from "../../hooks/useTitle";
import OutOfStock from "../OutOfStock/OutOfStock";
import OptimizedImage from "../common/OptimizedImage";
import { getDirectImageUrl } from "../../utils/imageUtils";
import { fetchCompaniesCSV, fetchProjectsCSV, parseCSV, findColumnIndex } from "../../utils/sheetUtils";
import { ComponentLoader } from "../LoadingScreen";

interface CompanyData {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  active: number;
}

interface ProjectData {
  id: string;
  title: string;
  location: string;
  image: string;
  features: string[];
}

const parseKeyFeatures = (keyFeaturesStr: string): string[] => {
  if (!keyFeaturesStr) return [];
  return keyFeaturesStr.split(",").map((feature) => feature.trim());
};

const Product: React.FC = () => {
  const { id: companyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("projects");

  useTitle("Product Details");

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch companies using centralized function
        const companyRows = await fetchCompaniesCSV();

        // Parse the header row to find column indices
        const headerRow = companyRows[0].map(col => col.toLowerCase().trim());
        const activeColumnIndex = findColumnIndex(headerRow, ['active', 'status']);

        // Skip header row for data processing
        const dataRows = companyRows.slice(1);
        let company: CompanyData | null = null;

        for (const columns of dataRows) {
          if (columns.length < 5) continue;

          if (columns[0] && columns[0] === companyId) {
            const imageUrl = columns[4]
              ? getDirectImageUrl(columns[4])
              : "https://placehold.co/800x600?text=Image+Not+Found";

            let activeValue = "1";
            if (activeColumnIndex !== -1 && columns[activeColumnIndex] !== undefined) {
              activeValue = columns[activeColumnIndex];
            }

            company = {
              id: columns[0],
              name: columns[1],
              description: columns[2] || "",
              image: imageUrl,
              location: columns[5] || "Multiple Locations",
              active: parseInt(activeValue || "1"),
            };
            break;
          }
        }

        if (!company) {
          throw new Error("Company not found");
        }

        setCompanyData(company);

        // Only fetch projects if company is active
        if (company.active === 1) {
          const rows = await fetchProjectsCSV();

          const projectsList: ProjectData[] = [];
          const projHeaderRow = rows[0];
          const idIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "id");
          const projectIdIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "project_id");
          const nameIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "name");
          const locationIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "location");
          const keyFeaturesIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "key_features");
          const imagePathIndex = projHeaderRow.findIndex(col => col.toLowerCase() === "image_path");

          for (let i = 1; i < rows.length; i++) {
            const columns = rows[i];
            if (columns.length < Math.max(idIndex, projectIdIndex) + 1) continue;

            const rowId = columns[idIndex]?.replace(/"/g, "");
            if (rowId === company.id) {
              let projectId = `project-${i}`;
              if (projectIdIndex >= 0 && columns[projectIdIndex]) {
                projectId = columns[projectIdIndex].replace(/"/g, "");
              } else if (nameIndex >= 0 && columns[nameIndex]) {
                projectId = columns[nameIndex]
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "");
              }

              const features =
                keyFeaturesIndex >= 0 && columns[keyFeaturesIndex]
                  ? parseKeyFeatures(columns[keyFeaturesIndex])
                  : ["Premium Location", "Modern Design", "Smart Home Technology"];

              const imagePath =
                imagePathIndex >= 0 && columns[imagePathIndex]
                  ? getDirectImageUrl(columns[imagePathIndex])
                  : company.image;

              projectsList.push({
                id: projectId,
                title: columns[nameIndex] || `Project ${i}`,
                location: columns[locationIndex] || company.location,
                image: imagePath,
                features: features.slice(0, 3),
              });
            }
          }

          setProjects(projectsList);
        } else {
          setProjects([]);
        }
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load data. Please try again."
        );
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Trigger re-fetch by updating a state
    window.location.reload();
  };

  const renderContent = () => {
    if (activeTab === "projects") {
      return (
        <div className={styles.projectsSection}>
          <h2>Projects</h2>
          {projects && projects.length > 0 ? (
            <div className={styles.projectsGrid}>
              {projects.map((project: ProjectData, index: number) => (
                <div
                  key={project.id}
                  className={styles.projectCard}
                  onClick={() =>
                    navigate(`/projects/${companyId}/${project.id}`)
                  }
                >
                  <div className={styles.projectImageContainer}>
                    <OptimizedImage
                      src={project.image}
                      alt={project.title}
                      className={styles.projectImage}
                      loadingDelay={index * 150}
                      loadingClassName={styles.imageLoading}
                    />
                  </div>
                  <div className={styles.projectInfo}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    <div className={styles.projectLocation}>
                      {project.location}
                    </div>
                    <div className={styles.projectFeatures}>
                      <ul>
                        {project.features.map(
                          (feature: string, idx: number) => (
                            <li key={idx}>{feature}</li>
                          )
                        )}
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
          <h2>About {companyData?.name}</h2>
          <p>{companyData?.description}</p>
          <p>
            At {companyData?.name}, we are committed to creating exceptional
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
    } 
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <ComponentLoader message="Loading company details..." />
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

  // If company is inactive, show the OutOfStock component
  if (companyData && companyData.active === 0) {
    return (
      <OutOfStock
        companyName={companyData.name}
        companyImage={companyData.image}
      />
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
          <OptimizedImage
            src={companyData?.image || ""}
            alt={companyData?.name || "Company"}
            className={styles.companyImage}
            loadingClassName={styles.imageLoading}
          />
        </div>
        <div className={styles.infoSection}>
          <h1 className={styles.companyName}>{companyData?.name}</h1>
          <p className={styles.description}>{companyData?.description}</p>
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
        
      </div>

      {renderContent()}
    </div>
  );
};

export default Product;
