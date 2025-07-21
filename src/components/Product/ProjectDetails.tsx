import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProjectDetails.module.css";
import useTitle from "../../hooks/useTitle";
import OptimizedImage from "../common/OptimizedImage";

// Google Sheet constants
const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
// Use a more reliable CORS proxy
const CORS_PROXY = "https://corsproxy.io/?";
const PLACES_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2114410627`;

interface ProjectDetail {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  developer: string;
  launchDate: string;
  deliveryDate: string;
  mainFeatures: string[];
  sections: Section[];
  documents: Document[];
  paymentMethodsInfo?: string; // Add this field
}

interface Section {
  title: string;
  features: string[];
  propertyTypes: PropertyType[];
  paymentPlan: string[];
}

interface PropertyType {
  type: string;
  size: string;
  bedrooms: string;
  price: string;
}

interface Document {
  name: string;
  url: string;
}

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
        // Add a cache-busting parameter to prevent 429 errors
        const cacheBuster = Date.now() % 1000;
        return `https://lh3.googleusercontent.com/d/${fileId}?cache=${cacheBuster}`;
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return url;
    }
  } catch (error) {
    // Replace detailed error logging with generic message
    console.error("Image processing error");
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

const parseKeyFeatures = (keyFeaturesStr: string): string[] => {
  if (!keyFeaturesStr) return [];
  return keyFeaturesStr.split(",").map((feature) => feature.trim());
};

function parsePropertyType(typeStr: string) {
  // Example: "Type A 410m – EGP 122,000,000", "Twin House 225m – 5 Beds – EGP 36,000,000"
  // Try to extract type, size, bedrooms, price
  let type = "",
    size = "",
    bedrooms = "",
    price = "";
  let str = typeStr.trim();

  // Extract price (EGP ...)
  const priceMatch = str.match(/EGP[\s\d,]+/i);
  if (priceMatch) {
    price = priceMatch[0].replace(/–|EGP/gi, "").trim();
    str = str.replace(priceMatch[0], "").replace(/–/g, "").trim();
  }

  // Extract bedrooms (e.g., '5 Beds', '3 Bedrooms')
  const bedsMatch = str.match(/(\d+)\s*(Beds?|Bedrooms?)/i);
  if (bedsMatch) {
    bedrooms = bedsMatch[0].trim();
    str = str.replace(bedsMatch[0], "").replace(/–/g, "").trim();
  }

  // Extract size (e.g., '410m', '65–80m', '135–148m')
  const sizeMatch = str.match(/(\d+[–-]?\d*)m/);
  if (sizeMatch) {
    size = sizeMatch[0].replace(/–/g, "-").trim();
    str = str.replace(sizeMatch[0], "").replace(/–/g, "").trim();
  }

  // The rest is the type
  type = str.trim();

  return { type, size, bedrooms, price };
}

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
    let isSectionHeader = false;

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
        isSectionHeader = true;
        continue;
      }

      // Parse main features
      if (isParsingMainFeatures) {
        if (line.startsWith("-")) {
          mainFeatures.push(line.substring(1).trim());
        } else if (!line.includes("⚜") && !line.includes("🔥")) {
          mainFeatures.push(line.trim());
        }
        continue;
      }

      // Handle section titles
      if (
        (line.toUpperCase() === line &&
          !line.startsWith("-") &&
          !line.startsWith("•")) ||
        isSectionHeader
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
        isParsingPaymentPlan = line.includes("PAYMENT PLAN");
        isSectionHeader = false;
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
    // Replace detailed error logging with generic message
    console.error("Data parsing error");
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

// Function to parse sections from the new column structure
const parseSections = (
  sectionsStr: string,
  propertyTypesStr: string,
  deliveryDateStr: string
): Section[] => {
  if (!sectionsStr) return [];

  const sections: Section[] = [];
  const sectionNames = sectionsStr.split(";").map((name) => name.trim());

  // Parse property types by section
  let propertyTypesBySections: Record<string, PropertyType[]> = {};

  if (propertyTypesStr) {
    // Check if property types are divided by sections with a pipe character
    if (propertyTypesStr.includes("|")) {
      const sectionPropertyTypes = propertyTypesStr.split("|");
      sectionPropertyTypes.forEach((sectionData) => {
        const parts = sectionData.split(":");
        if (parts.length >= 2) {
          const sectionName = parts[0].trim();
          const propertyTypes = parts[1].split(";").map((typeStr) => {
            const typeParts = typeStr
              .trim()
              .split("-")
              .map((p) => p.trim());
            return {
              type: typeParts[0] || "",
              size: typeParts[1] || "",
              bedrooms: typeParts[2] || "",
              price: typeParts[3] || "",
            };
          });
          propertyTypesBySections[sectionName] = propertyTypes;
        }
      });
    } else {
      // If no section division, assign all property types to the first section
      const propertyTypes = propertyTypesStr.split(";").map((typeStr) => {
        const typeParts = typeStr
          .trim()
          .split("-")
          .map((p) => p.trim());
        return {
          type: typeParts[0] || "",
          size: typeParts[1] || "",
          bedrooms: typeParts[2] || "",
          price: typeParts[3] || "",
        };
      });

      if (sectionNames.length > 0) {
        propertyTypesBySections[sectionNames[0]] = propertyTypes;
      }
    }
  }

  // Create sections
  sectionNames.forEach((name) => {
    const sectionTitle = name.trim();
    const propertyTypes = propertyTypesBySections[sectionTitle] || [];

    // Extract payment plan and delivery info for this section
    let paymentPlan: string[] = [];

    // Check if delivery date contains section-specific information
    if (deliveryDateStr && deliveryDateStr.includes(sectionTitle)) {
      const regex = new RegExp(`${sectionTitle}[^,;]*?([0-9]+\\s*Years)`, "i");
      const match = deliveryDateStr.match(regex);
      if (match && match[1]) {
        paymentPlan.push(`Delivery ${match[1]}`);
      }
    } else if (deliveryDateStr) {
      // Use general delivery date if no section-specific one
      paymentPlan.push(`Delivery ${deliveryDateStr}`);
    }

    sections.push({
      title: sectionTitle,
      features: [], // We don't have section-specific features in the new structure
      propertyTypes,
      paymentPlan,
    });
  });

  return sections;
};

const ProjectDetails: React.FC = () => {
  const { companyId, projectId } = useParams<{
    companyId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useTitle("Project Details");

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project data from Google Sheets
        const response = await fetch(PLACES_SHEET_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
          throw new Error("No data received from the sheet");
        }

        const rows = parseCSV(csvText);

        // Find the header row to determine column indices
        const headerRow = rows[0];

        const projectIdIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "project_id"
        );
        const nameIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "name"
        );
        const locationIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "location"
        );
        const descriptionIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "description"
        );
        const dataIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "data"
        );
        const keyFeaturesIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "key_features"
        );
        const sectionsIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "sections"
        );
        const propertyTypesIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "property_types"
        );
        const deliveryDateIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "delivery_date"
        );
        const pdfIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "pdf"
        );
        const imagePathIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "image_path"
        );
        const developerIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "developer"
        );
        const launchDateIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "launch_date"
        );
        const paymentMethodsIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "payment_methods"
        );

        let projectData: ProjectDetail | null = null;
        const companyIdIndex = headerRow.findIndex(
          (col) => col.toLowerCase() === "id"
        );
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i];

          // Find by projectId (from URL param)
          let rowProjectId = "";
          if (projectIdIndex >= 0 && columns[projectIdIndex]) {
            rowProjectId = columns[projectIdIndex].replace(/"/g, "");
          } else if (nameIndex >= 0 && columns[nameIndex]) {
            rowProjectId = columns[nameIndex]
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
          }

          // Find by companyId (from URL param)
          let rowCompanyId = "";
          if (companyIdIndex >= 0 && columns[companyIdIndex]) {
            rowCompanyId = columns[companyIdIndex].replace(/"/g, "");
          }

          if (rowProjectId === projectId && rowCompanyId === companyId) {
            // Parse main features
            let mainFeatures: string[] = [];
            let sections: Section[] = [];

            // Try to parse from Data column first
            if (dataIndex >= 0 && columns[dataIndex]) {
              const parsedData = parsePropertyData(columns[dataIndex]);
              mainFeatures = parsedData.mainFeatures;
              sections = parsedData.sections;
            } else {
              // Otherwise use the structured columns
              if (keyFeaturesIndex >= 0 && columns[keyFeaturesIndex]) {
                mainFeatures = parseKeyFeatures(columns[keyFeaturesIndex]);
              }

              if (sectionsIndex >= 0 && propertyTypesIndex >= 0) {
                sections = parseSections(
                  columns[sectionsIndex] || "",
                  columns[propertyTypesIndex] || "",
                  deliveryDateIndex >= 0 ? columns[deliveryDateIndex] || "" : ""
                );
              }
            }

            // Parse documents
            const documents: Document[] = [];

            // First check if there's a specific PDF column
            if (pdfIndex >= 0 && columns[pdfIndex]) {
              const pdfUrl = columns[pdfIndex].trim();
              if (pdfUrl) {
                documents.push({
                  name: "Project Brochure",
                  url: pdfUrl,
                });
              }
            }

            // Then check if there's a documents column with multiple documents
            if (
              columns[columns.length - 1] &&
              columns[columns.length - 1].includes(";")
            ) {
              const docsString = columns[columns.length - 1];
              if (docsString.includes(";")) {
                const docPairs = docsString.split(";");
                docPairs.forEach((pair) => {
                  if (pair.includes(":")) {
                    const [name, url] = pair.split(":");
                    documents.push({
                      name: name.trim(),
                      url: url.trim(),
                    });
                  }
                });
              }
            }

            // Add payment methods information if available
            let paymentMethodsInfo = "";
            if (paymentMethodsIndex >= 0 && columns[paymentMethodsIndex]) {
              paymentMethodsInfo = columns[paymentMethodsIndex].trim();
            }

            // Replace the property types parsing logic inside the main projectData parsing block:
            if (propertyTypesIndex >= 0 && columns[propertyTypesIndex]) {
              const propertyTypesStr = columns[propertyTypesIndex];

              // Split by '|' for sections
              const sectionParts = propertyTypesStr.split("|");
              sectionParts.forEach((sectionData) => {
                let [sectionName, sectionTypes] = sectionData.split(":");
                if (!sectionTypes) {
                  // If no section name, treat all as types
                  sectionTypes = sectionName;
                  sectionName = "Properties";
                }
                sectionName = sectionName.trim();
                const propertyTypes = sectionTypes
                  .split(";")
                  .map((typeStr) => parsePropertyType(typeStr))
                  .filter(
                    (pt) => pt.type || pt.size || pt.bedrooms || pt.price
                  );
                // Find or create the section
                let sectionIndex = sections.findIndex((section) =>
                  section.title.includes(sectionName)
                );
                if (sectionIndex === -1) {
                  sections.push({
                    title: sectionName,
                    features: [],
                    propertyTypes: [],
                    paymentPlan: [],
                  });
                  sectionIndex = sections.length - 1;
                }
                sections[sectionIndex].propertyTypes = propertyTypes;
              });
            }

            // Update the payment plan section to include the payment methods info
            sections.forEach((section) => {
              if (section.paymentPlan && section.paymentPlan.length > 0) {
                section.paymentPlan.push(paymentMethodsInfo);
              }
            });

            // Get image path
            const imagePath =
              imagePathIndex >= 0 && columns[imagePathIndex]
                ? getDirectImageUrl(columns[imagePathIndex])
                : "https://placehold.co/800x600?text=Image+Not+Found";

            // Make sure the sections are properly added to the project data
            projectData = {
              id: projectId,
              name: columns[nameIndex] || "",
              location: columns[locationIndex] || "",
              description: columns[descriptionIndex] || "",
              image: imagePath,
              developer: columns[developerIndex] || "",
              launchDate: columns[launchDateIndex] || "",
              deliveryDate: columns[deliveryDateIndex] || "",
              mainFeatures: mainFeatures,
              // Filter out empty sections and specific sections to remove
              sections: sections.filter(
                (section) =>
                  (section.features.length > 0 ||
                    section.propertyTypes.length > 0 ||
                    section.paymentPlan.length > 0) &&
                  section.title !== "CRYSTA WALK - 90% SEA VIEW" &&
                  section.title !== "CRYSTA ISLANDS - Lagoon View"
              ),
              documents: documents,
              paymentMethodsInfo: paymentMethodsInfo,
            };
            break;
          }
        }

        if (!projectData) {
          throw new Error("Project not found");
        }

        setProject(projectData);
        setLoading(false);
      } catch (err) {
        // Replace detailed error logging with generic message
        console.error("Data fetching error");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load project data. Please try again."
        );
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, companyId]);

  const handleShareClick = () => {
    if (navigator.share) {
      navigator
        .share({
          title: project?.name || "Project Details",
          text: `Check out ${project?.name} at ${project?.location}`,
          url: window.location.href,
        })
        .catch((err) => {
          // Replace detailed error logging with generic message
          console.error("Sharing error");
        });
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          // Replace detailed error logging with generic message
          console.error("Clipboard error");
        });
    }
  };

  const openPdf = (url: string) => {
    // Handle Google Drive links
    if (url.includes("drive.google.com")) {
      // Extract the file ID from the Google Drive URL
      let fileId = "";

      if (url.includes("/file/d/")) {
        fileId = url.split("/file/d/")[1].split("/")[0];
      } else if (url.includes("id=")) {
        fileId = url.split("id=")[1].split("&")[0];
      }

      if (fileId) {
        // Open the Google Drive file in a new tab
        window.open(url, "_blank");
      } else {
        // Fallback if we can't extract the ID
        window.open(url, "_blank");
      }
      return;
    }

    // For all other PDFs, use the modal viewer
    setActivePdf(url);
  };

  const closePdf = () => {
    setActivePdf(null);
    setPdfError(false);
  };

  const handlePdfError = () => {
    setPdfError(true);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonButton}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Project</h2>
          <p>{error || "Project not found"}</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Back
        </button>
      </div>

      <div className={styles.projectDetails}>
        <div className={styles.projectHeader}>
          <OptimizedImage
            src={project.image}
            alt={project.name}
            className={styles.projectImage}
            loadingClassName={styles.imageLoading}
          />
          <div className={styles.projectHeaderInfo}>
            <h1>{project.name}</h1>
            <p className={styles.location}>{project.location}</p>
            <div className={styles.highlightBadge}>Premium Property</div>
          </div>
          <button
            onClick={handleShareClick}
            className={styles.shareButton}
            aria-label="Share"
          >
            {copied ? "Link Copied!" : "Share"}
          </button>
        </div>

        {/* Project Overview */}
        <div className={styles.mainFeatures}>
          <h2>Project Overview</h2>
          {project.description ? (
            <p>{project.description}</p>
          ) : (
            <p>
              A premium development project by {project.developer} in{" "}
              {project.location}.
            </p>
          )}
          <div className={styles.overviewGrid}>
            <div className={styles.overviewItem}>
              <h3>Developer</h3>
              <p>{project.developer}</p>
            </div>
            <div className={styles.overviewItem}>
              <h3>Launch Date</h3>
              <p>{project.launchDate || "Coming Soon"}</p>
            </div>
            <div className={styles.overviewItem}>
              <h3>Delivery Date</h3>
              <p>{project.deliveryDate || "To Be Announced"}</p>
            </div>
          </div>
        </div>

        {/* Main Features */}
        {project.mainFeatures.length > 0 && (
          <div className={styles.mainFeatures}>
            <h2>Key Features</h2>
            <ul>
              {project.mainFeatures.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {project.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={styles.section}>
            <h2>{section.title}</h2>

            {section.features.length > 0 && (
              <div className={styles.features}>
                <h3>Features & Amenities</h3>
                <ul>
                  {section.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.propertyTypes && section.propertyTypes.length > 0 && (
              <div className={styles.propertyTypes}>
                <h3>Available Options</h3>
                <div className={styles.propertyGrid}>
                  {section.propertyTypes.map((property, propertyIndex) => (
                    <div key={propertyIndex} className={styles.propertyCard}>
                      <h4>{property.type}</h4>
                      <div className={styles.propertyDetails}>
                        {property.size && (
                          <span className={styles.propertySize}>
                            {property.size}
                          </span>
                        )}
                        {property.bedrooms && (
                          <span className={styles.propertyBedrooms}>
                            {property.bedrooms}
                          </span>
                        )}
                        {property.price && (
                          <span className={styles.price}>{property.price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Payment Plans Section - Consolidated at the bottom */}
        {project.sections.some(
          (section) =>
            section.paymentPlan &&
            section.paymentPlan.filter(
              (item) => item !== project.paymentMethodsInfo
            ).length > 0
        ) && (
          <div className={styles.section}>
            <h2>Payment Plans</h2>
            <div className={styles.paymentPlansContainer}>
              {project.sections.map((section, sectionIndex) =>
                section.paymentPlan &&
                section.paymentPlan.filter(
                  (item) => item !== project.paymentMethodsInfo
                ).length > 0 ? (
                  <div key={sectionIndex} className={styles.paymentPlan}>
                    {project.sections.length > 1 && <h3>{section.title}</h3>}
                    <ul>
                      {section.paymentPlan
                        .filter((item) => item !== project.paymentMethodsInfo)
                        .map((payment, paymentIndex) => (
                          <li key={paymentIndex} className={styles.paymentItem}>
                            {payment}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null
              )}

              {project.paymentMethodsInfo && (
                <div className={styles.paymentMethods}>
                  <strong>Payment Methods:</strong> {project.paymentMethodsInfo}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Documents */}
        {project.documents && project.documents.length > 0 ? (
          <div className={styles.pdfSection}>
            <h2>Project Documents</h2>
            <div className={styles.pdfSlider}>
              <div className={styles.pdfContainer}>
                {project.documents.map((doc, index) => (
                  <div
                    key={index}
                    className={styles.pdfCard}
                    onClick={() => openPdf(doc.url)}
                  >
                    <div className={styles.pdfIcon}>📄</div>
                    <p className={styles.pdfName}>{doc.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* PDF Modal */}
      {activePdf && (
        <div className={styles.pdfModal} onClick={closePdf}>
          <div
            className={styles.pdfContent}
            onClick={(e) => e.stopPropagation()}
          >
            {pdfError ? (
              <div className={styles.pdfError}>
                <h3>Unable to load document</h3>
                <p>The document could not be loaded in the viewer.</p>
                <div className={styles.pdfErrorActions}>
                  <button
                    className={styles.pdfErrorButton}
                    onClick={() => window.open(activePdf, "_blank")}
                  >
                    Open in New Tab
                  </button>
                  <button className={styles.pdfErrorButton} onClick={closePdf}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={activePdf}
                className={styles.pdfViewer}
                title="PDF Viewer"
                onError={handlePdfError}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            )}
            <button className={styles.closeButton} onClick={closePdf}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
