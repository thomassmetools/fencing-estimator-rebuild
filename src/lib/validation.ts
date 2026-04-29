import type { ContractorRecord, Product } from "../types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const validateOptionalUrl = (label: string, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!isValidUrl(trimmed)) {
    return `${label} must be a valid http or https URL.`;
  }

  return null;
};

export const validateContractor = (contractor: ContractorRecord) => {
  if (!contractor.contact.businessName.trim()) {
    return "Business name is required.";
  }

  if (!contractor.branding.heroLabel.trim()) {
    return "Hero label is required.";
  }

  if (!contractor.branding.introText.trim()) {
    return "Intro text is required.";
  }

  if (contractor.contact.email.trim() && !emailPattern.test(contractor.contact.email.trim())) {
    return "Contractor email must be a valid email address.";
  }

  const websiteError = validateOptionalUrl("Website", contractor.contact.website);
  if (websiteError) {
    return websiteError;
  }

  const facebookError = validateOptionalUrl("Facebook URL", contractor.contact.facebookUrl);
  if (facebookError) {
    return facebookError;
  }

  if (!hexColorPattern.test(contractor.branding.primaryColor.trim())) {
    return "Primary color must be a 6-digit hex value like #1d4f41.";
  }

  if (!hexColorPattern.test(contractor.branding.accentColor.trim())) {
    return "Accent color must be a 6-digit hex value like #d8a64f.";
  }

  return null;
};

export const validateProducts = (products: Product[]) => {
  if (products.length === 0) {
    return "Add at least one product before saving.";
  }

  for (const product of products) {
    if (!product.name.trim()) {
      return "Every product needs a name.";
    }

    if (!product.description.trim()) {
      return `Add a description for ${product.name.trim() || "each product"}.`;
    }

    if (!Number.isFinite(product.basePrice) || product.basePrice < 0) {
      return `Base price for ${product.name.trim() || "a product"} must be zero or more.`;
    }
  }

  return null;
};
