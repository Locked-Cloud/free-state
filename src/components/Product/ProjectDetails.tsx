"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import styles from "./ProjectDetails.module.css"
import useTitle from "../../hooks/useTitle"
import OptimizedImage from "../common/OptimizedImage"

// Google Sheet constants
const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM"
const CORS_PROXY = "https://corsproxy.io/?"
const PLACES_SHEET_URL =
  process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1884577336`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1884577336`

interface ProjectDetail {
  id: string
  projectId: string
  idLoc: string
  name: string
  projectSection: string
  locationArea: string
  locationDetails: string
  facilities: string
  unitTypesAndSizes: string
  bedroomsPerUnit: string
  startingPriceEGP: string
  specialFeatures: string
  paymentPlan: string
  deliveryTimeline: string
  imagePath: string
  pdf: string
  // Parsed data for display
  facilitiesList: Array<{
    name: string
  }>
  unitTypesList: Array<{
    type: string
    size: string
    bedrooms: string
    price: string
    category?: string
  }>
  specialFeaturesList: string[]
  priceRange: {
    min: number
    max: number
    hasRange: boolean
    formattedMin: string
    formattedMax: string
  }
}

// Enhanced image URL processing
const getDirectImageUrl = (url: string): string => {
  if (!url || url.trim() === "") {
    return ""
  }

  try {
    const cleanUrl = url.replace(/[""]/g, "").trim()

    if (cleanUrl.includes("drive.google.com")) {
      let fileId = ""
      if (cleanUrl.includes("/file/d/")) {
        fileId = cleanUrl.split("/file/d/")[1].split("/")[0]
      } else if (cleanUrl.includes("id=")) {
        fileId = cleanUrl.split("id=")[1].split("&")[0]
      }

      if (fileId) {
        const cacheBuster = Date.now() % 1000
        return `https://lh3.googleusercontent.com/d/${fileId}?cache=${cacheBuster}`
      }
    }

    return cleanUrl
  } catch (error) {
    return ""
  }
}

// Robust CSV parser for Google Sheets format
const parseCSV = (text: string): string[][] => {
  const result: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        cell += '"'
        i += 2
        continue
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
        continue
      }
    }

    if (!inQuotes) {
      if (char === ",") {
        // End of cell
        row.push(cell.trim())
        cell = ""
        i++
        continue
      } else if (char === "\n" || char === "\r") {
        // End of row
        if (cell || row.length > 0) {
          row.push(cell.trim())
          if (row.some((c) => c.trim())) {
            // Only add non-empty rows
            result.push(row)
          }
          row = []
          cell = ""
        }
        // Skip \r\n combinations
        if (char === "\r" && nextChar === "\n") {
          i += 2
        } else {
          i++
        }
        continue
      }
    }

    cell += char
    i++
  }

  // Add final cell and row if they exist
  if (cell || row.length > 0) {
    row.push(cell.trim())
    if (row.some((c) => c.trim())) {
      result.push(row)
    }
  }

  return result
}

// Standardized data cleaning function
const cleanData = (data: string): string => {
  if (!data) return ""
  return data.replace(/[""]/g, "").trim()
}

// Parse facilities from standardized format
const parseFacilities = (facilitiesStr: string): Array<{ name: string }> => {
  const cleaned = cleanData(facilitiesStr)
  if (!cleaned || cleaned.toLowerCase() === "n/a") {
    return []
  }

  return cleaned
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }))
}

