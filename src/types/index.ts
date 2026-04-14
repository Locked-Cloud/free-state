/**
 * Centralized type definitions for the Free State application.
 * All components should import types from here — never define them inline.
 */

export interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
  active: number; // 1 for active, 0 for inactive
}

export interface Project {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  location: string;
  image: string;
  features: string[];
}

export interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface LocationProject {
  id: string;
  id_loc: string;
  name: string;
  image: string;
  description?: string;
  companyId: string;
}

export interface ProjectDetail {
  id: string;
  projectId: string;
  idLoc: string;
  name: string;
  projectSection: string;
  locationArea: string;
  locationDetails: string;
  facilities: string;
  unitTypesAndSizes: string;
  bedroomsPerUnit: string;
  startingPriceEGP: string;
  specialFeatures: string;
  paymentPlan: string;
  deliveryTimeline: string;
  imagePath: string;
  pdf: string;
  // Parsed data for display
  facilitiesList: Array<{ name: string }>;
  unitTypesList: Array<{
    type: string;
    size: string;
    bedrooms: string;
    price: string;
    category?: string;
  }>;
  specialFeaturesList: string[];
  priceRange: {
    min: number;
    max: number;
    hasRange: boolean;
    formattedMin: string;
    formattedMax: string;
  };
}
