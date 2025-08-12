import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { getDirectImageUrl } from "../../utils/imageUtils";

interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
}

// Backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

// Endpoint for places sheet data
const PLACES_ENDPOINT = `${API_BASE_URL}/api/sheets/places`;

const Places: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch(PLACES_ENDPOINT);
        const csvText = await response.text();
        const rows = csvText.split("\n");
        const header = rows[0]
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());
        const idIndex = header.findIndex(
          (col) => col === "id_loc" || col === "id"
        );
        const nameIndex = header.findIndex((col) => col === "name");
        const descIndex = header.findIndex((col) => col === "description");
        const imageIndex = header.findIndex((col) => col === "image_url");
        const dataRows = rows.slice(1);
        const parsedPlaces: Place[] = dataRows
          .map((row) => {
            const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
            const columns = matches.map((column) =>
              column
                .replace(/(^,)|(,$)/g, "")
                .replace(/^"|"$/g, "")
                .trim()
            );
            if (columns[idIndex] && columns[nameIndex]) {
              return {
                id: columns[idIndex],
                name: columns[nameIndex],
                description: descIndex !== -1 ? columns[descIndex] : "",
                image: getDirectImageUrl(columns[imageIndex]),
              };
            }
            return null;
          })
          .filter((place): place is Place => place !== null);
        setPlaces(parsedPlaces);
        setLoading(false);
      } catch (err) {
        setError("Failed to load places data. Please try again later.");
        setLoading(false);
      }
    };
    fetchPlaces();
  }, []);

  const handleCardClick = (place: Place) => {
    navigate(`/places/${place.id}`, { state: { place } });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Places</h1>
        <div>Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Places</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Places</h1>
      <div className={styles.placesGrid}>
        {places.map((place, index) => (
          <div
            key={place.id}
            className={styles.placeCard}
            onClick={() => handleCardClick(place)}
          >
            <div className={styles.imageContainer}>
              <OptimizedImage
                src={place.image}
                alt={place.name}
                className={styles.placeImage}
                loadingDelay={index * 150}
                loadingClassName={styles.imageLoading}
              />
            </div>
            <div className={styles.contentContainer}>
              <div className={styles.placeHeader}>
                <h2>{place.name}</h2>
              </div>
              {place.description && (
                <p className={styles.description}>{place.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Places;