// Parse unit types with enhanced handling
const parseUnitTypes = (
  unitTypesStr: string,
  bedroomsStr: string,
  pricesStr: string,
): Array<{
  type: string
  size: string
  bedrooms: string
  price: string
  category?: string
}> => {
  const unitTypes: Array<{
    type: string
    size: string
    bedrooms: string
    price: string
    category?: string
  }> = []

  const cleanedUnitTypes = cleanData(unitTypesStr)
  const cleanedBedrooms = cleanData(bedroomsStr)
  const cleanedPrices = cleanData(pricesStr)

  if (!cleanedUnitTypes || cleanedUnitTypes.toLowerCase() === "n/a") {
    return unitTypes
  }

  // Parse bedroom data into lookup object
  const bedroomData: { [key: string]: string } = {}
  if (cleanedBedrooms && cleanedBedrooms.toLowerCase() !== "n/a") {
    cleanedBedrooms.split(";").forEach((entry) => {
      const match = entry.trim().match(/(.+?):\s*(.+)/)
      if (match) {
        const unitName = match[1].trim()
        const bedrooms = match[2].trim()
        bedroomData[unitName] = bedrooms
      }
    })
  }

  // Parse price data into lookup object
  const priceData: { [key: string]: string } = {}
  if (cleanedPrices && cleanedPrices.toLowerCase() !== "n/a") {
    cleanedPrices.split(";").forEach((entry) => {
      const match = entry.trim().match(/(.+?):\s*(.+)/)
      if (match) {
        const unitName = match[1].trim()
        const price = match[2].trim()
        priceData[unitName] = price
      }
    })
  }

  // Parse unit types
  cleanedUnitTypes.split(";").forEach((entry) => {
    const trimmedEntry = entry.trim()
    if (!trimmedEntry) return

    // Handle different formats: "UnitName - Size" or "UnitName"
    const parts = trimmedEntry.split(" - ").map((p) => p.trim())
    const unitName = parts[0]
    const size = parts[1] || "Contact for details"

    // Get bedrooms
    let bedrooms = "Contact for details"
    const bedroomCount = bedroomData[unitName]
    if (bedroomCount) {
      const bedCount = Number.parseInt(bedroomCount)
      if (!isNaN(bedCount)) {
        bedrooms = bedCount === 1 ? "1 Bedroom" : `${bedCount} Bedrooms`
      } else {
        bedrooms = bedroomCount
      }
    }

    // Get price
    let price = "Contact for pricing"
    const priceValue = priceData[unitName]
    if (priceValue) {
      const numericPrice = Number.parseInt(priceValue)
      if (!isNaN(numericPrice)) {
        price = `EGP ${numericPrice.toLocaleString()}`
      } else {
        price = priceValue
      }
    }

    // Categorize unit types
    let category = "Standard"
    const lowerUnitName = unitName.toLowerCase()
    if (lowerUnitName.includes("chalet")) {
      category = lowerUnitName.includes("premium") ? "Premium Chalets" : "Chalets"
    } else if (lowerUnitName.includes("villa")) {
      if (lowerUnitName.includes("twin")) {
        category = "Twin Villas"
      } else if (lowerUnitName.includes("standalone")) {
        category = "Standalone Villas"
      } else {
        category = "Villas"
      }
    } else if (lowerUnitName.includes("beach house")) {
      category = "Beach Houses"
    } else if (lowerUnitName.includes("townhouse") || lowerUnitName.includes("town house")) {
      category = "Townhouses"
    } else if (lowerUnitName.includes("cabana")) {
      category = "Cabanas"
    }

    unitTypes.push({
      type: unitName,
      size,
      bedrooms,
      price,
      category,
    })
  })

  // Sort by category and then by price
  return unitTypes.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || "").localeCompare(b.category || "")
    }

    // Extract numeric price for sorting
    const priceA = a.price.match(/[\d,]+/)
    const priceB = b.price.match(/[\d,]+/)

    if (priceA && priceB) {
      const numA = Number.parseInt(priceA[0].replace(/,/g, ""))
      const numB = Number.parseInt(priceB[0].replace(/,/g, ""))
      return numA - numB
    }

    return a.type.localeCompare(b.type)
  })
}

// Parse special features from standardized format
const parseSpecialFeatures = (featuresStr: string): string[] => {
  const cleaned = cleanData(featuresStr)
  if (!cleaned || cleaned.toLowerCase() === "n/a") {
    return []
  }

  return cleaned
    .split(";")
    .map((feature) => feature.trim())
    .filter((feature) => feature && feature.toLowerCase() !== "n/a")
}

