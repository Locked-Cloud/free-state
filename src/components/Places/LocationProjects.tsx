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
  companyId: string;
}

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";

const DATA_SHEET_GID = "2114410627";

const getProjectsSheetURL = (gid: string) => {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  return process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}${baseUrl}`
    : baseUrl;
};

const PROJECTS_SHEET_URL = getProjectsSheetURL(DATA_SHEET_GID);

const ALTERNATIVE_GIDS = ["0", "1977229403", "658730705", "123456789"];

const PUBLIC_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`;

const getDirectImageUrl = (url: string): string => {
  if (!url || url.trim() === "") {
    console.warn("Empty image URL provided");
    return "https://placehold.co/800x600?text=No+Image";
  }

  try {
    const cleanUrl = url.trim();

    if (cleanUrl.includes("drive.google.com")) {
      let fileId = "";

      if (cleanUrl.includes("/file/d/")) {
        const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (cleanUrl.includes("id=")) {
        const match = cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (cleanUrl.includes("/d/")) {
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }

      if (fileId) {
        const driveUrls = [
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600`,
          `https://drive.google.com/uc?id=${fileId}&export=view`,
          `https://lh3.googleusercontent.com/d/${fileId}=w800-h600`,
          `https://drive.google.com/uc?export=view&id=${fileId}`,
        ];

        return driveUrls[0];
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    if (
      cleanUrl.includes("imgur.com") ||
      cleanUrl.includes("cloudinary.com") ||
      cleanUrl.includes("amazonaws.com") ||
      cleanUrl.includes("unsplash.com") ||
      cleanUrl.includes("picsum.photos") ||
      cleanUrl.includes("via.placeholder.com")
    ) {
      return cleanUrl;
    }

    if (cleanUrl.startsWith("http")) {
      return cleanUrl;
    }
  } catch (error) {
    console.warn("❌ Error processing image URL:", error);
  }

  return "https://placehold.co/800x600?text=Invalid+URL";
};

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
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

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
        setLoading(true);
        setError(null);

        let csvText = "";
        let successfulUrl = "";

        try {
          const response = await fetch(PROJECTS_SHEET_URL);
          if (response.ok) {
            csvText = await response.text();
            successfulUrl = PROJECTS_SHEET_URL;
          } else {
            throw new Error(`Main URL failed: ${response.status}`);
          }
        } catch (mainError) {
          console.log("🔄 Main URL failed, trying alternatives...");

          for (const altGid of ALTERNATIVE_GIDS) {
            if (altGid === DATA_SHEET_GID) continue;

            const altUrl = getProjectsSheetURL(altGid);
            console.log("🌐 Trying alternative URL:", altUrl);

            try {
              const altResponse = await fetch(altUrl);
              if (altResponse.ok) {
                csvText = await altResponse.text();
                successfulUrl = altUrl;
                console.log("✅ Alternative URL successful with GID:", altGid);
                break;
              }
            } catch (altError) {
              console.log("❌ Alternative GID", altGid, "failed");
              continue;
            }
          }

          if (!csvText) {
            throw new Error(`All URL attempts failed. Please check:
1. Sheet permissions: Visit ${PUBLIC_SHEET_URL}
2. Make sure sheet is publicly viewable
3. Verify the "data" sheet exists
4. Check if you're using the correct sheet ID`);
          }
        }

        if (!csvText || csvText.trim() === "") {
          throw new Error(
            "Empty CSV response - check if sheet exists and is accessible"
          );
        }

        if (csvText.includes("<!DOCTYPE html")) {
          throw new Error(
            "Received HTML instead of CSV - sheet may not be publicly accessible. Please visit: " +
              PUBLIC_SHEET_URL
          );
        }

        if (csvText.includes("400. That's an error")) {
          throw new Error(
            "Sheet access denied. Please make sure the sheet is publicly viewable"
          );
        }

        const lines = csvText.split("\n").filter((line) => line.trim());

        if (lines.length === 0) {
          throw new Error("Empty CSV data");
        }

        const headerLine = lines[0];
        const header = parseCSVLine(headerLine).map((col) =>
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

        const dataRows = lines.slice(1);
        const filteredProjects: Project[] = [];

        let projectCounter = 1;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          if (!row.trim()) continue;

          try {
            const columns = parseCSVLine(row);

            const maxIndex = Math.max(
              companyIdIndex,
              projectIdIndex,
              nameIndex,
              descIndex,
              imageIndex,
              idLocIndex
            );

            if (columns.length <= maxIndex) {
              console.warn(
                `Row ${i + 1} has insufficient columns:`,
                columns.length,
                "vs required:",
                maxIndex + 1
              );
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
            console.warn(`Error parsing row ${i + 1}:`, rowError);
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

        if (
          errorMessage.includes("400") ||
          errorMessage.includes("HTTP error")
        ) {
          errorMessage +=
            "\n\n🔧 Fix this by:\n1. Open your Google Sheet\n2. Click 'Share' button\n3. Change to 'Anyone with the link can view'\n4. Make sure the 'data' sheet tab exists";
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
    console.log("Navigating to:", targetUrl);
    navigate(targetUrl);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <div style={{ marginTop: "16px", color: "#666" }}>
            Loading projects from data sheet...
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
            <a
              href={PUBLIC_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Check Sheet Access
            </a>
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
                    console.warn(
                      `❌ Failed to load image for "${project.name}":`,
                      {
                        src: project.image,
                        error: e,
                      }
                    );
                  }}
                />
              </div>
              <div className={styles.contentContainer}>
                <div className={styles.placeHeader}>
                  <h2>{project.name}</h2>
                </div>
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
