import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styles from "./Product.module.css";
import useTitle from "../../hooks/useTitle";

// Google Sheet constants
const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const COMPANIES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const PLACES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`;

interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  image: string;
  location: string;
}

interface Project {
  id: string;
  title: string;
  location: string;
  image: string;
  features: string[];
}

const getDirectImageUrl = (url: string): string => {
  if (!url) return "https://placehold.co/800x600?text=Image+Not+Found";

  try {
    if (url.includes("drive.google.com")) {
      let fileId = "";

      if (url.includes("/file/d/")) {
        fileId = url.split("/file/d/")[1].split("/")[0];
      } else if (url.includes("id=")) {
        fileId = url.split("id=")[1].split("&")[0];
      }

      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return url;
    }
  } catch (error) {
    console.error("Error processing image URL:", error);
  }

  return "https://placehold.co/800x600?text=Image+Not+Found";
};

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
  const { id } = useParams<{ id: string }>();
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
        const companyResponse = await fetch(COMPANIES_SHEET_URL);
        const companyText = await companyResponse.text();
        const companyRows = companyText.split("\n").slice(1); // Skip header row

        let company: Company | null = null;

        for (const row of companyRows) {
          const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
          const columns = matches.map((column) =>
            column
              .replace(/(^,)|(,$)/g, "")
              .replace(/^"|"$/g, "")
              .trim()
          );

          if (columns[0] && columns[0] === id) {
            const imageUrl = columns[4]
              ? getDirectImageUrl(columns[4])
              : "https://placehold.co/800x600?text=Image+Not+Found";

            company = {
              id: columns[0],
              name: columns[1],
              description: columns[2] || "",
              website: columns[3] || "",
              image: imageUrl,
              location: columns[5] || "Multiple Locations",
            };
            break;
          }
        }

        if (!company) {
          throw new Error("Company not found");
        }

        setCompanyData(company);

        // Fetch projects data
        const projectsResponse = await fetch(PLACES_SHEET_URL);
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

          if (columns.length < Math.max(idIndex, projectIdIndex) + 1) continue;

          const rowId = columns[idIndex].replace(/"/g, "");
          if (rowId === company.id) {
            const projectId =
              columns[projectIdIndex]?.replace(/"/g, "") || `project-${i}`;
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
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load data. Please try again."
        );
        setLoading(false);
      }
    };

    fetchCompanyData();
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
          {projects && projects.length > 0 ? (
            <div className={styles.projectsGrid}>
              {projects.map((project: Project) => (
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
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "https://placehold.co/800x600?text=Image+Not+Found";
                      }}
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
    } else if (activeTab === "contact") {
      return (
        <div className={`${styles.section} ${styles.fadeIn}`}>
          <h2>Contact Information</h2>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <h3>Address</h3>
              <p>123 Development Avenue, {companyData?.location || "Egypt"}</p>
            </div>
            <div className={styles.contactItem}>
              <h3>Phone</h3>
              <p>+20 123 456 7890</p>
            </div>
            <div className={styles.contactItem}>
              <h3>Email</h3>
              <p>
                info@{companyData?.name.toLowerCase().replace(/\s+/g, "")}
                dev.com
              </p>
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
            src={companyData?.image}
            alt={companyData?.name}
            className={styles.companyImage}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/800x600?text=Image+Not+Found";
            }}
          />
        </div>
        <div className={styles.infoSection}>
          <h1 className={styles.companyName}>{companyData?.name}</h1>
          <p className={styles.description}>{companyData?.description}</p>
          <div className={styles.actions}>
            <a
              href={companyData?.website}
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
