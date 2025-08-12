import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./Product.module.css";
import useTitle from "../../hooks/useTitle";
import OutOfStock from "../OutOfStock/OutOfStock";
import OptimizedImage from "../common/OptimizedImage";
import { getDirectImageUrl } from "../../utils/imageUtils";

// Backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Endpoints for sheet data
const COMPANIES_ENDPOINT = `${API_BASE_URL}/api/sheets/companies`;
const PROJECTS_ENDPOINT = `${API_BASE_URL}/api/sheets/projects`; 

// Remove the inline OutOfStock component since we now have a standalone one

interface Company {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  active: number; // 1 for active, 0 for inactive
}

interface Project {
  id: string;
  title: string;
  location: string;
  image: string;
  features: string[];
}

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !insideQuotes) {
      // End of row
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell)) {
        // Only add non-empty rows
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Add the last cell and row if they exist
  if (currentCell) {
    currentRow.push(currentCell.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
};

const parseKeyFeatures = (keyFeaturesStr: string): string[] => {
  if (!keyFeaturesStr) return [];
  return keyFeaturesStr.split(",").map((feature) => feature.trim());
};

const Product: React.FC = () => {
  const { id: companyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<string>("projects");

  useTitle("Product Details");

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch company data
        const companyResponse = await fetch(COMPANIES_ENDPOINT);
        const companyText = await companyResponse.text();
        const companyRows = companyText.split("\n");

        // Parse the header row to find column indices
        const headerRow = companyRows[0]
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

        // Find the index of the "active" column
        const activeColumnIndex = headerRow.findIndex(
          (col) => col === "active" || col === "status"
        );

        // Skip header row for data processing
        const dataRows = companyRows.slice(1);

        let company: Company | null = null;

        for (const row of dataRows) {
          const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
          const columns = matches.map((column) =>
            column
              .replace(/(^,)|(,$)/g, "")
              .replace(/^"|"$/g, "")
              .trim()
          );

          if (columns[0] && columns[0] === companyId) {
            const imageUrl = columns[4]
              ? getDirectImageUrl(columns[4])
              : "https://placehold.co/800x600?text=Image+Not+Found";

            // Get the active value from the correct column index
            let activeValue = "1"; // Default to active
            if (
              activeColumnIndex !== -1 &&
              columns[activeColumnIndex] !== undefined
            ) {
              activeValue = columns[activeColumnIndex];
            }

            company = {
              id: columns[0],
              name: columns[1],
              description: columns[2] || "",
              image: imageUrl,
              location: columns[5] || "Multiple Locations",
              active: parseInt(activeValue || "1"), // Use the found active value
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
          // Fetch projects data
          const projectsResponse = await fetch(PROJECTS_ENDPOINT);
          if (!projectsResponse.ok) {
            throw new Error(`HTTP error! status: ${projectsResponse.status}`);
          }

          const csvText = await projectsResponse.text();
          if (!csvText.trim()) {
            throw new Error("No data received from the sheet");
          }

          const rows = parseCSV(csvText);
          const projectsList: Project[] = [];

          // Find the header row to determine column indices
          const headerRow = rows[0];
          const idIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "id"
          );
          const projectIdIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "project_id"
          );
          const nameIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "name"
          );
          const locationIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "location"
          );
          const keyFeaturesIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "key_features"
          );
          const imagePathIndex = headerRow.findIndex(
            (col) => col.toLowerCase() === "image_path"
          );

          // Skip header row
          for (let i = 1; i < rows.length; i++) {
            const columns = rows[i];

            if (columns.length < Math.max(idIndex, projectIdIndex) + 1)
              continue;

            const rowId = columns[idIndex].replace(/"/g, "");
            if (rowId === company.id) {
              let projectId = `project-${i}`;
              if (projectIdIndex >= 0 && columns[projectIdIndex]) {
                projectId = columns[projectIdIndex].replace(/"/g, "");
              } else if (nameIndex >= 0 && columns[nameIndex]) {
                // fallback: use project name as id (slugified)
                projectId = columns[nameIndex]
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "");
              }
              const features =
                keyFeaturesIndex >= 0 && columns[keyFeaturesIndex]
                  ? parseKeyFeatures(columns[keyFeaturesIndex])
                  : [
                      "Premium Location",
                      "Modern Design",
                      "Smart Home Technology",
                    ];

              const imagePath =
                imagePathIndex >= 0 && columns[imagePathIndex]
                  ? getDirectImageUrl(columns[imagePathIndex])
                  : company.image;

              projectsList.push({
                id: projectId,
                title: columns[nameIndex] || `Project ${i}`,
                location: columns[locationIndex] || company.location,
                image: imagePath,
                features: features.slice(0, 3), // Limit to 3 features for display
              });
            }
          }

          setProjects(projectsList);
        } else {
          setProjects([]); // No projects if company is inactive
        }
        setLoading(false);
      } catch (err) {
        // Replace detailed error logging with generic message
        console.error("Data fetching error");
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
    // Re-fetch data
  };

  const renderContent = () => {
    if (activeTab === "projects") {
      return (
        <div className={styles.projectsSection}>
          <h2>Projects</h2>
          {projects && projects.length > 0 ? (
            <div className={styles.projectsGrid}>
              {projects.map((project: Project, index: number) => (
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
                      loadingDelay={index * 150} // Stagger loading by 150ms per item
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
                          (feature: string, index: number) => (
                            <li key={index}>{feature}</li>
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
