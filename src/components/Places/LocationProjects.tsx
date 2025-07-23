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
}

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = "https://corsproxy.io/?";
const PROJECTS_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`;

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
        const rows = csvText.split("\n");
        const header = rows[0]
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());
        const idLocIndex = header.findIndex((col) => col === "id_loc");
        const idIndex = header.findIndex(
          (col) => col === "project_id" || col === "id"
        );
        const nameIndex = header.findIndex((col) => col === "name");
        const imageIndex = header.findIndex(
          (col) => col === "image_path" || col === "image_url"
        );
        const descIndex = header.findIndex((col) => col === "description");
        const dataRows = rows.slice(1);
        const filteredProjects = dataRows
          .map((row) => {
            const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
            const columns = matches.map((column) =>
              column
                .replace(/(^,)|(,$)/g, "")
                .replace(/^"|"$/g, "")
                .trim()
            );
            if (columns[idLocIndex] === id_loc) {
              return {
                id: columns[idIndex] || "",
                id_loc: columns[idLocIndex],
                name: columns[nameIndex] || "",
                image: getDirectImageUrl(columns[imageIndex]),
                description:
                  descIndex !== -1 && columns[descIndex]
                    ? columns[descIndex]
                    : "",
              };
            }
            return null;
          })
          .filter((proj): proj is NonNullable<typeof proj> => proj !== null);
        setProjects(filteredProjects);
        setLoading(false);
      } catch (err) {
        setError("Failed to load projects data. Please try again later.");
        setLoading(false);
      }
    };
    fetchProjects();
    // Get place name from navigation state if available
    if (location.state && (location.state as any).place) {
      setPlaceName((location.state as any).place.name);
    }
  }, [id_loc, location.state]);

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${id_loc}/${project.id}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div>Loading...</div>
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
      <div className={styles.placesGrid}>
        {projects.length === 0 ? (
          <div>No projects found for this location.</div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
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
                <div className={styles.viewMore}>
                  <span>View Details</span>
                  <span className={styles.arrow}>&rarr;</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationProjects;
