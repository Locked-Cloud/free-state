import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
}

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const COMPANIES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const DEFAULT_LOGO = "https://placehold.co/400x300?text=Company+Logo";

const getDirectImageUrl = (url: string): string => {
  if (!url) return DEFAULT_LOGO;

  if (url.includes("drive.google.com")) {
    let fileId = "";

    if (url.includes("/file/d/")) {
      fileId = url.split("/file/d/")[1].split("/")[0];
    } else if (url.includes("id=")) {
      fileId = url.split("id=")[1].split("&")[0];
    }

    if (fileId) {
      const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      return directUrl;
    }
  }

  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
    return url;
  }

  return DEFAULT_LOGO;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(COMPANIES_SHEET_URL);
        const csvText = await response.text();
        const rows = csvText.split("\n").slice(1);
        const parsedCompanies = rows
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
              return {
                id: parseInt(columns[0], 10),
                name: columns[1],
                description: columns[2] || "",
                website: columns[3] || "",
                imageUrl,
              };
            }
            return null;
          })
          .filter((company): company is Company => company !== null);

        setCompanies(parsedCompanies);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load company data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== DEFAULT_LOGO) {
      target.src = DEFAULT_LOGO;
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
        <div className={styles.loading}>Loading companies data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
      <div className={styles.companiesGrid}>
        {companies.map((company) => (
          <div
            key={company.id}
            className={styles.companyCard}
            onClick={() => handleCardClick(company)}
          >
            <div className={styles.imageContainer}>
              <img
                src={company.imageUrl}
                alt={`${company.name} logo`}
                className={styles.companyImage}
                onError={handleImageError}
                loading="lazy"
                crossOrigin="anonymous"
              />
            </div>
            <div className={styles.contentContainer}>
              <div className={styles.companyHeader}>
                <h2>{company.name}</h2>
              </div>
              <p className={styles.description}>{company.description}</p>
              <div className={styles.viewMore}>Click to view details →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
