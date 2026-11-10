/**
 * AriaCloud Universal Site Builder Schema Definitions
 * Supports Multi-Sector Afghan Businesses: clinics, schools, logistics, export, retail, services
 */

export type IndustryType =
  | 'clinic'
  | 'school'
  | 'logistics'
  | 'export'
  | 'retail'
  | 'services';

export interface LocalizedString {
  fa: string; // Afghan Dari (RTL)
  ps: string; // Pashto (RTL)
  en: string; // English (LTR)
}

export interface UniversalSiteHeader {
  businessName: LocalizedString;
  tagline: LocalizedString;
  logoUrl?: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  address: LocalizedString;
  city: string;
}

export interface UniversalSiteHero {
  headline: LocalizedString;
  subheadline: LocalizedString;
  primaryCtaText: LocalizedString;
  primaryCtaIntent: string; // 'appointment' | 'quote' | 'enrollment' | 'order' | 'consultation'
  backgroundImageUrl?: string;
}

// 1. Healthcare & Clinic Sector Models
export interface DoctorProfile {
  id: string;
  name: LocalizedString;
  specialty: LocalizedString;
  qualifications: LocalizedString;
  consultationFeeAfn: number;
  availableDays: string[]; // e.g. ["Sat", "Sun", "Mon", "Tue", "Wed"]
  appointmentSlots: string[]; // e.g. ["09:00 - 12:00", "14:00 - 18:00"]
}

export interface DiagnosticTestItem {
  id: string;
  name: LocalizedString;
  category: LocalizedString;
  priceAfn: number;
  turnaroundHours: number;
}

// 2. Education & Schools Sector Models
export interface CourseCurriculum {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  durationMonths: number;
  feeAfn: number;
  instructorName: LocalizedString;
  schedule: LocalizedString;
}

// 3. Logistics & Freight Sector Models
export interface FreightRoute {
  id: string;
  origin: LocalizedString;
  destination: LocalizedString;
  transitTimeDays: number;
  ratePerKgAfn: number;
  cargoType: LocalizedString;
}

// 4. International Trade & Export Sector Models
export interface ExportCommodity {
  id: string;
  title: LocalizedString;
  originProvince: LocalizedString;
  gradeSpec: LocalizedString;
  packagingTypes: LocalizedString;
  minOrderQuantityKg: number;
}

// 5. Retail & Commerce Sector Models
export interface CatalogProduct {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  priceAfn: number;
  priceUsd: number;
  category: LocalizedString;
  inStock: boolean;
}

// 6. Consultancies & Professional Services
export interface ServiceOffering {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  deliverables: LocalizedString[];
  priceRangeAfn?: string;
}

export interface OperatingHours {
  regular: {
    days: LocalizedString;
    hours: string;
  };
  thursday?: {
    status: 'open' | 'half_day' | 'closed';
    hours?: string;
  };
  friday: {
    status: 'closed' | 'emergency_only' | 'open';
    note?: LocalizedString;
  };
}

export interface PwaManifestMetadata {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  startUrl: string;
  display: 'standalone' | 'minimal-ui' | 'browser';
}

export interface SiteCustomPage {
  id: string;
  slug: string;
  title: LocalizedString;
  content: LocalizedString;
  showInNav?: boolean;
}

export interface UniversalSiteSchema {
  subdomainSlug: string;
  industry: IndustryType;
  header: UniversalSiteHeader;
  hero: UniversalSiteHero;
  operatingHours: OperatingHours;
  theme: 'emerald' | 'lapis' | 'saffron' | 'slate' | 'teal' | 'crimson';
  layout: 'aurora' | 'minimal' | 'editorial';
  pages?: SiteCustomPage[];
  // Sector-specific modules
  clinic?: {
    doctors: DoctorProfile[];
    diagnosticTests: DiagnosticTestItem[];
    emergencyContact: string;
  };
  school?: {
    courses: CourseCurriculum[];
    accreditation: LocalizedString;
    enrollmentDeadline?: string;
  };
  logistics?: {
    routes: FreightRoute[];
    fleetInfo: LocalizedString;
    trackingHotline: string;
  };
  export?: {
    commodities: ExportCommodity[];
    certifications: string[];
    packagingStandards: LocalizedString;
  };
  retail?: {
    products: CatalogProduct[];
  };
  services?: {
    offerings: ServiceOffering[];
    clientLogos?: string[];
  };
  whatsappCta: {
    phoneNumber: string;
    prefilledMessage: LocalizedString;
  };
  pwa: PwaManifestMetadata;
  customDomain?: string;
  generatedAt: string;
  lastUpdatedAt: string;
  version: number;
}
