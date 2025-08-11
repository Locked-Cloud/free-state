import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
}

const SHEET_ID = process.env.REACT_APP_SHEET_ID || "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const CORS_PROXY = process.env.REACT_APP_CORS_PROXY || "https://corsproxy.io/?";
const PLACES_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=658730705`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=658730705`;

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

const Places: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch(PLACES_SHEET_URL);
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
                loadingDelay={index * 100} // Reduced delay for faster loading
                loadingClassName={styles.imageLoading}
                priority={index < 3} // Prioritize first 3 images
                width={300}
                height={200}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
