import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchCompanies } from "../../utils/sheetUtils";
import { Search, Building2, ArrowRight, MapPin, Star, Filter } from "lucide-react";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
  active: number; // 1 for active, 0 for inactive
}

const DEFAULT_LOGO = "https://placehold.co/800x600?text=Image+Not+Found";
// Default logo is used as fallback in OptimizedImage component

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
  const [heroSearchTerm, setHeroSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "none">("none");
  const mainSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Use the fetchCompanies utility function to get data from the server
        const companiesData = await fetchCompanies();
        
        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
        setLoading(false);
      } catch (err) {
        console.error("Data fetching error", err);
        setError("Failed to load company data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
    // Refresh data every 5 minutes to reduce server load
    const interval = setInterval(fetchData, 5 * 60 * 1000);
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
  
  // Handle hero search submission
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(heroSearchTerm);
    
    // Focus on the main search input and scroll to the main section
    if (mainSearchInputRef.current) {
      mainSearchInputRef.current.value = heroSearchTerm;
      mainSearchInputRef.current.focus();
      document.querySelector(`.${styles.mainSection}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            <Building2 size={42} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
            Leading Real Estate Companies in Egypt
          </h1>
          <p className={styles.subtitle}>
            Discover the finest real estate developers and their exceptional
            projects across Egypt's most desirable locations
          </p>
          <form onSubmit={handleHeroSearch} className={styles.searchBoxHero}>
            <input
              type="text"
              placeholder="Search for developers, projects, or locations..."
              value={heroSearchTerm}
              onChange={(e) => setHeroSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              <Search size={22} />
            </button>
          </form>
        </div>
      </div>

      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>
          <Star size={28} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
          Featured Developers
        </h2>
        <div className={styles.featuredGrid}>
          {companies.slice(0, 3).map((company, index) => (
            <div 
              key={`featured-${company.id}`}
              className={styles.featuredCard}
              onClick={() => handleCardClick(company)}
            >
              <div className={styles.featuredImageContainer}>
                <OptimizedImage
                  src={company.imageUrl}
                  alt={`${company.name} logo`}
                  className={styles.featuredImage}
                  loadingDelay={index * 200}
                  loadingClassName={styles.imageLoading}
                  fallbackSrc={DEFAULT_LOGO}
                />
              </div>
              <div className={styles.featuredContent}>
                <h3>{company.name}</h3>
                <div className={styles.locationBadge}>
                  <MapPin size={14} />
                  <span>Premium Locations</span>
                </div>
                <p>{company.description.substring(0, 120)}...</p>
                <div className={styles.viewMoreFeatured}>
                  <span>View Details</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Building2 size={28} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
            All Developers
          </h2>
          <div className={styles.controls}>
            <div className={styles.searchBox}>
                
              </div>
            <div className={styles.sortSelectContainer}>
              <Filter size={16} className={styles.filterIcon} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "none")}
                className={styles.sortSelect}
              >
                <option value="none">Sort by...</option>
                <option value="name">Company Name</option>
              </select>
            </div>
          </div>
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
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Home;