// Parse price range with enhanced error handling
const parsePriceRange = (pricesStr: string): any => {
  const cleaned = cleanData(pricesStr)
  if (!cleaned || cleaned.toLowerCase() === "n/a") {
    return {
      min: 0,
      max: 0,
      hasRange: false,
      formattedMin: "Contact for pricing",
      formattedMax: "Contact for pricing",
    }
  }

  const prices: number[] = []
  cleaned.split(";").forEach((entry) => {
    const match = entry.trim().match(/:\s*([\d,]+)/)
    if (match) {
      const numericPrice = Number.parseInt(match[1].replace(/,/g, ""))
      if (!isNaN(numericPrice)) {
        prices.push(numericPrice)
      }
    }
  })

  if (prices.length > 0) {
    const min = Math.min(...prices)
    const max = Math.max(...prices)

    return {
      min,
      max,
      hasRange: min !== max,
      formattedMin: `EGP ${min.toLocaleString()}`,
      formattedMax: `EGP ${max.toLocaleString()}`,
    }
  }

  return {
    min: 0,
    max: 0,
    hasRange: false,
    formattedMin: "Contact for pricing",
    formattedMax: "Contact for pricing",
  }
}

const ProjectDetails: React.FC = () => {
  const { companyId, projectId } = useParams<{
    companyId: string
    projectId: string
  }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activePdf, setActivePdf] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  useTitle("Project Details")

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(PLACES_SHEET_URL)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const csvText = await response.text()

        if (!csvText.trim()) {
          throw new Error("No data received from the sheet")
        }

        const rows = parseCSV(csvText)

        if (rows.length < 2) {
          throw new Error("Invalid data format - no data rows found")
        }

        // Ensure we have at least 16 columns for all expected data
        const expectedColumns = 16
        const headers = rows[0]

        if (headers.length < expectedColumns) {
          console.warn(`Warning: Expected ${expectedColumns} columns, got ${headers.length}`)
        }

        let projectData: ProjectDetail | null = null

        // Search for the project
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]

          // Ensure row has enough columns
          while (row.length < expectedColumns) {
            row.push("")
          }

          const rowCompanyId = cleanData(row[0] || "")
          const rowProjectId = cleanData(row[1] || "")

          if (String(rowCompanyId) === String(companyId) && String(rowProjectId) === String(projectId)) {
            // Extract all raw data with standardized cleaning
            const rawData = {
              id: rowCompanyId,
              projectId: rowProjectId,
              idLoc: cleanData(row[2] || ""),
              name: cleanData(row[3] || ""),
              projectSection: cleanData(row[4] || ""),
              locationArea: cleanData(row[5] || ""),
              locationDetails: cleanData(row[6] || ""),
              facilities: cleanData(row[7] || ""),
              unitTypesAndSizes: cleanData(row[8] || ""),
              bedroomsPerUnit: cleanData(row[9] || ""),
              startingPriceEGP: cleanData(row[10] || ""),
              specialFeatures: cleanData(row[11] || ""),
              paymentPlan: cleanData(row[12] || ""),
              deliveryTimeline: cleanData(row[13] || ""),
              imagePath: cleanData(row[14] || ""),
              pdf: cleanData(row[15] || ""),
            }

            // Parse the data for display
            const facilitiesList = parseFacilities(rawData.facilities)
            const unitTypesList = parseUnitTypes(
              rawData.unitTypesAndSizes,
              rawData.bedroomsPerUnit,
              rawData.startingPriceEGP,
            )
            const specialFeaturesList = parseSpecialFeatures(rawData.specialFeatures)
            const priceRange = parsePriceRange(rawData.startingPriceEGP)

            projectData = {
              ...rawData,
              facilitiesList,
              unitTypesList,
              specialFeaturesList,
              priceRange,
              imagePath: getDirectImageUrl(rawData.imagePath),
            }
            break
          }
        }

        if (!projectData) {
          throw new Error("Project not found in Google Sheets")
        }

        setProject(projectData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (projectId && companyId) {
      fetchProjectData()
    }
  }, [projectId, companyId])

  const handleShareClick = () => {
    if (navigator.share) {
      navigator
        .share({
          title: project?.name || "Project Details",
          text: `Check out ${project?.name} at ${project?.locationArea}`,
          url: window.location.href,
        })
        .catch((err) => console.error("Sharing error"))
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch((err) => console.error("Clipboard error"))
    }
  }

  const openPdf = (url: string) => {
    if (!url) return

    if (url.includes("drive.google.com")) {
      window.open(url, "_blank")
      return
    }

    setActivePdf(url)
  }

  const closePdf = () => {
    setActivePdf(null)
    setPdfError(false)
  }

  const handlePdfError = () => {
    setPdfError(true)
  }

  // Group unit types by category
  const groupedUnitTypes =
    project?.unitTypesList.reduce(
      (groups, unit) => {
        const category = unit.category || "Other"
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(unit)
        return groups
      },
      {} as Record<string, typeof project.unitTypesList>,
    ) || {}

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading project details from Google Sheets...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>Project Not Found</h2>
          <p>{error || "The requested project could not be found."}</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <span className={styles.backIcon}>←</span>
          Back to Projects
        </button>
      </div>

      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroImage}>
          <OptimizedImage
            src={project.imagePath}
            alt={project.name}
            className={styles.heroImg}
            loadingClassName={styles.imageLoading}
          />
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>{project.name || "Project Details"}</h1>
              {project.projectSection && <p className={styles.heroSubtitle}>{project.projectSection}</p>}
              <div className={styles.heroLocation}>
                <span className={styles.locationIcon}>📍</span>
                {project.locationArea || "Location not specified"}
                {project.locationDetails && ` • ${project.locationDetails}`}
              </div>
              <div className={styles.heroBadges}>
                <span className={styles.premiumBadge}>Premium Property</span>
                <span className={styles.sectionBadge}>
                  {project.unitTypesList.length > 0 ? `${project.unitTypesList.length} Unit Types` : "Luxury Project"}
                </span>
              </div>
            </div>
            <button onClick={handleShareClick} className={styles.shareButton}>
              <span className={styles.shareIcon}>🔗</span>
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Project Summary */}
        <section>
          <h2 className={styles.sectionTitle}>📋 Project Overview</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>🏢</div>
              <div className={styles.summaryContent}>
                <h3>Project Name</h3>
                <p>{project.name || "Not specified"}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📍</div>
              <div className={styles.summaryContent}>
                <h3>Location</h3>
                <p>{project.locationArea || "Not specified"}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>💰</div>
              <div className={styles.summaryContent}>
                <h3>Starting Price</h3>
                <p>{project.priceRange.formattedMin}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📅</div>
              <div className={styles.summaryContent}>
                <h3>Delivery</h3>
                <p>{project.deliveryTimeline || "Not specified"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Unit Types by Category */}
        {Object.keys(groupedUnitTypes).length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>🏠 Available Unit Types</h2>
            {Object.entries(groupedUnitTypes).map(([category, units]) => (
              <div key={category} className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>{category}</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Unit Type</th>
                        <th>Size</th>
                        <th>Bedrooms</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit, index) => (
                        <tr key={index}>
                          <td className={styles.tableValue}>
                            <div className={styles.unitTypeCell}>
                              <span className={styles.unitIcon}>🏡</span>
                              {unit.type}
                            </div>
                          </td>
                          <td className={styles.tableValue}>
                            <span className={styles.sizeValue}>{unit.size}</span>
                          </td>
                          <td className={styles.tableValue}>
                            <span className={styles.bedroomValue}>{unit.bedrooms}</span>
                          </td>
                          <td className={styles.tableValue}>
                            <span className={styles.priceValue}>{unit.price}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Facilities */}
        {project.facilitiesList.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>🏊 Facilities & Amenities</h2>
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Facility Name</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {project.facilitiesList.map((facility, index) => (
                    <tr key={index}>
                      <td className={styles.tableNumber}>{index + 1}</td>
                      <td className={styles.tableValue}>
                        <div className={styles.facilityCell}>
                          <span className={styles.facilityIcon}>✨</span>
                          {facility.name}
                        </div>
                      </td>
                      <td className={styles.tableValue}>
                        <span className={styles.facilitySize}>Available</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Special Features */}
        {project.specialFeaturesList.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>⭐ Special Features</h2>
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Feature</th>
                  </tr>
                </thead>
                <tbody>
                  {project.specialFeaturesList.map((feature, index) => (
                    <tr key={index}>
                      <td className={styles.tableNumber}>{index + 1}</td>
                      <td className={styles.tableValue}>
                        <div className={styles.featureCell}>
                          <span className={styles.featureIcon}>🌟</span>
                          {feature}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Project Information */}
        <section>
          <h2 className={styles.sectionTitle}>📊 Complete Project Information</h2>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🆔</span>
                    Project ID
                  </td>
                  <td className={styles.tableValue}>{project.projectId || "Not specified"}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🏢</span>
                    Project Name
                  </td>
                  <td className={styles.tableValue}>{project.name || "Not specified"}</td>
                </tr>
                {project.projectSection && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>🏗️</span>
                      Project Section
                    </td>
                    <td className={styles.tableValue}>{project.projectSection}</td>
                  </tr>
                )}
                {project.locationArea && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>🌍</span>
                      Location Area
                    </td>
                    <td className={styles.tableValue}>{project.locationArea}</td>
                  </tr>
                )}
                {project.locationDetails && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>📍</span>
                      Location Details
                    </td>
                    <td className={styles.tableValue}>{project.locationDetails}</td>
                  </tr>
                )}
                {project.paymentPlan && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>💳</span>
                      Payment Plan
                    </td>
                    <td className={styles.tableValue}>{project.paymentPlan}</td>
                  </tr>
                )}
                {project.deliveryTimeline && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>📅</span>
                      Delivery Timeline
                    </td>
                    <td className={styles.tableValue}>{project.deliveryTimeline}</td>
                  </tr>
                )}
                {project.imagePath && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>🖼️</span>
                      Project Image
                    </td>
                    <td className={styles.tableValue}>
                      <a
                        href={project.imagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkValue}
                      >
                        📷 View Project Image
                      </a>
                    </td>
                  </tr>
                )}
                {project.pdf && (
                  <tr>
                    <td className={styles.tableLabel}>
                      <span className={styles.labelIcon}>📄</span>
                      Project Brochure
                    </td>
                    <td className={styles.tableValue}>
                      <button onClick={() => openPdf(project.pdf)} className={styles.linkButton}>
                        📋 View Project Brochure
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* PDF Modal */}
      {activePdf && (
        <div className={styles.pdfModal} onClick={closePdf}>
          <div className={styles.pdfContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pdfHeader}>
              <h3>📄 Project Document</h3>
              <button className={styles.pdfCloseButton} onClick={closePdf}>
                ×
              </button>
            </div>
            {pdfError ? (
              <div className={styles.pdfError}>
                <div className={styles.pdfErrorIcon}>📄</div>
                <h3>Unable to load document</h3>
                <p>The document could not be loaded in the viewer.</p>
                <div className={styles.pdfErrorActions}>
                  <button className={styles.primaryButton} onClick={() => window.open(activePdf, "_blank")}>
                    🔗 Open in New Tab
                  </button>
                  <button className={styles.secondaryButton} onClick={closePdf}>
                    ❌ Close
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
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetails
