import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MapMeasurePanel } from "../components/MapMeasurePanel";
import { ProductSelector } from "../components/ProductSelector";
import { ResultComposer } from "../components/ResultComposer";
import { createCurrencyFormatter } from "../lib/estimate";
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
  const [customerAddress, setCustomerAddress] = useState("");
  const [measuredProductId, setMeasuredProductId] = useState<string | null>(null);

  const formatAmount = useMemo(
    () => createCurrencyFormatter(contractor?.currency ?? "NZD"),
    [contractor?.currency],
  );

  const measuredLengthByUnit = useMemo(() => {
    if (!measurement || measurement.mode !== "distance") {
      return null;
    }

    return {
      "lineal metre": Math.ceil(measurement.baseValue),
      "lineal foot": Math.ceil(measurement.unitLabel === "ft" ? measurement.value : measurement.baseValue * 3.28084),
    };
  }, [measurement]);

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

  const autofillMeasuredProduct = (nextMeasurement: MeasurementResult | null, nextMeasuredProductId: string | null) => {
    if (!contractor || nextMeasurement?.mode !== "distance" || !nextMeasuredProductId) {
      return;
    }

    const nextMeasuredLengthByUnit = {
      "lineal metre": Math.ceil(nextMeasurement.baseValue),
      "lineal foot": Math.ceil(nextMeasurement.unitLabel === "ft" ? nextMeasurement.value : nextMeasurement.baseValue * 3.28084),
    };
    const measuredProduct = contractor.products.find((product) => product.id === nextMeasuredProductId);
    if (!measuredProduct || (measuredProduct.unit !== "lineal metre" && measuredProduct.unit !== "lineal foot")) {
      return;
    }

    const measuredLength = nextMeasuredLengthByUnit[measuredProduct.unit];
    if (measuredLength <= 0) {
      return;
    }

    setSelectedProducts((current) => {
      const existing = current.find((selection) => selection.productId === measuredProduct.id);
      if (existing) {
        return current.map((selection) =>
          selection.productId === measuredProduct.id ? { ...selection, quantity: measuredLength } : selection,
        );
      }

      return [...current, { productId: measuredProduct.id, quantity: measuredLength }];
    });
  };

  const handleMeasurementChange = (nextMeasurement: MeasurementResult | null) => {
    setMeasurement(nextMeasurement);
    autofillMeasuredProduct(nextMeasurement, measuredProductId);
  };

  const handleMeasuredProductChange = (productId: string | null) => {
    setMeasuredProductId(productId);
    const linealProductIds = new Set(
      contractor?.products
        .filter((product) => product.unit === "lineal metre" || product.unit === "lineal foot")
        .map((product) => product.id) ?? [],
    );

    setSelectedProducts((current) =>
      current.filter((selection) => !linealProductIds.has(selection.productId) || selection.productId === productId),
    );

    if (productId) {
      autofillMeasuredProduct(measurement, productId);
    }
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
        <MapMeasurePanel
          onMeasurementChange={handleMeasurementChange}
          onAddressChange={setCustomerAddress}
          measurementSystem={contractor.measurementSystem}
        />
        <aside className="sidebar-stack">
          <ProductSelector
            products={contractor.products}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            measuredLengthLabel={measurement?.mode === "distance" ? `${Math.ceil(measurement.value)} ${measurement.unitLabel}` : null}
            measuredProductId={measuredProductId}
            onMeasuredProductChange={handleMeasuredProductChange}
            canApplyMeasurement={Boolean(measuredLengthByUnit)}
            formatAmount={formatAmount}
          />
          <ResultComposer
            contractor={contractor}
            measurement={measurement}
            selectedProducts={selectedProductDetails}
            customerName={customerName}
            customerAddress={customerAddress}
            onCustomerNameChange={setCustomerName}
            onCustomerAddressChange={setCustomerAddress}
            formatAmount={formatAmount}
          />
        </aside>
      </section>
    </main>
  );
};
