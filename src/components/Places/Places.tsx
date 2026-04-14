import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchPlaces } from "../../utils/sheetUtils";
import { ComponentLoader } from "../LoadingScreen";
import type { Place } from "../../types";

const Places: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const data = await fetchPlaces();
        setPlaces(data);
      } catch (err) {
        setError("Failed to load places data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadPlaces();
  }, []);

  const handleCardClick = (place: Place) => {
    navigate(`/places/${place.id}`, { state: { place } });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Places</h1>
        <ComponentLoader message="Loading places..." />
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
              <div className={styles.overlay}>
                <h2 className={styles.overlayTitle}>{place.name}</h2>
                {place.description && (
                  <p className={styles.overlayDesc}>{place.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Places;
