import { seedContractors } from "../data/seed";
import { getSupabaseAnonKey, getSupabaseClient, getSupabaseUrl, isSupabaseConfigured } from "./supabase";
import type {
  ContractorRecord,
  LeadStatus,
  LeadRecord,
  MeasurementSystem,
  MeasurementResult,
  OnboardingContext,
  OnboardingProgressRecord,
  Product,
  SubscriptionRecord,
} from "../types";

type ContractorRow = {
  id: string;
  slug: string;
  measurement_system: MeasurementSystem;
  business_name: string;
  phone: string;
  email: string;
  website: string;
  facebook_url: string;
  primary_color: string;
  accent_color: string;
  hero_label: string;
  intro_text: string;
  opening_line: string;
  closing_line: string;
  include_pricing_disclaimer: boolean;
  is_published: boolean;
};

type ProductRow = {
  id: string;
  contractor_id: string;
  name: string;
  description: string;
  unit: Product["unit"];
  base_price: number;
  is_featured: boolean;
  display_order: number;
};

type LeadRow = {
  id: string;
  contractor_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  message: string;
  measurement_mode: "distance" | "area" | null;
  measurement_value: number | null;
  measurement_unit: string | null;
  measurement_points: { lat: number; lng: number }[] | null;
  estimated_total: number | null;
  selected_products_summary: string[] | null;
  source: "copy" | "submit";
  status: LeadStatus;
  internal_notes: string;
  last_contacted_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionRow = {
  id: string;
  contractor_id: string;
  customer_email: string;
  customer_name: string;
  plan_code: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  current_period_end: string | null;
  created_at: string;
};

type OnboardingRow = {
  contractor_id: string;
  current_step: string;
  is_live: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const contractorColumns = `
  id,
  slug,
  measurement_system,
  business_name,
  phone,
  email,
  website,
  facebook_url,
  primary_color,
  accent_color,
  hero_label,
  intro_text,
  opening_line,
  closing_line,
  include_pricing_disclaimer,
  is_published
`;

const productColumns = `
  id,
  contractor_id,
  name,
  description,
  unit,
  base_price,
  is_featured,
  display_order
`;

const leadColumns = `
  id,
  contractor_id,
  customer_name,
  customer_email,
  customer_phone,
  message,
  measurement_mode,
  measurement_value,
  measurement_unit,
  measurement_points,
  estimated_total,
  selected_products_summary,
  source,
  status,
  internal_notes,
  last_contacted_at,
  archived_at,
  deleted_at,
  created_at,
  updated_at
`;

const onboardingColumns = `
  contractor_id,
  current_step,
  is_live,
  completed_at,
  created_at,
  updated_at
`;

const mapContractor = (row: ContractorRow, products: ProductRow[]): ContractorRecord => {
  return {
    id: row.id,
    slug: row.slug,
    measurementSystem: row.measurement_system ?? "metric",
    branding: {
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      heroLabel: row.hero_label,
      introText: row.intro_text,
    },
    contact: {
      businessName: row.business_name,
      phone: row.phone,
      email: row.email,
      website: row.website,
      facebookUrl: row.facebook_url,
    },
    resultTemplate: {
      openingLine: row.opening_line,
      closingLine: row.closing_line,
      includePricingDisclaimer: row.include_pricing_disclaimer,
    },
    products: products
      .sort((left, right) => left.display_order - right.display_order)
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        unit: product.unit,
        basePrice: Number(product.base_price),
        isFeatured: product.is_featured,
      })),
  };
};

const groupProducts = (products: ProductRow[]) => {
  const map = new Map<string, ProductRow[]>();
  products.forEach((product) => {
    const current = map.get(product.contractor_id) ?? [];
    current.push(product);
    map.set(product.contractor_id, current);
  });
  return map;
};

const mapLead = (row: LeadRow): LeadRecord => ({
  id: row.id,
  contractorId: row.contractor_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  message: row.message,
  measurementMode: row.measurement_mode,
  measurementValue: row.measurement_value,
  measurementUnit: row.measurement_unit,
  measurementPoints: row.measurement_points ?? [],
  estimatedTotal: row.estimated_total,
  selectedProductsSummary: row.selected_products_summary ?? [],
  source: row.source,
  status: row.status ?? "new",
  internalNotes: row.internal_notes ?? "",
  lastContactedAt: row.last_contacted_at ?? null,
  archivedAt: row.archived_at ?? null,
  deletedAt: row.deleted_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? row.created_at,
});

const mapSubscription = (row: SubscriptionRow): SubscriptionRecord => ({
  id: row.id,
  contractorId: row.contractor_id,
  customerEmail: row.customer_email,
  customerName: row.customer_name,
  planCode: row.plan_code,
  status: row.status,
  stripeCustomerId: row.stripe_customer_id,
  stripeSubscriptionId: row.stripe_subscription_id,
  stripeCheckoutSessionId: row.stripe_checkout_session_id,
  currentPeriodEnd: row.current_period_end,
  createdAt: row.created_at,
});

