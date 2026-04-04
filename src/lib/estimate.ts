import type { MeasurementResult, Product } from "../types";

export const currency = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

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
}: {
  businessName: string;
  openingLine: string;
  closingLine: string;
  measurement: MeasurementResult | null;
  selectedProducts: Array<{ product: Product; quantity: number }>;
  customerName: string;
}) => {
  const lines: string[] = [];

  lines.push(openingLine || `Hi ${businessName}, I would like a fencing quote.`);
  lines.push("");

  if (customerName.trim()) {
    lines.push(`Customer: ${customerName.trim()}`);
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
  lines.push(closingLine || "Please contact me with next steps.");

  return lines.join("\n");
};
