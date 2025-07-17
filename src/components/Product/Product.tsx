import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styles from "./Product.module.css";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
}

interface PropertyType {
  type: string;
  size: string;
  bedrooms: string;
  price: string;
}

interface Section {
  title: string;
  features: string[];
  propertyTypes: PropertyType[];
  paymentPlan: string[];
}

interface PlaceDetails {
  id: number;
  project_id: number;
  name: string;
  location: string;
  mainFeatures: string[];
  sections: Section[];
  image_path: string;
}

interface LocationState {
  id: number;
  companyName: string;
  companyData: Company;
}

const DEFAULT_PROJECT_DATA = {
  mainFeatures: [
    "Prime Location",
    "Modern Design",
    "Smart Home Technology",
    "24/7 Security",
    "Green Spaces",
  ],
  sections: [
    {
      title: "AMENITIES",
      features: [
        "Swimming Pool",
        "Fitness Center",
        "Kids Area",
        "Parking Space",
        "Walking Track",
      ],
      propertyTypes: [],
      paymentPlan: [],
    },
    {
      title: "UNIT TYPES",
      features: [],
      propertyTypes: [
        {
          type: "Apartment Type A",
          size: "120m²",
          bedrooms: "2 Beds",
          price: "Contact for Price",
        },
        {
          type: "Apartment Type B",
          size: "150m²",
          bedrooms: "3 Beds",
          price: "Contact for Price",
        },
      ],
      paymentPlan: [],
    },
    {
      title: "PAYMENT PLAN",
      features: [],
      propertyTypes: [],
      paymentPlan: [
        "10% Down Payment",
        "40% During Construction",
        "50% On Delivery",
      ],
    },
  ],
};

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const COMPANIES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const PLACES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`;

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
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return url;
    }
  } catch (error) {
    console.error("Error processing image URL:", error);
  }

  return "https://placehold.co/800x600?text=Image+Not+Found";
};

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !insideQuotes) {
      // End of row
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell)) {
        // Only add non-empty rows
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Add the last cell and row if they exist
  if (currentCell) {
    currentRow.push(currentCell.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
};

const parsePropertyData = (
  data: string
): { mainFeatures: string[]; sections: Section[] } => {
  const sections: Section[] = [];
  const mainFeatures: string[] = [];
  let currentSection: Section | null = null;

  try {
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== '""');

    let isParsingMainFeatures = true;
    let isParsingPaymentPlan = false;

    for (const line of lines) {
      // Skip empty lines and quotation marks
      if (!line || line === '"' || line === '""') continue;

      // Handle section separators
      if (line.includes("•———————•——————•—————-•")) {
        isParsingMainFeatures = false;
        if (currentSection) {
          sections.push({ ...currentSection });
        }
        currentSection = null;
        continue;
      }

      // Parse main features
      if (isParsingMainFeatures) {
        if (line.startsWith("-")) {
          mainFeatures.push(line.substring(1).trim());
        } else if (!line.includes("⚜")) {
          mainFeatures.push(line.trim());
        }
        continue;
      }

      // Handle section titles
      if (
        line.toUpperCase() === line &&
        !line.startsWith("-") &&
        !line.startsWith("•")
      ) {
        if (currentSection) {
          sections.push({ ...currentSection });
        }
        currentSection = {
          title: line,
          features: [],
          propertyTypes: [],
          paymentPlan: [],
        };
        isParsingPaymentPlan = false;
        continue;
      }

      if (!currentSection) continue;

      // Handle payment plan sections
      if (line.toLowerCase().includes("payment plan")) {
        isParsingPaymentPlan = true;
        continue;
      }

      // Parse property types and features
      if (line.startsWith("-")) {
        const trimmedLine = line.substring(1).trim();
        if (trimmedLine.includes("Beds") || /\d+m/.test(trimmedLine)) {
          // Property type line
          const parts = trimmedLine.split("-").map((p) => p.trim());
          if (parts.length >= 3) {
            currentSection.propertyTypes.push({
              type: parts[0],
              size: parts[1],
              bedrooms: parts[2],
              price: parts[3] || "",
            });
          }
        } else {
          // Regular feature
          currentSection.features.push(trimmedLine);
        }
      } else if (!line.startsWith("TYPES")) {
        if (isParsingPaymentPlan || line.includes("%")) {
          currentSection.paymentPlan.push(line.trim());
        } else {
          currentSection.features.push(line.trim());
        }
      }
    }

    // Add the last section if exists
    if (currentSection) {
      sections.push({ ...currentSection });
    }
  } catch (error) {
    console.error("Error parsing property data:", error);
  }

  return {
    mainFeatures: mainFeatures.filter(Boolean), // Remove any empty strings
    sections: sections.filter(
      (section) =>
        section.features.length > 0 ||
        section.propertyTypes.length > 0 ||
        section.paymentPlan.length > 0
    ),
  };
};

const LoadingSkeleton: React.FC = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonImage}></div>
    <div className={styles.skeletonContent}>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonText}></div>
      <div className={styles.skeletonText}></div>
      <div className={styles.skeletonButton}></div>
    </div>
  </div>
);

const Product: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { companyId } = useParams();
  const [company, setCompany] = useState<Company | null>(
    location.state?.companyData || null
  );
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"company" | "projects">("company");

  const fetchCompanyData = useCallback(async () => {
    if (company || !companyId) return;

    try {
      setLoading(true);
      const response = await fetch(COMPANIES_SHEET_URL);
      const csvText = await response.text();
      const rows = csvText.split("\n").slice(1);

      for (const row of rows) {
        const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
        const columns = matches.map((column) =>
          column
            .replace(/(^,)|(,$)/g, "")
            .replace(/^"|"$/g, "")
            .trim()
        );

        if (columns[0] && parseInt(columns[0]) === parseInt(companyId)) {
          const imageUrl = columns[4]
            ? getDirectImageUrl(columns[4])
            : "https://placehold.co/800x600?text=Image+Not+Found";
          setCompany({
            id: parseInt(columns[0]),
            name: columns[1],
            description: columns[2] || "",
            website: columns[3] || "",
            imageUrl,
          });
          return;
        }
      }
      setError("Company not found");
    } catch (err) {
      console.error("Error fetching company data:", err);
      setError("Failed to load company data");
    } finally {
      setLoading(false);
    }
  }, [companyId, company]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const fetchPlaceDetails = useCallback(async () => {
    if (!company) return;

    try {
      setLoading(true);
      setError(null);

      // Get the company's sheet ID from the main sheet
      const mainSheetResponse = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`
      );

      if (!mainSheetResponse.ok) {
        throw new Error(`HTTP error! status: ${mainSheetResponse.status}`);
      }

      const csvText = await mainSheetResponse.text();
      if (!csvText.trim()) {
        throw new Error("No data received from the sheet");
      }

      const rows = parseCSV(csvText);
      const projects: PlaceDetails[] = [];
      const baseTimestamp = Date.now();

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i];

        if (columns.length < 6) continue;

        const rowId = parseInt(columns[0].replace(/"/g, ""), 10);
        if (isNaN(rowId)) continue;

        if (rowId === company.id) {
          // Generate a unique project ID by combining company ID, index, and timestamp
          const projectId =
            parseInt(columns[1].replace(/"/g, ""), 10) ||
            parseInt(`${company.id}${i}${baseTimestamp.toString().slice(-4)}`);

          const { mainFeatures, sections } = parsePropertyData(columns[4]);

          if (!mainFeatures.length && !sections.length) {
            projects.push({
              id: rowId,
              project_id: projectId,
              name: columns[2] || company.name,
              location: columns[3] || "Multiple Locations",
              mainFeatures: DEFAULT_PROJECT_DATA.mainFeatures,
              sections: DEFAULT_PROJECT_DATA.sections,
              image_path: getDirectImageUrl(columns[5]) || company.imageUrl,
            });
          } else {
            projects.push({
              id: rowId,
              project_id: projectId,
              name: columns[2] || company.name,
              location: columns[3] || "Multiple Locations",
              mainFeatures,
              sections,
              image_path: getDirectImageUrl(columns[5]) || company.imageUrl,
            });
          }
        }
      }

      if (projects.length === 0) {
        // Generate a unique project ID for default project
        const defaultProjectId = parseInt(
          `${company.id}0${baseTimestamp.toString().slice(-4)}`
        );
        projects.push({
          id: company.id,
          project_id: defaultProjectId,
          name: company.name,
          location: "Multiple Locations",
          mainFeatures: DEFAULT_PROJECT_DATA.mainFeatures,
          sections: DEFAULT_PROJECT_DATA.sections,
          image_path: company.imageUrl,
        });
      }

      setPlaceDetails(projects);
    } catch (err) {
      console.error("Error fetching place details:", err);
      // Generate a unique project ID for error fallback
      const fallbackProjectId = parseInt(
        `${company.id}999${Date.now().toString().slice(-4)}`
      );
      setPlaceDetails([
        {
          id: company.id,
          project_id: fallbackProjectId,
          name: company.name,
          location: "Multiple Locations",
          mainFeatures: DEFAULT_PROJECT_DATA.mainFeatures,
          sections: DEFAULT_PROJECT_DATA.sections,
          image_path: company.imageUrl,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (company) {
      fetchPlaceDetails();
    }
  }, [fetchPlaceDetails, company]);

  const renderProjectCard = (project: PlaceDetails) => (
    <div
      className={styles.projectCard}
      onClick={() => {
        navigate(`/product/${companyId}/project/${project.project_id}`);
      }}
    >
      {project.image_path && (
        <img
          src={project.image_path}
          alt={project.name}
          className={styles.projectImage}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/800x600?text=Image+Not+Found";
          }}
        />
      )}
      <div className={styles.projectInfo}>
        <h3 className={styles.projectTitle}>{project.name}</h3>
        {project.location && (
          <span className={styles.projectLocation}>{project.location}</span>
        )}
        <div className={styles.projectFeatures}>
          <ul>
            {project.mainFeatures
              .slice(0, 3)
              .map((feature: string, index: number) => (
                <li key={`${project.project_id}-feature-${index}`}>
                  {feature}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className={styles.projectsGrid}>
      {placeDetails.map((project, index) => (
        <div key={`project-${project.project_id}-${index}`}>
          {renderProjectCard(project)}
        </div>
      ))}
    </div>
  );

  const renderCompanyInfo = () => {
    if (!company) return null;

    return (
      <div className={styles.companyDetails}>
        <div className={styles.imageSection}>
          <img
            src={company.imageUrl}
            alt={`${company.name} logo`}
            className={styles.companyImage}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/800x600?text=Image+Not+Found";
            }}
          />
        </div>

        <div className={styles.infoSection}>
          <h1 className={styles.companyName}>{company.name}</h1>
          <p className={styles.description}>{company.description}</p>

          {company.website && (
            <div className={styles.actions}>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.websiteButton}
              >
                Visit Website
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!company) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Company Not Found</h2>
          <p>
            The company you're looking for doesn't exist or has been removed.
          </p>
          <button onClick={() => navigate("/")} className={styles.backButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button onClick={() => navigate("/")} className={styles.backButton}>
          ← Back to Companies
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "company" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("company")}
        >
          Company Info
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "projects" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("projects")}
        >
          Projects
        </button>
      </div>

      {error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button
            onClick={() => setRetryCount((prev) => prev + 1)}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className={styles.fadeIn}>
          {activeTab === "company" ? renderCompanyInfo() : renderProjects()}
        </div>
      )}
    </div>
  );
};

export default Product;
