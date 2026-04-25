import { useMemo, useState } from "react";
import { TurnstileWidget } from "./TurnstileWidget";
import { buildResultMessage, currency, estimateProductSubtotal } from "../lib/estimate";
import { submitLeadEvent } from "../lib/repository";
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
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileNonce, setTurnstileNonce] = useState(0);
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

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy result"), 1800);
  };

  const submitLead = async () => {
    if (!customerName.trim()) {
      setError("Please enter your name so the contractor knows who to contact.");
      return;
    }

    if (!measurement) {
      setError("Please save your fence length before sending the enquiry.");
      return;
    }

    if (!customerEmail.trim() && !customerPhone.trim()) {
      setError("Please enter an email address or phone number so the contractor can reply.");
      return;
    }

    if (!turnstileToken) {
      setError("The secure enquiry check is not ready yet. Please try again, or use copy/email instead.");
      return;
    }

    setSubmitStatus("saving");
    setError(null);
    try {
      await submitLeadEvent({
        contractorId: contractor.id,
        customerName,
        customerEmail,
        customerPhone,
        message,
        measurement,
        estimatedTotal: estimatedTotal || null,
        selectedProductsSummary,
        turnstileToken,
      });
      setSubmitStatus("saved");
      setCustomerEmail("");
      setCustomerPhone("");
      onCustomerNameChange("");
      setTurnstileToken("");
      setTurnstileNonce((current) => current + 1);
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
          <h2>Your fence enquiry</h2>
          <p>Enter your contact details, check the summary, then send it to the contractor.</p>
        </div>
      </div>

      <label className="field-stack">
        <span>Your name</span>
        <input
          type="text"
          placeholder="Required"
          value={customerName}
          onChange={(event) => {
            onCustomerNameChange(event.target.value);
            setError(null);
          }}
        />
      </label>

      <div className="contact-form-grid">
        <label className="field-stack">
          <span>Email</span>
          <input
            type="email"
            placeholder="Email or phone required"
            value={customerEmail}
            onChange={(event) => {
              setCustomerEmail(event.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="field-stack">
          <span>Phone</span>
          <input
            type="tel"
            placeholder="Email or phone required"
            value={customerPhone}
            onChange={(event) => {
              setCustomerPhone(event.target.value);
              setError(null);
            }}
          />
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
      {submitStatus === "saved" ? (
        <div className="success-panel">
          <strong>Enquiry sent.</strong>
          <p>The contractor has received your fence details and can follow up from the admin portal.</p>
          <button type="button" onClick={() => setSubmitStatus("idle")}>
            Send another enquiry
          </button>
        </div>
      ) : (
        <TurnstileWidget key={turnstileNonce} onTokenChange={setTurnstileToken} />
      )}

      <div className="action-row stretch">
        <button type="button" className="primary" onClick={() => void copyMessage()}>
          {copyLabel}
        </button>
        <button type="button" onClick={() => void submitLead()} disabled={submitStatus === "saving" || submitStatus === "saved"}>
          {submitStatus === "saving" ? "Sending..." : submitStatus === "saved" ? "Enquiry sent" : "Send enquiry"}
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
