export type MeasurementMode = "distance";

export interface MapPoint {
  lat: number;
  lng: number;
}

export type MeasurementSystem = "metric" | "imperial";
export type ContractorCurrency = "NZD" | "USD" | "AUD" | "CAD" | "GBP";
export type ProductUnit = "lineal metre" | "metre squared" | "lineal foot" | "square foot" | "each";

export interface Product {
  id: string;
  name: string;
  description: string;
  unit: ProductUnit;
  basePrice: number;
  isFeatured?: boolean;
}

export interface ContractorBranding {
  primaryColor: string;
  accentColor: string;
  heroLabel: string;
  introText: string;
  logoUrl: string;
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
  measurementSystem: MeasurementSystem;
  currency: ContractorCurrency;
  branding: ContractorBranding;
  contact: ContractorContact;
  resultTemplate: ResultTemplate;
  products: Product[];
}

export interface AdminAccessRecord {
  contractorId: string;
  slug: string;
  businessName: string;
  heroLabel: string;
}

export interface MeasurementResult {
  mode: MeasurementMode;
  value: number;
  baseValue: number;
  unitLabel: string;
  pointCount: number;
  points: MapPoint[];
}

export interface SelectedProduct {
  productId: string;
  quantity: number;
}

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";
export type LeadSource = "copy" | "email" | "submit";
export type LeadNotificationStatus = "pending" | "sent" | "skipped" | "failed";

export interface LeadRecord {
  id: string;
  contractorId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  message: string;
  measurementMode: MeasurementMode | null;
  measurementValue: number | null;
  measurementUnit: string | null;
  measurementPoints: MapPoint[];
  estimatedTotal: number | null;
  selectedProductsSummary: string[];
  source: LeadSource;
  status: LeadStatus;
  internalNotes: string;
  notificationStatus: LeadNotificationStatus;
  notificationError: string | null;
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
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingEventRecord {
  id: string;
  contractorId: string;
  subscriptionId: string | null;
  stripeEventId: string;
  eventType: string;
  invoiceId: string | null;
  invoiceStatus: string | null;
  amountPaid: number | null;
  amountDue: number | null;
  currency: string | null;
  billingReason: string | null;
  periodEnd: string | null;
  summary: string;
  occurredAt: string;
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

export interface ContractorOpsStatus {
  contractorEmail: string;
  leadEmailConfigured: boolean;
  resendConfigured: boolean;
  turnstileConfigured: boolean;
}
