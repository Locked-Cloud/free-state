import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchSheetData, parseCSV, getDirectImageUrl } from "../../utils/sheetUtils";
import { SHEET_TYPES } from "../../utils/sheetUtils";

interface Project {
  id: string;
  id_loc: string;
  name: string;
  image: string;
  description?: string;
  companyId: string;
}

// getDirectImageUrl and parseCSV are now imported from sheetUtils

const LocationProjects: React.FC = () => {
  const { id_loc } = useParams<{ id_loc: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string>("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch projects data from the API service
        const result = await fetchSheetData(SHEET_TYPES.PROJECTS);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch projects data');
        }
        
        const csvText = result.data || '';
        
        if (!csvText || csvText.trim() === "") {
          throw new Error(
            "Empty data response - check if data exists and is accessible"
          );
        }

        const rows = parseCSV(csvText);

        if (rows.length === 0) {
          throw new Error("Empty CSV data");
        }

        const header = rows[0].map((col: string) =>
          col.toLowerCase().replace(/"/g, "").trim()
        );

        const companyIdIndex = header.findIndex(
          (col) =>
            col === "id" || col === "company_id" || col.includes("company")
        );
        const projectIdIndex = header.findIndex(
          (col) =>
            col === "project_id" ||
            (col.includes("project") && col.includes("id"))
        );
        const nameIndex = header.findIndex(
          (col) => col === "name" || col === "title" || col === "project_name"
        );
        const descIndex = header.findIndex(
          (col) =>
            col === "description" ||
            col === "desc" ||
            col.includes("detail") ||
            col === "key_features" ||
            col.includes("feature")
        );
        const imageIndex = header.findIndex(
          (col) =>
            col === "image_url" ||
            col === "image" ||
            col === "image_path" ||
            col.includes("photo") ||
            col.includes("pic") ||
            col.includes("img")
        );
        const idLocIndex = header.findIndex(
          (col) =>
            col === "id_loc" || col === "location_id" || col.includes("loc")
        );

        if (nameIndex === -1 || idLocIndex === -1) {
          const errorMsg = `Missing required columns! Found headers: ${header.join(
            ", "
          )}. Need 'name' and 'id_loc' columns.`;
          console.error("❌", errorMsg);
          throw new Error(errorMsg);
        }

        const dataRows = rows.slice(1);
        const filteredProjects: Project[] = [];

        let projectCounter = 1;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          if (!row || row.length === 0) continue;

          try {
            const columns = row;

            const maxIndex = Math.max(
              companyIdIndex,
              projectIdIndex,
              nameIndex,
              descIndex,
              imageIndex,
              idLocIndex
            );

            if (columns.length <= maxIndex) {
              continue;
            }

            const companyId =
              companyIdIndex !== -1
                ? columns[companyIdIndex]?.trim() || ""
                : "";
            const projectId =
              projectIdIndex !== -1
                ? columns[projectIdIndex]?.trim() || ""
                : "";
            const rowIdLoc =
              idLocIndex !== -1 ? columns[idLocIndex]?.trim() || "" : "";
            const rowName =
              nameIndex !== -1 ? columns[nameIndex]?.trim() || "" : "";
            const rowDesc =
              descIndex !== -1 ? columns[descIndex]?.trim() || "" : "";
            const rowImage =
              imageIndex !== -1 ? columns[imageIndex]?.trim() || "" : "";

            if (rowIdLoc && rowIdLoc === id_loc && rowName) {
              let uniqueProjectId;
              if (projectId && projectId !== "") {
                uniqueProjectId = projectId;
              } else {
                uniqueProjectId = companyId
                  ? `${companyId}_${projectCounter}`
                  : `project_${projectCounter}`;
              }

              const imageUrl = getDirectImageUrl(rowImage);

              const project: Project = {
                id: uniqueProjectId,
                id_loc: rowIdLoc,
                name: rowName,
                image: imageUrl,
                description: rowDesc,
                companyId: companyId,
              };

              filteredProjects.push(project);
              projectCounter++;
            }
          } catch (rowError) {
            continue;
          }
        }

        setProjects(filteredProjects);
      } catch (err) {
        console.error("💥 Error fetching projects:", err);

        let errorMessage = "Failed to load projects: ";
        if (err instanceof Error) {
          errorMessage += err.message;
        } else {
          errorMessage += "Unknown error";
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    if (location.state && (location.state as any).place) {
      setPlaceName((location.state as any).place.name);
    }
  }, [id_loc, location.state]);

  const handleProjectClick = (project: Project) => {
    const targetUrl = `/projects/${project.companyId}/${project.id}`;
    navigate(targetUrl);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <div style={{ marginTop: "16px", color: "#666" }}>
            Loading projects...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.error}>
          <div style={{ whiteSpace: "pre-line" }}>{error}</div>
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "8px",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>

      <div
        className={
          projects.length === 0
            ? `${styles.placesGrid} ${styles["placesGrid--centered"]}`
            : styles.placesGrid
        }
      >
        {projects.length === 0 ? (
          <div className={styles.noProjects}>
            <span className={styles.noProjectsIcon}>🏗️</span>
            No projects found for this location.
            <div className={styles.noProjectsSecondary}>
              Please check back later or explore other locations!
            </div>
            <div style={{ fontSize: "0.8em", color: "#999", marginTop: "8px" }}>
              Location ID: {id_loc}
            </div>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={`${project.id}_${index}`}
              className={styles.placeCard}
              onClick={() => handleProjectClick(project)}
            >
              <div className={styles.imageContainer}>
                <OptimizedImage
                  src={project.image}
                  alt={project.name}
                  className={styles.placeImage}
                  loadingDelay={index * 150}
                  loadingClassName={styles.imageLoading}
                  onError={(e) => {
                    // Failed to load image
                  }}
                />
              </div>
              <div className={styles.contentContainer}>
                <div className={styles.placeHeader}>
                  <h2>{project.name}</h2>
                </div>
                {project.description && (
                  <p className={styles.description}>{project.description}</p>
                )}
                <button
                  className={styles.viewMoreButton}
                  aria-label={`View details for ${project.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project);
                  }}
                >
                  View Details <span>&rarr;</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationProjects;
