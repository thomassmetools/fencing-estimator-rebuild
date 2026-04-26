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

    const measuredLengthByUnit = {
      "lineal metre": Math.ceil(nextMeasurement.baseValue),
      "lineal foot": Math.ceil(nextMeasurement.unitLabel === "ft" ? nextMeasurement.value : nextMeasurement.baseValue * 3.28084),
    };
    const linealProducts = contractor.products.filter((product) => product.unit === "lineal metre" || product.unit === "lineal foot");
    const preferredUnit = contractor.measurementSystem === "imperial" ? "lineal foot" : "lineal metre";
    const preferredProduct =
      linealProducts.find((product) => product.unit === preferredUnit && product.isFeatured) ??
      linealProducts.find((product) => product.unit === preferredUnit) ??
      linealProducts.find((product) => product.isFeatured) ??
      linealProducts[0];
    const preferredLength = preferredProduct ? measuredLengthByUnit[preferredProduct.unit as "lineal metre" | "lineal foot"] : 0;

    if (!preferredProduct || preferredLength <= 0) {
      return;
    }

    setSelectedProducts((current) => {
      const hasLinealSelection = current.some((selection) =>
        linealProducts.some((product) => product.id === selection.productId),
      );

      if (!hasLinealSelection) {
        return [...current, { productId: preferredProduct.id, quantity: preferredLength }];
      }

      return current.map((selection) => {
        const product = linealProducts.find((item) => item.id === selection.productId);
        return product ? { ...selection, quantity: measuredLengthByUnit[product.unit as "lineal metre" | "lineal foot"] } : selection;
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
  const hasMeasurement = Boolean(measurement);
  const hasSelectedProducts = selectedProducts.length > 0;
  const activeStep = !hasMeasurement ? 1 : !hasSelectedProducts ? 2 : 3;

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

      <section className="estimator-steps" aria-label="Estimator steps">
        <div className={activeStep === 1 ? "is-active" : ""} aria-current={activeStep === 1 ? "step" : undefined}>
          <span>1</span>
          <strong>Measure</strong>
        </div>
        <div className={activeStep === 2 ? "is-active" : ""} aria-current={activeStep === 2 ? "step" : undefined}>
          <span>2</span>
          <strong>Choose</strong>
        </div>
        <div className={activeStep === 3 ? "is-active" : ""} aria-current={activeStep === 3 ? "step" : undefined}>
          <span>3</span>
          <strong>Send</strong>
        </div>
      </section>

      <section className="estimator-grid">
        <MapMeasurePanel onMeasurementChange={handleMeasurementChange} measurementSystem={contractor.measurementSystem} />
        <aside className="sidebar-stack">
          <ProductSelector
            products={contractor.products}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            measuredLengthLabel={measurement?.mode === "distance" ? `${Math.ceil(measurement.value)} ${measurement.unitLabel}` : null}
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
