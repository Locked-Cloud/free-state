import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchSheetData, parseCSV, getDirectImageUrl, SHEET_TYPES } from "../../utils/sheetUtils";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
  active: number; // 1 for active, 0 for inactive
}

const DEFAULT_LOGO = "https://placehold.co/800x600?text=Image+Not+Found";

// LocalStorage cache configuration
const COMPANIES_CACHE_KEY = "companiesCache";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// getDirectImageUrl is now imported from sheetUtils

const LoadingSkeleton = () => (
  <div className={styles.skeletonGrid}>
    {[1, 2, 3, 4, 5, 6].map((n) => (
      <div key={n} className={styles.skeletonCard}>
        <div className={styles.skeletonImage}></div>
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonText}></div>
        </div>
      </div>
    ))}
  </div>
);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load cached companies quickly for better perceived performance
  useEffect(() => {
    const cacheJson = localStorage.getItem(COMPANIES_CACHE_KEY);
    if (!cacheJson) return;
    try {
      const cache = JSON.parse(cacheJson);
      if (Array.isArray(cache.data)) {
        setCompanies(cache.data);
        setFilteredCompanies(cache.data);
        setLoading(false);
      }
    } catch (e) {
      console.warn("Invalid companies cache", e);
    }
  }, []);
  const [sortBy, setSortBy] = useState<"name" | "none">("none");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Skip fetch if cache is fresh
        const cacheJson = localStorage.getItem(COMPANIES_CACHE_KEY);
        if (cacheJson) {
          try {
            const { timestamp } = JSON.parse(cacheJson);
            if (Date.now() - timestamp < CACHE_DURATION_MS) {
              return; // cache still valid; data already loaded by previous effect
            }
          } catch {}
        }

        setLoading(true);
        setError(null);
        
        // Fetch companies data using the API service
        const result = await fetchSheetData(SHEET_TYPES.COMPANIES, 0);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch companies data');
        }
        
        if (!result.data || result.data.trim() === '') {
          throw new Error('No companies data found');
        }
        
        // Parse the CSV data
        const rows = parseCSV(result.data);
        
        if (rows.length < 2) { // At least header row and one data row
          throw new Error('Invalid data format - no company data found');
        }
        
        // Parse the header row to find column indices
        const headerRow = rows[0].map(col => col.toLowerCase());
        
        // Find the index of the "active" column
        const activeColumnIndex = headerRow.findIndex(
          (col) => col === "active" || col === "status"
        );
        
        // Process the data rows
        const parsedCompanies = rows.slice(1)
          .map(columns => {
            if (columns[0] && columns[1]) {
              // Find image path column index (Image_Path in the real data)
              const logoColumnIndex = headerRow.findIndex(
                (col) => col === "logo" || col === "image_path"
              );
              
              // Find website column index (may not exist in the real data)
              const websiteColumnIndex = headerRow.findIndex(
                (col) => col === "website"
              );
              
              // Use the correct column for image URL
              const imageUrl = getDirectImageUrl(columns[logoColumnIndex] || '');
              
              // Get the active value from the correct column index
              let activeValue = "1"; // Default to active
              if (
                activeColumnIndex !== -1 &&
                columns[activeColumnIndex] !== undefined
              ) {
                activeValue = columns[activeColumnIndex];
              }
              
              return {
                id: parseInt(columns[0], 10),
                name: columns[1],
                description: columns[2] || "",
                website: websiteColumnIndex !== -1 ? columns[websiteColumnIndex] || "" : "",
                imageUrl,
                active: parseInt(activeValue || "1"), // Use the found active value
              };
            }
            return null;
          })
          .filter((company): company is Company => company !== null);
        
        setCompanies(parsedCompanies);
        setFilteredCompanies(parsedCompanies);
        setLoading(false);

        // Save to localStorage cache
        localStorage.setItem(
          COMPANIES_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: parsedCompanies })
        );
      } catch (err) {
        console.error("Data fetching error");
        setError("Failed to load company data. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let result = [...companies];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (company) =>
          company.name.toLowerCase().includes(term) ||
          company.description.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredCompanies(result);
  }, [companies, searchTerm, sortBy]);

  const handleCardClick = (company: Company) => {
    navigate(`/product/${company.id}`, {
      state: {
        id: company.id,
        companyName: company.name,
        companyData: company,
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
        <p className={styles.subtitle}>
          Discover the finest real estate developers and their exceptional
          projects
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <i className="fas fa-search"></i>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "none")}
          className={styles.sortSelect}
        >
          <option value="none">Sort by...</option>
          <option value="name">Company Name</option>
        </select>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className={styles.noResults}>
          <i className="fas fa-search"></i>
          <h2>No companies found</h2>
          <p>Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className={styles.companiesGrid}>
          {filteredCompanies.map((company, index) => (
            <div
              key={company.id}
              className={`${styles.companyCard} ${
                company.active === 0 ? styles.inactiveCompany : ""
              }`}
              onClick={() => handleCardClick(company)}
            >
              <div className={styles.imageContainer}>
                <OptimizedImage
                  src={company.imageUrl}
                  alt={`${company.name} logo`}
                  className={styles.companyImage}
                  loadingDelay={index * 200} // Stagger loading by 200ms per item
                  loadingClassName={styles.imageLoading}
                  fallbackSrc={DEFAULT_LOGO}
                />
                {company.active === 0 && (
                  <div className={styles.unavailableBadge}>
                    Currently Unavailable
                  </div>
                )}
              </div>
              <div className={styles.contentContainer}>
                <div className={styles.companyHeader}>
                  <h2>{company.name}</h2>
                </div>
                <p className={styles.description}>{company.description}</p>
                <div className={styles.viewMore}>
                  <span>View Details</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
