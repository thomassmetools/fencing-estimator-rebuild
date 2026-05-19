import type { ContractorCurrency, MeasurementResult, Product } from "../types";

export const SUPPORTED_CURRENCIES: { code: ContractorCurrency; label: string }[] = [
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "GBP", label: "GBP — British Pound" },
];

const CURRENCY_LOCALES: Record<ContractorCurrency, string> = {
  NZD: "en-NZ",
  USD: "en-US",
  AUD: "en-AU",
  CAD: "en-CA",
  GBP: "en-GB",
};

export const createCurrencyFormatter = (currencyCode: ContractorCurrency) => {
  const fmt = new Intl.NumberFormat(CURRENCY_LOCALES[currencyCode] ?? "en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });
  return (n: number) => fmt.format(n);
};

export const estimateProductSubtotal = (product: Product, quantity: number) => {
  return product.basePrice * quantity;
};

export const buildResultMessage = ({
  businessName,
  openingLine,
  closingLine,
  measurement,
  selectedProducts,
  customerName,
  customerAddress,
  siteAccess,
  oldFenceRemoval,
  projectTiming,
  siteNotes,
}: {
  businessName: string;
  openingLine: string;
  closingLine: string;
  measurement: MeasurementResult | null;
  selectedProducts: Array<{ product: Product; quantity: number }>;
  customerName: string;
  customerAddress: string;
  siteAccess: string;
  oldFenceRemoval: string;
  projectTiming: string;
  siteNotes: string;
}) => {
  const lines: string[] = [];

  lines.push(openingLine || `Hi ${businessName}, I would like a fencing quote.`);
  lines.push("");

  if (customerName.trim()) {
    lines.push(`Customer: ${customerName.trim()}`);
  }

  if (customerAddress.trim()) {
    lines.push(`Site address: ${customerAddress.trim()}`);
  }

  if (measurement) {
    lines.push(`Measured ${measurement.mode}: ${measurement.value.toFixed(1)} ${measurement.unitLabel}`);
    lines.push(`Map points used: ${measurement.pointCount}`);
  }

  if (selectedProducts.length > 0) {
    lines.push("");
    lines.push("Preferred products:");
    selectedProducts.forEach(({ product, quantity }) => {
      lines.push(`- ${product.name}: ${quantity} ${product.unit}`);
    });
  }

  lines.push("");
  lines.push("Site details:");
  lines.push(`- Access: ${siteAccess || "Not provided"}`);
  lines.push(`- Remove old fence: ${oldFenceRemoval || "Not provided"}`);
  lines.push(`- Preferred timing: ${projectTiming || "Not provided"}`);
  if (siteNotes.trim()) {
    lines.push(`- Extra notes: ${siteNotes.trim()}`);
  }

  lines.push("");
  lines.push(closingLine || "Please contact me with next steps.");

  return lines.join("\n");
};
