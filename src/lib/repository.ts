import { seedContractors } from "../data/seed";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import type { ContractorRecord, LeadRecord, MeasurementResult, Product } from "../types";

type ContractorRow = {
  id: string;
  slug: string;
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
  estimated_total: number | null;
  selected_products_summary: string[] | null;
  source: "copy" | "submit";
  created_at: string;
};

const contractorColumns = `
  id,
  slug,
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
  estimated_total,
  selected_products_summary,
  source,
  created_at
`;

const mapContractor = (row: ContractorRow, products: ProductRow[]): ContractorRecord => {
  return {
    id: row.id,
    slug: row.slug,
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
  estimatedTotal: row.estimated_total,
  selectedProductsSummary: row.selected_products_summary ?? [],
  source: row.source,
  createdAt: row.created_at,
});

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

export const createLeadEvent = async ({
  contractorId,
  customerName,
  customerEmail,
  customerPhone,
  message,
  measurement,
  estimatedTotal,
  selectedProductsSummary,
  source,
}: {
  contractorId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  measurement: MeasurementResult | null;
  estimatedTotal: number | null;
  selectedProductsSummary: string[];
  source: "copy" | "submit";
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const payload = {
    contractor_id: contractorId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    message,
    measurement_mode: measurement?.mode ?? null,
    measurement_value: measurement?.value ?? null,
    measurement_unit: measurement?.unitLabel ?? null,
    estimated_total: estimatedTotal,
    selected_products_summary: selectedProductsSummary,
    source,
  };

  const { data, error } = await supabase.from("lead_events").insert(payload).select(leadColumns).single();

  if (error) {
    throw error;
  }

  return mapLead(data as LeadRow);
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
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as LeadRow[]).map(mapLead);
};
