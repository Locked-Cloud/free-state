import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProjectDetails.module.css";

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
  pdf_files: string[]; // Array of PDF URLs
}

const DEFAULT_PROJECT_DATA = {
  mainFeatures: [
    "Prime Location",
    "Modern Design",
    "High-Quality Construction",
    "24/7 Security",
    "Parking Available",
  ],
  sections: [
    {
      title: "AMENITIES",
      features: [
        "Swimming Pool",
        "Fitness Center",
        "Children's Play Area",
        "Landscaped Gardens",
        "Community Center",
      ],
      propertyTypes: [],
      paymentPlan: [],
    },
  ],
};

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

const getDirectPdfUrl = (url: string): string => {
  if (!url) return "";

  try {
    if (url.includes("drive.google.com")) {
      let fileId = "";

      if (url.includes("/file/d/")) {
        fileId = url.split("/file/d/")[1].split("/")[0];
      } else if (url.includes("id=")) {
        fileId = url.split("id=")[1].split("&")[0];
      }

      if (fileId) {
        // Use Google Drive viewer URL for PDFs
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    // If it's already a direct PDF URL, return as is
    if (url.toLowerCase().endsWith(".pdf")) {
      return url;
    }
  } catch (error) {
    console.error("Error processing PDF URL:", error);
  }

  return "";
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

const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
const COMPANIES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const PLACES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`;

const ProjectDetails: React.FC = () => {
  const navigate = useNavigate();
  const { companyId, projectId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const fetchCompanyData = useCallback(async () => {
    if (!companyId) return;

    try {
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
    }
  }, [companyId]);

  const fetchProjectData = useCallback(async () => {
    if (!company || !projectId) return;

    try {
      const response = await fetch(PLACES_SHEET_URL);
      const csvText = await response.text();
      const rows = parseCSV(csvText);

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i];
        if (columns.length < 7) continue; // Updated to check for PDF column

        const rowId = parseInt(columns[0].replace(/"/g, ""), 10);
        const currentProjectId = parseInt(columns[1].replace(/"/g, ""), 10);

        if (rowId === company.id && currentProjectId === parseInt(projectId)) {
          const { mainFeatures, sections } = parsePropertyData(columns[4]);
          const pdfUrls = columns[6]
            ? columns[6].split(";").map((url) => url.trim())
            : [];

          setProject({
            id: rowId,
            project_id: currentProjectId,
            name: columns[2] || company.name,
            location: columns[3] || "Multiple Locations",
            mainFeatures: mainFeatures.length
              ? mainFeatures
              : DEFAULT_PROJECT_DATA.mainFeatures,
            sections: sections.length
              ? sections
              : DEFAULT_PROJECT_DATA.sections,
            image_path: getDirectImageUrl(columns[5]) || company.imageUrl,
            pdf_files: pdfUrls,
          });
          return;
        }
      }
      setError("Project not found");
    } catch (err) {
      console.error("Error fetching project data:", err);
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [company, projectId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  useEffect(() => {
    if (company) {
      fetchProjectData();
    }
  }, [fetchProjectData, company]);

  const handleShare = useCallback(() => {
    if (!project || !company) return;

    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: `${company.name} - ${project.location}`,
          text: `Check out ${company.name} properties in ${project.location}`,
          url: shareUrl,
        })
        .catch((error) => console.log("Error sharing:", error));
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        })
        .catch((error) => console.log("Error copying:", error));
    }
  }, [company, project]);

  const handlePdfClick = (pdfUrl: string) => {
    const directUrl = getDirectPdfUrl(pdfUrl);
    if (directUrl) {
      setSelectedPdf(directUrl);
    }
  };

  const handleClosePdf = () => {
    setSelectedPdf(null);
  };

  const scrollPdfContainer = (direction: "left" | "right") => {
    if (pdfContainerRef.current) {
      const scrollAmount = 220; // Card width + gap
      const currentScroll = pdfContainerRef.current.scrollLeft;
      pdfContainerRef.current.scrollTo({
        left:
          direction === "left"
            ? currentScroll - scrollAmount
            : currentScroll + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !project || !company) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Project Not Found</h2>
          <p>
            {error ||
              "The project you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={() => navigate(`/product/${companyId}`)}
            className={styles.backButton}
          >
            Back to Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button
          onClick={() => navigate(`/product/${companyId}`)}
          className={styles.backButton}
        >
          ← Back to Company
        </button>
      </div>

      <div className={styles.projectDetails}>
        <div className={styles.projectHeader}>
          <img
            src={project.image_path}
            alt={project.name}
            className={styles.projectImage}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/800x600?text=Image+Not+Found";
            }}
          />
          <div className={styles.projectHeaderInfo}>
            <h1>{project.name}</h1>
            <p className={styles.location}>{project.location}</p>
          </div>
          <button
            onClick={handleShare}
            className={styles.shareButton}
            title={shareSuccess ? "Link copied!" : "Share this project"}
          >
            {shareSuccess ? "Copied!" : "Share"}
          </button>
        </div>

        <div className={styles.mainFeatures}>
          <h2>Main Features</h2>
          <ul>
            {project.mainFeatures.map((feature, index) => (
              <li key={`main-feature-${index}`}>{feature}</li>
            ))}
          </ul>
        </div>

        {project.pdf_files.length > 0 && (
          <div className={styles.pdfSection}>
            <h2>Project Documents</h2>
            <div className={styles.pdfSlider}>
              <div className={styles.navigationButtons}>
                <button
                  className={styles.navButton}
                  onClick={() => scrollPdfContainer("left")}
                  aria-label="Scroll left"
                >
                  ←
                </button>
                <button
                  className={styles.navButton}
                  onClick={() => scrollPdfContainer("right")}
                  aria-label="Scroll right"
                >
                  →
                </button>
              </div>
              <div className={styles.pdfContainer} ref={pdfContainerRef}>
                {project.pdf_files.map((pdfUrl, index) => {
                  const fileName =
                    pdfUrl.split("/").pop() || `Document ${index + 1}`;
                  return (
                    <div
                      key={`pdf-${index}`}
                      className={styles.pdfCard}
                      onClick={() => handlePdfClick(pdfUrl)}
                    >
                      <div className={styles.pdfIcon}>📄</div>
                      <p className={styles.pdfName}>{fileName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {project.sections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className={styles.section}>
            <h2>{section.title}</h2>

            {section.features.length > 0 && (
              <div className={styles.features}>
                <h3>Features</h3>
                <ul>
                  {section.features.map((feature, index) => (
                    <li key={`feature-${sectionIndex}-${index}`}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.propertyTypes.length > 0 && (
              <div className={styles.propertyTypes}>
                <h3>Available Units</h3>
                <div className={styles.propertyGrid}>
                  {section.propertyTypes.map((type, index) => (
                    <div
                      key={`type-${sectionIndex}-${index}`}
                      className={styles.propertyCard}
                    >
                      <h4>{type.type}</h4>
                      <div className={styles.propertyDetails}>
                        <span>{type.size}</span>
                        <span>{type.bedrooms}</span>
                        {type.price && (
                          <span className={styles.price}>{type.price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.paymentPlan.length > 0 && (
              <div className={styles.paymentPlan}>
                <h3>Payment Plan</h3>
                <ul>
                  {section.paymentPlan.map((plan, index) => (
                    <li key={`payment-${sectionIndex}-${index}`}>{plan}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPdf && (
        <div className={styles.pdfModal} onClick={handleClosePdf}>
          <div
            className={styles.pdfContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={handleClosePdf}>
              ×
            </button>
            <iframe
              src={selectedPdf}
              title="PDF Viewer"
              className={styles.pdfViewer}
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
