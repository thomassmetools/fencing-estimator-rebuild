export type MeasurementMode = "distance" | "area";

export interface Product {
  id: string;
  name: string;
  description: string;
  unit: "lineal metre" | "metre squared" | "each";
  basePrice: number;
  isFeatured?: boolean;
}

export interface ContractorBranding {
  primaryColor: string;
  accentColor: string;
  heroLabel: string;
  introText: string;
}

export interface ContractorContact {
  businessName: string;
  phone: string;
  email: string;
  website: string;
  facebookUrl: string;
}

export interface ResultTemplate {
  openingLine: string;
  closingLine: string;
  includePricingDisclaimer: boolean;
}

export interface ContractorRecord {
  id: string;
  slug: string;
  branding: ContractorBranding;
  contact: ContractorContact;
  resultTemplate: ResultTemplate;
  products: Product[];
}

export interface MeasurementResult {
  mode: MeasurementMode;
  value: number;
  unitLabel: string;
  pointCount: number;
}

export interface SelectedProduct {
  productId: string;
  quantity: number;
}

export interface LeadRecord {
  id: string;
  contractorId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  measurementMode: MeasurementMode | null;
  measurementValue: number | null;
  measurementUnit: string | null;
  estimatedTotal: number | null;
  selectedProductsSummary: string[];
  source: "copy" | "submit";
  createdAt: string;
}
