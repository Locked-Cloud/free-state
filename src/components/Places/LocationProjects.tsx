import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface Project {
  id: string;
  id_loc: string;
  name: string;
  image: string;
  description?: string;
  companyId: string; // Add company ID to the interface
}

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";
const PROJECTS_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=2114410627`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=2114410627`;

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
        const cacheBuster = Date.now() % 1000;
        return `https://lh3.googleusercontent.com/d/${fileId}?cache=${cacheBuster}`;
      }
    }
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return url;
    }
  } catch (error) {
    // Ignore
  }
  return "https://placehold.co/800x600?text=Image+Not+Found";
};

// Proper CSV parser that handles quoted fields and commas within fields
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
};

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
        const response = await fetch(PROJECTS_SHEET_URL);
        const csvText = await response.text();

        const lines = csvText.split("\n").filter((line) => line.trim());

        if (lines.length === 0) {
          throw new Error("Empty CSV data");
        }

        // Parse header line properly
        const headerLine = lines[0];

        const header = parseCSVLine(headerLine).map((col) =>
          col.toLowerCase().replace(/"/g, "")
        );

        // Find column indices
        const companyIdIndex = header.findIndex((col) => col === "id"); // This is company ID
        const projectIdIndex = header.findIndex((col) => col === "project_id"); // Look for project_id column
        const nameIndex = header.findIndex((col) => col === "name");
        const descIndex = header.findIndex((col) => col === "description");
        const imageIndex = header.findIndex((col) => col === "image_url");
        const idLocIndex = header.findIndex((col) => col === "id_loc");

        if (nameIndex === -1 || idLocIndex === -1) {
          const errorMsg = `Missing required columns! Found: ${header.join(
            ", "
          )}`;
          console.error("❌", errorMsg);
          throw new Error(errorMsg);
        }

        // Parse data rows
        const dataRows = lines.slice(1);
        const filteredProjects: Project[] = [];

        let projectCounter = 1; // Counter for projects in this location

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          // Use proper CSV parsing
          const columns = parseCSVLine(row);

          // Ensure we have enough columns
          if (
            columns.length <=
            Math.max(
              companyIdIndex,
              projectIdIndex,
              nameIndex,
              descIndex,
              imageIndex,
              idLocIndex
            )
          ) {
            continue;
          }

          const companyId =
            companyIdIndex !== -1 ? columns[companyIdIndex] : "";
          const projectId =
            projectIdIndex !== -1 ? columns[projectIdIndex] : null;
          const rowIdLoc = idLocIndex !== -1 ? columns[idLocIndex] : "";
          const rowName = nameIndex !== -1 ? columns[nameIndex] : "";

          // Check if this project belongs to the requested location
          if (rowIdLoc && rowIdLoc === id_loc) {
            // Create unique project ID: use project_id if exists, otherwise create from company+row
            let uniqueProjectId;
            if (projectId && projectId.trim() !== "") {
              uniqueProjectId = projectId;
            } else {
              // Create unique ID from company ID and row number
              uniqueProjectId = `${companyId}_${projectCounter}`;
            }

            const project: Project = {
              id: uniqueProjectId,
              id_loc: rowIdLoc,
              name: rowName || "",
              image: getDirectImageUrl(
                imageIndex !== -1 ? columns[imageIndex] : ""
              ),
              description: descIndex !== -1 ? columns[descIndex] : "",
              companyId: companyId, // Store the actual company ID
            };

            filteredProjects.push(project);
            projectCounter++; // Increment counter for next project
          }
        }

        setProjects(filteredProjects);
        setLoading(false);
      } catch (err) {
        console.error("💥 Error fetching projects:", err);
        setError(
          `Failed to load projects: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.error}>{error}</div>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project);
                  }}
                >
                  View Details &rarr;
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
