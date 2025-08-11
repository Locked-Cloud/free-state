import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchSheetData, getDirectImageUrl } from "../../utils/sheetUtils";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
  active: number; // 1 for active, 0 for inactive
}

const DEFAULT_LOGO = "https://placehold.co/800x600?text=Image+Not+Found";

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
  const [sortBy, setSortBy] = useState<"name" | "none">("none");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchSheetData('companies');
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        const csvText = result.data;
        const allRows = csvText.split("\n");

        // Parse the header row to find column indices
        const headerRow = allRows[0]
          .split(",")
          .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

        // Find the index of the "active" column
        const activeColumnIndex = headerRow.findIndex(
          (col) => col === "active" || col === "status"
        );

        // Skip header row for data processing
        const dataRows = allRows.slice(1);

        const parsedCompanies = dataRows
          .map((row) => {
            const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
            const columns = matches.map((column) =>
              column
                .replace(/(^,)|(,$)/g, "")
                .replace(/^"|"$/g, "")
                .trim()
            );

            if (columns[0] && columns[1]) {
              const imageUrl = getDirectImageUrl(columns[4]);

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
                website: columns[3] || "",
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
      } catch (err) {
        console.error("Data fetching error");
        setError(err instanceof Error ? err.message : "Failed to load company data. Please try again later.");
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
