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
        <MapMeasurePanel onMeasurementChange={setMeasurement} />
        <aside className="sidebar-stack">
          <ProductSelector
            products={contractor.products}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
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
