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
    size?: string
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
    return "https://placehold.co/1200x500/e2e8f0/64748b?text=Luxury+Real+Estate+Project"
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
    console.error("Image processing error:", error)
    return "https://placehold.co/1200x500/e2e8f0/64748b?text=Luxury+Real+Estate+Project"
  }
}

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ""
    } else if (char === "\n" && !insideQuotes) {
      currentRow.push(currentCell.trim())
      if (currentRow.some((cell) => cell)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ""
    } else {
      currentCell += char
    }
  }

  if (currentCell) {
    currentRow.push(currentCell.trim())
  }
  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows
}

// Parse facilities - now handles regular facilities, not unit sizes
const parseFacilities = (facilitiesStr: string): Array<{ name: string; size?: string }> => {
  if (!facilitiesStr || facilitiesStr.trim() === "" || facilitiesStr.toLowerCase() === "n/a") {
    return []
  }

  const cleaned = facilitiesStr.replace(/[""]/g, "").trim()
  const facilities: Array<{ name: string; size?: string }> = []

  cleaned
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      // Regular facility items like "Commercial area", "Hotels", "90% Water View (Sea and Lagoon)"
      facilities.push({
        name: item,
      })
    })

  return facilities
}

// Enhanced unit types parsing based on the actual CSV structure
const parseUnitTypes = (
  unitTypesStr: string,
  facilitiesStr: string,
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

  const seenTypes = new Map<string, number>() // Track normalized names to array indices

  // Helper function to normalize unit names for comparison
  const normalizeUnitName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "") // remove all spaces
      .replace(/grandvilla/g, "grandvilla") // normalize grand villa variations
      .replace(/standalone/g, "standalone") // normalize standalone variations
  }

  // Helper function to get the best display name (prefer more descriptive names)
  const getBestDisplayName = (name1: string, name2: string): string => {
    // Prefer names with spaces and proper capitalization
    if (name1.includes(" ") && !name2.includes(" ")) return name1
    if (name2.includes(" ") && !name1.includes(" ")) return name2
    // Prefer longer, more descriptive names
    if (name1.length > name2.length) return name1
    return name2
  }

  // Parse unit types and sizes: "StandAlone - 210m²; Crysta Villa - 255m²; Crysta GrandVilla - 365m²"
  const unitSizeData: { [key: string]: string } = {}
  if (unitTypesStr && unitTypesStr.trim() !== "" && unitTypesStr.toLowerCase() !== "n/a") {
    const unitEntries = unitTypesStr.split(";").map((entry) => entry.trim())
    unitEntries.forEach((entry) => {
      if (entry.includes(" - ") && entry.includes("m²")) {
        const parts = entry.split(" - ")
        if (parts.length === 2) {
          const unitName = parts[0].trim()
          const size = parts[1].trim()
          unitSizeData[unitName] = size
        }
      }
    })
  }

  // Parse bedroom data: "StandAlone: 3; Crysta Villa: 4; Crysta GrandVilla: 5"
  const bedroomData: { [key: string]: string } = {}
  if (bedroomsStr && bedroomsStr.trim() !== "" && bedroomsStr.toLowerCase() !== "n/a") {
    const bedroomEntries = bedroomsStr.split(";").map((entry) => entry.trim())
    bedroomEntries.forEach((entry) => {
      const match = entry.match(/(.+?):\s*(.+)/)
      if (match) {
        const unitName = match[1].trim()
        const bedrooms = match[2].trim()
        bedroomData[unitName] = bedrooms
      }
    })
  }

  // Parse price data: "StandAlone: 37,600,000 EGP; Crysta Villa: 47,000,000 EGP"
  const priceData: { [key: string]: string } = {}
  if (pricesStr && pricesStr.trim() !== "" && pricesStr.toLowerCase() !== "n/a") {
    const priceEntries = pricesStr.split(";").map((entry) => entry.trim())
    priceEntries.forEach((entry) => {
      const match = entry.match(/(.+?):\s*(.+)/)
      if (match) {
        const unitName = match[1].trim()
        const price = match[2].trim()
        priceData[unitName] = price
      }
    })
  }

  // Get all unique unit names from all data sources
  const allUnitNames = new Set([...Object.keys(unitSizeData), ...Object.keys(bedroomData), ...Object.keys(priceData)])

  console.log("All unit names found:", Array.from(allUnitNames))

  // Create unit types from the combined data with smart deduplication
  allUnitNames.forEach((unitName) => {
    const normalizedName = normalizeUnitName(unitName)

    // Check if we already have a similar unit type
    const existingIndex = seenTypes.get(normalizedName)

    if (existingIndex !== undefined) {
      // Update existing unit with better data
      const existingUnit = unitTypes[existingIndex]

      // Use the better display name
      existingUnit.type = getBestDisplayName(existingUnit.type, unitName)

      // Update with better data if available
      const bedrooms = bedroomData[unitName]
      const price = priceData[unitName]
      const size = unitSizeData[unitName]

      if (bedrooms && existingUnit.bedrooms === "Contact for details") {
        if (bedrooms.toLowerCase() === "n/a") {
          existingUnit.bedrooms = "Contact for details"
        } else {
          const bedCount = Number.parseInt(bedrooms)
          if (!isNaN(bedCount)) {
            existingUnit.bedrooms = bedCount === 1 ? "1 Bedroom" : `${bedCount} Bedrooms`
          } else {
            existingUnit.bedrooms = bedrooms
          }
        }
      }

      if (price && existingUnit.price === "Contact for pricing") {
        if (price.includes("EGP")) {
          const priceMatch = price.match(/([\d,]+)\s*EGP/)
          if (priceMatch) {
            const numericPrice = Number.parseInt(priceMatch[1].replace(/,/g, ""))
            if (!isNaN(numericPrice)) {
              existingUnit.price = `EGP ${numericPrice.toLocaleString()}`
            }
          }
        }
      }

      if (size && existingUnit.size === "Contact for details") {
        existingUnit.size = size
      }

      console.log(`Updated existing unit: ${existingUnit.type}`)
    } else {
      // Create new unit type
      const bedrooms = bedroomData[unitName] || "Contact for details"
      let formattedBedrooms = bedrooms
      if (bedrooms !== "N/A" && bedrooms !== "Contact for details" && bedrooms.toLowerCase() !== "n/a") {
        const bedCount = Number.parseInt(bedrooms)
        if (!isNaN(bedCount)) {
          formattedBedrooms = bedCount === 1 ? "1 Bedroom" : `${bedCount} Bedrooms`
        }
      } else if (bedrooms.toLowerCase() === "n/a") {
        formattedBedrooms = "Contact for details"
      }

      // Get price info and format it
      const rawPrice = priceData[unitName] || "Contact for pricing"
      let formattedPrice = rawPrice
      if (rawPrice.includes("EGP")) {
        const priceMatch = rawPrice.match(/([\d,]+)\s*EGP/)
        if (priceMatch) {
          const numericPrice = Number.parseInt(priceMatch[1].replace(/,/g, ""))
          if (!isNaN(numericPrice)) {
            formattedPrice = `EGP ${numericPrice.toLocaleString()}`
          }
        }
      }

      // Get size info
      const size = unitSizeData[unitName] || "Contact for details"

      // Categorize unit types
      let category = "Standard"
      const lowerUnitName = unitName.toLowerCase()
      if (lowerUnitName.includes("crysta")) {
        if (lowerUnitName.includes("grand")) {
          category = "Crysta Grand Collection"
        } else {
          category = "Crysta Collection"
        }
      } else if (lowerUnitName.includes("villa")) {
        category = "Villas"
      } else if (lowerUnitName.includes("house") || lowerUnitName.includes("town")) {
        if (lowerUnitName.includes("beach")) {
          category = "Beach Houses"
        } else {
          category = "Houses & Townhouses"
        }
      } else if (lowerUnitName.includes("cabana")) {
        category = "Beach Units"
      } else if (lowerUnitName.includes("beach")) {
        category = "Beach Houses"
      }

      const newUnit = {
        type: unitName,
        size: size,
        bedrooms: formattedBedrooms === "N/A" ? "Contact for details" : formattedBedrooms,
        price: formattedPrice,
        category,
      }

      unitTypes.push(newUnit)
      seenTypes.set(normalizedName, unitTypes.length - 1)

      console.log(`Created new unit: ${newUnit.type} (${category})`)
    }
  })

  console.log("Final unit types:", unitTypes)

  // Sort by category and then by price (lowest to highest)
  return unitTypes.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || "").localeCompare(b.category || "")
    }

    // Sort by price within category
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