const mapOnboarding = (row: OnboardingRow): OnboardingProgressRecord => ({
  contractorId: row.contractor_id,
  currentStep: row.current_step,
  isLive: row.is_live,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchProductsForContractors = async (contractorIds: string[]) => {
  const supabase = getSupabaseClient();
  if (!supabase || contractorIds.length === 0) {
    return [] satisfies ProductRow[];
  }

  const { data, error } = await supabase
    .from("products")
    .select(productColumns)
    .in("contractor_id", contractorIds)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProductRow[];
};

export const fetchPublicContractors = async (): Promise<ContractorRecord[]> => {
  if (!isSupabaseConfigured) {
    return seedContractors;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return seedContractors;
  }

  const { data, error } = await supabase
    .from("contractors")
    .select(contractorColumns)
    .eq("is_published", true)
    .order("business_name", { ascending: true });

  if (error) {
    throw error;
  }

  const contractorRows = (data ?? []) as ContractorRow[];
  const products = await fetchProductsForContractors(contractorRows.map((row) => row.id));
  const productsByContractor = groupProducts(products);

  return contractorRows.map((row) => mapContractor(row, productsByContractor.get(row.id) ?? []));
};

export const fetchAdminContractor = async (slug: string, authUserId: string): Promise<ContractorRecord | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: contractorRow, error: contractorError } = await supabase
    .from("contractors")
    .select(contractorColumns)
    .eq("slug", slug)
    .single();

  if (contractorError) {
    if (contractorError.code === "PGRST116") {
      return null;
    }
    throw contractorError;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("contractor_users")
    .select("contractor_id, role")
    .eq("auth_user_id", authUserId)
    .eq("contractor_id", contractorRow.id)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return null;
  }

  const products = await fetchProductsForContractors([contractorRow.id]);
  return mapContractor(contractorRow as ContractorRow, products);
};

export const updateContractorSettings = async (contractor: ContractorRecord) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    business_name: contractor.contact.businessName,
    phone: contractor.contact.phone,
    email: contractor.contact.email,
    website: contractor.contact.website,
    facebook_url: contractor.contact.facebookUrl,
    measurement_system: contractor.measurementSystem,
    primary_color: contractor.branding.primaryColor,
    accent_color: contractor.branding.accentColor,
    hero_label: contractor.branding.heroLabel,
    intro_text: contractor.branding.introText,
    opening_line: contractor.resultTemplate.openingLine,
    closing_line: contractor.resultTemplate.closingLine,
    include_pricing_disclaimer: contractor.resultTemplate.includePricingDisclaimer,
  };

  const { error } = await supabase.from("contractors").update(payload).eq("id", contractor.id);

  if (error) {
    throw error;
  }
};

export const setContractorPublished = async (contractorId: string, isPublished: boolean) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("contractors").update({ is_published: isPublished }).eq("id", contractorId);

  if (error) {
    throw error;
  }
};

export const replaceProducts = async (contractorId: string, products: Product[]) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("contractor_id", contractorId);

  if (existingError) {
    throw existingError;
  }

  const nextIds = products.map((product) => product.id);
  const existingIds = (existingRows ?? []).map((row) => row.id as string);
  const idsToDelete = existingIds.filter((id) => !nextIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("products").delete().in("id", idsToDelete);
    if (deleteError) {
      throw deleteError;
    }
  }

  if (products.length === 0) {
    return;
  }

  const upsertPayload = products.map((product, index) => ({
    id: product.id,
    contractor_id: contractorId,
    name: product.name,
    description: product.description,
    unit: product.unit,
    base_price: product.basePrice,
    is_featured: Boolean(product.isFeatured),
    display_order: index,
  }));

  const { error: upsertError } = await supabase.from("products").upsert(upsertPayload, { onConflict: "id" });

  if (upsertError) {
    throw upsertError;
  }
};

