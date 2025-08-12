import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import OptimizedImage from "../common/OptimizedImage";
import { fetchCompanies } from "../../utils/sheetUtils";
import { Search, Building2, ArrowRight, MapPin, Star, Filter, AlertCircle } from "lucide-react";

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

// Debug component to show network/device info
const DebugInfo = ({ error, retryCount }: { error: string | null, retryCount: number }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : null,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
      retryAttempts: retryCount,
    };
    setDebugInfo(info);
  }, [error, retryCount]);

  if (!error) return null;

  return (
    <details style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
      <summary>Debug Info (Tap to expand)</summary>
      <pre style={{ fontSize: '10px', overflow: 'auto' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </details>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [heroSearchTerm, setHeroSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "none">("none");
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mainSearchInputRef = useRef<HTMLInputElement>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchDataWithRetry = async (maxRetries = 3, delay = 1000) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        setError(null);
        
        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        
        // Check if we're online
        if (!navigator.onLine) {
          throw new Error("No internet connection detected");
        }

        // Set a timeout for the fetch operation (30 seconds for mobile)
        const fetchPromise = fetchCompanies();
        const timeoutPromise = new Promise<never>((_, reject) => {
          fetchTimeoutRef.current = setTimeout(() => {
            reject(new Error(`Request timeout after 30 seconds (attempt ${attempt + 1})`));
          }, 30000);
        });

        const companiesData = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Clear timeout on success
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }

        
        if (!Array.isArray(companiesData)) {
          throw new Error("Invalid data format received from server");
        }

        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
        setLoading(false);
        setRetryCount(attempt);
        return; // Success, exit retry loop
        
      } catch (err) {
        
        // Clear timeout on error
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        
        setRetryCount(attempt);
        
        // If this is the last attempt, set error and stop loading
        if (attempt === maxRetries) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
          const mobileSpecificError = `
            Failed to load data after ${maxRetries + 1} attempts. 
            ${errorMessage}
            ${!navigator.onLine ? " (No internet connection)" : ""}
          `;
          
          setError(mobileSpecificError);
          setLoading(false);
          return;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  useEffect(() => {
    fetchDataWithRetry();
    
    // Set up interval with longer delay for mobile to reduce battery usage
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const refreshInterval = isMobile ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10 min for mobile, 5 min for desktop
    
    const interval = setInterval(() => {
      // Only auto-refresh if page is visible and online
      if (!document.hidden && navigator.onLine) {
        fetchDataWithRetry();
      }
    }, refreshInterval);
    
    return () => {
      clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Retry when coming back online
  useEffect(() => {
    if (isOnline && error && companies.length === 0) {
      fetchDataWithRetry();
    }
  }, [isOnline]);

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
  
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(heroSearchTerm);
    
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

  const handleManualRetry = () => {
    setRetryCount(0);
    fetchDataWithRetry();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
          <div style={{ margin: '20px 0' }}>
            <div>Loading companies... {retryCount > 0 && `(Attempt ${retryCount + 1})`}</div>
            {!isOnline && (
              <div style={{ color: 'orange', marginTop: '10px', fontSize: '14px' }}>
                <AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> 
                No internet connection detected
              </div>
            )}
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <AlertCircle size={32} style={{ marginBottom: '10px' }} />
          <h2>Unable to Load Data</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
          
          {!isOnline && (
            <div style={{ color: 'orange', margin: '15px 0', fontSize: '14px' }}>
              <AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> 
              Please check your internet connection
            </div>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleManualRetry}
              disabled={loading}
              className={styles.retryButton}
              style={{ marginRight: '10px' }}
            >
              {loading ? 'Retrying...' : 'Try Again'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Refresh Page
            </button>
          </div>
          
          <DebugInfo error={error} retryCount={retryCount} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Connection status indicator for mobile */}
      {!isOnline && (
        <div style={{ 
          backgroundColor: 'orange', 
          color: 'white', 
          padding: '8px', 
          textAlign: 'center', 
          fontSize: '14px',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> 
          No internet connection
        </div>
      )}

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
            All Developers ({companies.length})
          </h2>
          <div className={styles.controls}>
            <div className={styles.searchBox}>
              
              
            </div>
            <div className={styles.sortSelectContainer}>
              
            </div>
          </div>
        </div>

        {filteredCompanies.length === 0 && companies.length > 0 ? (
          <div className={styles.noResults}>
            <Search size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
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
                    loadingDelay={index * 200}
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