// Parse special features from CSV format
const parseSpecialFeatures = (featuresStr: string): string[] => {
  if (!featuresStr || featuresStr.trim() === "" || featuresStr.toLowerCase() === "n/a") {
    return []
  }

  const cleaned = featuresStr.replace(/[""]/g, "").trim()
  return cleaned
    .split(";")
    .map((feature) => feature.trim())
    .filter((feature) => feature && feature.toLowerCase() !== "n/a")
}

// Parse price range from the new price format
const parsePriceRange = (pricesStr: string): any => {
  const defaultPrice = {
    min: 6900000,
    max: 90000000,
    hasRange: true,
    formattedMin: "EGP 6,900,000",
    formattedMax: "EGP 90,000,000",
  }

  if (!pricesStr || pricesStr.trim() === "" || pricesStr.toLowerCase() === "n/a") {
    return defaultPrice
  }

  const prices: number[] = []
  const priceEntries = pricesStr.split(";").map((entry) => entry.trim())

  priceEntries.forEach((entry) => {
    // Match pattern like "StandAlone: 37,600,000 EGP"
    const match = entry.match(/:\s*([\d,]+)\s*EGP/)
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

  return defaultPrice
}

// Enhanced column index finder that handles \r\n characters
const getColumnIndex = (headers: string[], columnName: string): number => {
  const normalizedColumnName = columnName.toLowerCase().trim()
  return headers.findIndex((header) => {
    const normalizedHeader = header.toLowerCase().trim().replace(/\r?\n/g, "").replace(/\r/g, "")
    return (
      normalizedHeader === normalizedColumnName ||
      normalizedHeader.includes(normalizedColumnName) ||
      normalizedColumnName.includes(normalizedHeader)
    )
  })
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

        console.log("Fetching data from Google Sheets for project ID:", projectId)

        const response = await fetch(PLACES_SHEET_URL)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const csvText = await response.text()
        console.log("Google Sheets CSV data received, length:", csvText.length)

        if (!csvText.trim()) {
          throw new Error("No data received from the sheet")
        }

        const rows = parseCSV(csvText)
        console.log("Parsed rows:", rows.length)

        if (rows.length < 2) {
          throw new Error("Invalid data format - no data rows found")
        }

        // Get headers and find column indices with enhanced matching
        const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/\r?\n/g, "").replace(/\r/g, ""))
        console.log("Headers found:", headers)

        const columnIndices = {
          id: getColumnIndex(headers, "id"),
          projectId: getColumnIndex(headers, "project_id"),
          name: getColumnIndex(headers, "name"),
          projectSection: getColumnIndex(headers, "project section"),
          locationArea: getColumnIndex(headers, "location - area"),
          locationDetails: getColumnIndex(headers, "location - details"),
          facilities: getColumnIndex(headers, "facilities"),
          unitTypesAndSizes: getColumnIndex(headers, "unit types and sizes"),
          bedroomsPerUnit: getColumnIndex(headers, "bedrooms (per unit)"),
          startingPriceEGP: getColumnIndex(headers, "starting price (egp)"),
          specialFeatures: getColumnIndex(headers, "special features"),
          paymentPlan: getColumnIndex(headers, "payment plan"),
          deliveryTimeline: getColumnIndex(headers, "delivery timeline"),
          imagePath: getColumnIndex(headers, "image_path"),
          pdf: getColumnIndex(headers, "pdf"),
        }

        console.log("Column indices:", columnIndices)

        let projectData: ProjectDetail | null = null

        // Search for the project
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]

          const rowCompanyId = columnIndices.id >= 0 ? row[columnIndices.id]?.replace(/[""]/g, "").trim() : ""
          const rowProjectId =
            columnIndices.projectId >= 0 ? row[columnIndices.projectId]?.replace(/[""]/g, "").trim() : ""

          if (rowCompanyId === companyId && rowProjectId === projectId) {
            console.log("Match found for row:", i)

            // Extract all raw data
            const rawData = {
              id: rowCompanyId,
              projectId: rowProjectId,
              name: columnIndices.name >= 0 ? row[columnIndices.name]?.replace(/[""]/g, "").trim() || "N/A" : "N/A",
              projectSection:
                columnIndices.projectSection >= 0
                  ? row[columnIndices.projectSection]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              locationArea:
                columnIndices.locationArea >= 0
                  ? row[columnIndices.locationArea]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              locationDetails:
                columnIndices.locationDetails >= 0
                  ? row[columnIndices.locationDetails]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              facilities:
                columnIndices.facilities >= 0
                  ? row[columnIndices.facilities]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              unitTypesAndSizes:
                columnIndices.unitTypesAndSizes >= 0
                  ? row[columnIndices.unitTypesAndSizes]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              bedroomsPerUnit:
                columnIndices.bedroomsPerUnit >= 0
                  ? row[columnIndices.bedroomsPerUnit]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              startingPriceEGP:
                columnIndices.startingPriceEGP >= 0
                  ? row[columnIndices.startingPriceEGP]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              specialFeatures:
                columnIndices.specialFeatures >= 0
                  ? row[columnIndices.specialFeatures]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              paymentPlan:
                columnIndices.paymentPlan >= 0
                  ? row[columnIndices.paymentPlan]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              deliveryTimeline:
                columnIndices.deliveryTimeline >= 0
                  ? row[columnIndices.deliveryTimeline]?.replace(/[""]/g, "").trim() || "N/A"
                  : "N/A",
              imagePath:
                columnIndices.imagePath >= 0 ? row[columnIndices.imagePath]?.replace(/[""]/g, "").trim() || "" : "",
              pdf: columnIndices.pdf >= 0 ? row[columnIndices.pdf]?.replace(/[""]/g, "").trim() || "" : "",
            }

            console.log("Raw data extracted:", rawData)

            // Parse the data for display
            const facilitiesList = parseFacilities(rawData.facilities)
            const unitTypesList = parseUnitTypes(
              rawData.unitTypesAndSizes,
              rawData.facilities,
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

        console.log("Final project data:", projectData)
        setProject(projectData)
      } catch (err) {
        console.error("Error fetching project data:", err)
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
              <h1 className={styles.heroTitle}>{project.name}</h1>
              {project.projectSection !== "N/A" && <p className={styles.heroSubtitle}>{project.projectSection}</p>}
              <div className={styles.heroLocation}>
                <span className={styles.locationIcon}>📍</span>
                {project.locationArea}
                {project.locationDetails !== "N/A" && ` • ${project.locationDetails}`}
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
                <p>{project.name}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📍</div>
              <div className={styles.summaryContent}>
                <h3>Location</h3>
                <p>{project.locationArea}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>💰</div>
              <div className={styles.summaryContent}>
                <h3>Starting Price</h3>
                <p>
                  {project.priceRange.formattedMin !== "Contact for pricing"
                    ? project.priceRange.formattedMin
                    : project.startingPriceEGP}
                </p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>📅</div>
              <div className={styles.summaryContent}>
                <h3>Delivery</h3>
                <p>{project.deliveryTimeline}</p>
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
                  <td className={styles.tableValue}>{project.projectId}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🏢</span>
                    Project Name
                  </td>
                  <td className={styles.tableValue}>{project.name}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🏗️</span>
                    Project Section
                  </td>
                  <td className={styles.tableValue}>{project.projectSection}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🌍</span>
                    Location Area
                  </td>
                  <td className={styles.tableValue}>{project.locationArea}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>📍</span>
                    Location Details
                  </td>
                  <td className={styles.tableValue}>{project.locationDetails}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🛏️</span>
                    Bedrooms (Per Unit)
                  </td>
                  <td className={styles.tableValue}>{project.bedroomsPerUnit}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>💰</span>
                    Starting Price (EGP)
                  </td>
                  <td className={styles.tableValue}>
                    <span className={styles.priceHighlight}>
                      {project.priceRange.formattedMin !== "Contact for pricing"
                        ? project.priceRange.formattedMin
                        : project.startingPriceEGP}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>💳</span>
                    Payment Plan
                  </td>
                  <td className={styles.tableValue}>{project.paymentPlan}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>📅</span>
                    Delivery Timeline
                  </td>
                  <td className={styles.tableValue}>{project.deliveryTimeline}</td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>🖼️</span>
                    Project Image
                  </td>
                  <td className={styles.tableValue}>
                    {project.imagePath ? (
                      <a
                        href={project.imagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkValue}
                      >
                        📷 View Project Image
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableLabel}>
                    <span className={styles.labelIcon}>📄</span>
                    Project Brochure
                  </td>
                  <td className={styles.tableValue}>
                    {project.pdf ? (
                      <button onClick={() => openPdf(project.pdf)} className={styles.linkButton}>
                        📋 View Project Brochure
                      </button>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
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