export const submitLeadEvent = async ({
  contractorId,
  customerName,
  customerEmail,
  customerPhone,
  message,
  measurement,
  estimatedTotal,
  selectedProductsSummary,
  turnstileToken,
}: {
  contractorId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  measurement: MeasurementResult | null;
  estimatedTotal: number | null;
  selectedProductsSummary: string[];
  turnstileToken: string;
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const functionsUrl = `${getSupabaseUrl()}/functions/v1/submit-lead`;
  const anonKey = getSupabaseAnonKey();

  const payload = {
    contractor_id: contractorId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    message,
    measurement_mode: measurement?.mode ?? null,
    measurement_value: measurement?.value ?? null,
    measurement_unit: measurement?.unitLabel ?? null,
    measurement_points: measurement?.points ?? [],
    estimated_total: estimatedTotal,
    selected_products_summary: selectedProductsSummary,
    source: "submit",
    turnstile_token: turnstileToken,
  };

  const response = await fetch(functionsUrl, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response
    .json()
    .catch(async () => ({ error: (await response.text()) || "Unable to read lead submission response." }));

  if (!response.ok) {
    const detailedMessage =
      typeof responseBody?.error === "string" && responseBody.error.length > 0
        ? responseBody.error
        : `Lead submission failed with status ${response.status}.`;
    throw new Error(detailedMessage);
  }

  return mapLead(responseBody as LeadRow);
};

export const fetchLeadEvents = async (contractorId: string): Promise<LeadRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("lead_events")
    .select(leadColumns)
    .eq("contractor_id", contractorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return ((data ?? []) as LeadRow[]).map(mapLead);
};

export const updateLeadEvent = async (
  leadId: string,
  updates: Partial<{
    status: LeadStatus;
    internalNotes: string;
    archivedAt: string | null;
    deletedAt: string | null;
    lastContactedAt: string | null;
  }>,
): Promise<LeadRecord> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload: Record<string, string | null> = {};

  if (updates.status !== undefined) {
    payload.status = updates.status;
    if (updates.status === "contacted" && updates.lastContactedAt === undefined) {
      payload.last_contacted_at = new Date().toISOString();
    }
  }

  if (updates.internalNotes !== undefined) {
    payload.internal_notes = updates.internalNotes;
  }

  if (updates.archivedAt !== undefined) {
    payload.archived_at = updates.archivedAt;
  }

  if (updates.deletedAt !== undefined) {
    payload.deleted_at = updates.deletedAt;
  }

  if (updates.lastContactedAt !== undefined) {
    payload.last_contacted_at = updates.lastContactedAt;
  }

  const { data, error } = await supabase.from("lead_events").update(payload).eq("id", leadId).select(leadColumns).single();

  if (error) {
    throw error;
  }

  return mapLead(data as LeadRow);
};

export const claimOnboardingContext = async (): Promise<OnboardingContext | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const functionsUrl = `${getSupabaseUrl()}/functions/v1/claim-onboarding`;
  const anonKey = getSupabaseAnonKey();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      lastError = sessionError;
    } else if (!sessionData.session) {
      lastError = new Error("Your login session is still being finalised. Please try again.");
    } else {
      const response = await fetch(functionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const responseBody = await response
        .json()
        .catch(async () => ({ error: (await response.text()) || "Unable to read edge function response." }));

      if (response.ok) {
        if (!responseBody) {
          return null;
        }

        return {
          contractor: {
            id: responseBody.contractor.id,
            slug: responseBody.contractor.slug,
            measurementSystem: responseBody.contractor.measurement_system ?? "metric",
            branding: {
              primaryColor: responseBody.contractor.primary_color,
              accentColor: responseBody.contractor.accent_color,
              heroLabel: responseBody.contractor.hero_label,
              introText: responseBody.contractor.intro_text,
            },
            contact: {
              businessName: responseBody.contractor.business_name,
              phone: responseBody.contractor.phone,
              email: responseBody.contractor.email,
              website: responseBody.contractor.website,
              facebookUrl: responseBody.contractor.facebook_url,
            },
            resultTemplate: {
              openingLine: responseBody.contractor.opening_line,
              closingLine: responseBody.contractor.closing_line,
              includePricingDisclaimer: responseBody.contractor.include_pricing_disclaimer,
            },
            products: (responseBody.products ?? []).map((product: ProductRow) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              unit: product.unit,
              basePrice: Number(product.base_price),
              isFeatured: product.is_featured,
            })),
          },
          onboarding: mapOnboarding(responseBody.onboarding as OnboardingRow),
          subscription: responseBody.subscription ? mapSubscription(responseBody.subscription as SubscriptionRow) : null,
        };
      }

      const detailedMessage =
        typeof responseBody?.error === "string" && responseBody.error.length > 0
          ? responseBody.error
          : `Onboarding request failed with status ${response.status}.`;

      lastError = new Error(detailedMessage);
    }

    if (attempt < 2) {
      await wait(700);
    }
  }

  throw lastError ?? new Error("Unable to claim onboarding.");
};

export const updateOnboardingProgress = async ({
  contractorId,
  currentStep,
  isLive,
  complete,
}: {
  contractorId: string;
  currentStep: string;
  isLive: boolean;
  complete?: boolean;
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    current_step: currentStep,
    is_live: isLive,
    completed_at: complete ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("onboarding_progress")
    .update(payload)
    .eq("contractor_id", contractorId)
    .select(onboardingColumns)
    .single();

  if (error) {
    throw error;
  }

  return mapOnboarding(data as OnboardingRow);
};
