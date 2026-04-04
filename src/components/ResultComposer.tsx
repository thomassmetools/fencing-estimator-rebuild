import { useMemo, useState } from "react";
import { buildResultMessage, currency, estimateProductSubtotal } from "../lib/estimate";
import { createLeadEvent } from "../lib/repository";
import type { ContractorRecord, MeasurementResult, Product } from "../types";

interface ResultComposerProps {
  contractor: ContractorRecord;
  measurement: MeasurementResult | null;
  selectedProducts: Array<{ product: Product; quantity: number }>;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
}

export const ResultComposer = ({
  contractor,
  measurement,
  selectedProducts,
  customerName,
  onCustomerNameChange,
}: ResultComposerProps) => {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy result");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const estimatedTotal = useMemo(() => {
    return selectedProducts.reduce((sum, entry) => sum + estimateProductSubtotal(entry.product, entry.quantity), 0);
  }, [selectedProducts]);

  const selectedProductsSummary = useMemo(() => {
    return selectedProducts.map(({ product, quantity }) => `${product.name}: ${quantity} ${product.unit}`);
  }, [selectedProducts]);

  const message = useMemo(() => {
    return buildResultMessage({
      businessName: contractor.contact.businessName,
      openingLine: contractor.resultTemplate.openingLine,
      closingLine: contractor.resultTemplate.closingLine,
      measurement,
      selectedProducts,
      customerName,
    });
  }, [contractor, customerName, measurement, selectedProducts]);

  const persistLead = async (source: "copy" | "submit") => {
    await createLeadEvent({
      contractorId: contractor.id,
      customerName,
      customerEmail,
      customerPhone,
      message,
      measurement,
      estimatedTotal: estimatedTotal || null,
      selectedProductsSummary,
      source,
    });
  };

  const copyMessage = async () => {
    setError(null);
    await navigator.clipboard.writeText(message);
    setCopyLabel("Copied");
    try {
      await persistLead("copy");
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : "Lead capture failed after copying.");
    }
    window.setTimeout(() => setCopyLabel("Copy result"), 1800);
  };

  const submitLead = async () => {
    setSubmitStatus("saving");
    setError(null);
    try {
      await persistLead("submit");
      setSubmitStatus("saved");
      window.setTimeout(() => setSubmitStatus("idle"), 2000);
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : "Unable to submit lead.");
      setSubmitStatus("idle");
    }
  };

  return (
    <section className="panel panel-stack">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2>Copy-ready result</h2>
          <p>Let customers copy a tidy message and paste it into Messenger, email, or your website contact form.</p>
        </div>
      </div>

      <label className="field-stack">
        <span>Customer name</span>
        <input type="text" placeholder="Optional but useful" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} />
      </label>

      <div className="contact-form-grid">
        <label className="field-stack">
          <span>Email</span>
          <input type="email" placeholder="Optional" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Phone</span>
          <input type="tel" placeholder="Optional" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
        </label>
      </div>

      <div className="summary-box">
        <div>
          <span className="summary-label">Measurement</span>
          <strong>{measurement ? `${measurement.value.toFixed(1)} ${measurement.unitLabel}` : "Add a measurement"}</strong>
        </div>
        <div>
          <span className="summary-label">Selected items</span>
          <strong>{selectedProducts.length}</strong>
        </div>
        <div>
          <span className="summary-label">Estimated material total</span>
          <strong>{estimatedTotal > 0 ? currency.format(estimatedTotal) : "Not calculated"}</strong>
        </div>
      </div>

      <textarea className="result-area" value={message} readOnly />

      <div className="action-row stretch">
        <button type="button" className="primary" onClick={() => void copyMessage()}>
          {copyLabel}
        </button>
        <button type="button" onClick={() => void submitLead()} disabled={submitStatus === "saving"}>
          {submitStatus === "saving" ? "Saving lead..." : submitStatus === "saved" ? "Lead saved" : "Submit lead"}
        </button>
        <a href={`mailto:${contractor.contact.email}?subject=Fence%20estimate%20request&body=${encodeURIComponent(message)}`}>
          Email contractor
        </a>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {contractor.resultTemplate.includePricingDisclaimer ? (
        <p className="helper-text">
          Displayed pricing is for lead qualification only. Final quotes still depend on site conditions and access.
        </p>
      ) : null}
    </section>
  );
};
