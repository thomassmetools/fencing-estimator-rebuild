import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MapMeasurePanel } from "../components/MapMeasurePanel";
import { ProductSelector } from "../components/ProductSelector";
import { ResultComposer } from "../components/ResultComposer";
import type { ContractorRecord, MeasurementResult, Product, SelectedProduct } from "../types";

interface EstimatorPageProps {
  contractorMap: Map<string, ContractorRecord>;
}

export const EstimatorPage = ({ contractorMap }: EstimatorPageProps) => {
  const { slug = "" } = useParams();
  const contractor = contractorMap.get(slug);
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [customerName, setCustomerName] = useState("");

  const selectedProductDetails = useMemo(() => {
    if (!contractor) {
      return [];
    }

    return selectedProducts
      .map((selection) => {
        const product = contractor.products.find((item) => item.id === selection.productId);
        return product ? { product, quantity: selection.quantity } : null;
      })
      .filter((item): item is { product: Product; quantity: number } => Boolean(item));
  }, [contractor, selectedProducts]);

  const autofillLinealProducts = (nextMeasurement: MeasurementResult | null) => {
    if (!contractor || nextMeasurement?.mode !== "distance") {
      return;
    }

    const measuredLength = Math.ceil(nextMeasurement.value);
    const linealProducts = contractor.products.filter((product) => product.unit === "lineal metre");
    const preferredProduct = linealProducts.find((product) => product.isFeatured) ?? linealProducts[0];

    if (!preferredProduct || measuredLength <= 0) {
      return;
    }

    setSelectedProducts((current) => {
      const hasLinealSelection = current.some((selection) =>
        linealProducts.some((product) => product.id === selection.productId),
      );

      if (!hasLinealSelection) {
        return [...current, { productId: preferredProduct.id, quantity: measuredLength }];
      }

      return current.map((selection) => {
        const product = linealProducts.find((item) => item.id === selection.productId);
        return product ? { ...selection, quantity: measuredLength } : selection;
      });
    });
  };

  const handleMeasurementChange = (nextMeasurement: MeasurementResult | null) => {
    setMeasurement(nextMeasurement);
    autofillLinealProducts(nextMeasurement);
  };

  if (!contractor) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Contractor not found</h1>
          <p>Try one of the seeded contractor slugs from the home page.</p>
          <a href="/">Back to home</a>
        </div>
      </main>
    );
  }

  const primaryColor = contractor.branding.primaryColor || "#1d4f41";
  const accentColor = contractor.branding.accentColor || "#d8a64f";
  const hasFacebookUrl = contractor.contact.facebookUrl.trim().length > 0;

  return (
    <main
      className="page-shell estimator-shell"
      style={
        {
          ["--brand-primary" as string]: primaryColor,
          ["--brand-accent" as string]: accentColor,
        } as CSSProperties
      }
    >
      <section className="brand-banner">
        <div>
          <p className="eyebrow">{contractor.branding.heroLabel}</p>
          <h1>{contractor.contact.businessName}</h1>
          <p>{contractor.branding.introText}</p>
        </div>
        <div className="contact-panel">
          {contractor.contact.phone ? <span>{contractor.contact.phone}</span> : null}
          {contractor.contact.email ? <span>{contractor.contact.email}</span> : null}
          {hasFacebookUrl ? (
            <a href={contractor.contact.facebookUrl} target="_blank" rel="noreferrer">
              Facebook page
            </a>
          ) : null}
        </div>
      </section>

      <section className="estimator-grid">
        <MapMeasurePanel onMeasurementChange={handleMeasurementChange} />
        <aside className="sidebar-stack">
          <ProductSelector
            products={contractor.products}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            measuredLength={measurement?.mode === "distance" ? Math.ceil(measurement.value) : null}
          />
          <ResultComposer
            contractor={contractor}
            measurement={measurement}
            selectedProducts={selectedProductDetails}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
          />
        </aside>
      </section>
    </main>
  );
};
