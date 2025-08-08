import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchSheetData, parseCSV, getDirectImageUrl } from "../../utils/sheetUtils";
import { SHEET_TYPES } from "../../utils/sheetUtils";

interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
}

// getDirectImageUrl is now imported from sheetUtils

const Places: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        // Fetch places data from the API service
        const result = await fetchSheetData(SHEET_TYPES.PLACES);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch places data');
        }
        
        const csvText = result.data || '';
        
        // Parse the CSV data
        const rows = parseCSV(csvText);
        
        if (rows.length === 0) {
          throw new Error('No places data found');
        }
        
        const header = rows[0].map(col => col.toLowerCase().trim());
        
        const idIndex = header.findIndex(
          (col) => col === "id_loc" || col === "id"
        );
        const nameIndex = header.findIndex((col) => col === "name");
        const descIndex = header.findIndex((col) => col === "description");
        const imageIndex = header.findIndex((col) => col === "image_url");
        
        const dataRows = rows.slice(1);
        const parsedPlaces: Place[] = dataRows
          .filter(columns => columns.length > 0 && columns[idIndex] && columns[nameIndex])
          .map(columns => ({
            id: columns[idIndex],
            name: columns[nameIndex],
            description: descIndex !== -1 ? columns[descIndex] : "",
            image: getDirectImageUrl(columns[imageIndex]),
          }));
          
        setPlaces(parsedPlaces);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching places:', err);
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
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <div style={{ marginTop: "16px", color: "#666" }}>
            Loading places...
          </div>
        </div>
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
