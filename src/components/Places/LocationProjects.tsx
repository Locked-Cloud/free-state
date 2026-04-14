import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchLocationProjects } from "../../utils/sheetUtils";
import { ComponentLoader } from "../LoadingScreen";
import type { LocationProject } from "../../types";

const LocationProjects: React.FC = () => {
  const { id_loc } = useParams<{ id_loc: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<LocationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string>("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id_loc) {
          throw new Error("Location ID is required");
        }

        const data = await fetchLocationProjects(id_loc);
        setProjects(data);
      } catch (err) {
        const errorMessage = err instanceof Error
          ? `Failed to load projects: ${err.message}`
          : "Failed to load projects. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();

    if (location.state && (location.state as any).place) {
      setPlaceName((location.state as any).place.name);
    }
  }, [id_loc, location.state]);

  const handleProjectClick = (project: LocationProject) => {
    navigate(`/projects/${project.companyId}/${project.id}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <ComponentLoader message="Loading projects..." />
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
              }}
            >
              Try Again
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
