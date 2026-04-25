export type MeasurementMode = "distance" | "area";

export interface MapPoint {
  lat: number;
  lng: number;
}

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
  points: MapPoint[];
}

export interface SelectedProduct {
  productId: string;
  quantity: number;
}

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

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
  measurementPoints: MapPoint[];
  estimatedTotal: number | null;
  selectedProductsSummary: string[];
  source: "copy" | "submit";
  status: LeadStatus;
  internalNotes: string;
  lastContactedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  contractorId: string;
  customerEmail: string;
  customerName: string;
  planCode: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export interface OnboardingProgressRecord {
  contractorId: string;
  currentStep: string;
  isLive: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingContext {
  contractor: ContractorRecord;
  onboarding: OnboardingProgressRecord;
  subscription: SubscriptionRecord | null;
}
