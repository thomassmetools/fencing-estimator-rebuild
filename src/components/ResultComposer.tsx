import { useMemo, useState } from "react";
import { TurnstileWidget } from "./TurnstileWidget";
import { buildResultMessage, estimateProductSubtotal } from "../lib/estimate";
import { submitLeadEvent } from "../lib/repository";
import type { ContractorRecord, LeadSource, MeasurementResult, Product } from "../types";

interface ResultComposerProps {
  contractor: ContractorRecord;
  measurement: MeasurementResult | null;
  selectedProducts: Array<{ product: Product; quantity: number }>;
  customerName: string;
  customerAddress: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerAddressChange: (value: string) => void;
  formatAmount: (n: number) => string;
  onBack: () => void;
}

export const ResultComposer = ({
  contractor,
  measurement,
  selectedProducts,
  customerName,
  customerAddress,
  onCustomerNameChange,
  onCustomerAddressChange,
  formatAmount,
  onBack,
}: ResultComposerProps) => {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [copyLabel, setCopyLabel] = useState("Copy result");
  const [emailLabel, setEmailLabel] = useState("Email contractor");
  const [activeAction, setActiveAction] = useState<LeadSource | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const estimatedTotal = useMemo(() => {
    return selectedProducts.reduce((sum, entry) => sum + estimateProductSubtotal(entry.product, entry.quantity), 0);
  }, [selectedProducts]);

  const selectedProductsSummary = useMemo(() => {
    return selectedProducts.map(({ product, quantity }) => `${product.name}: ${quantity} ${product.unit}`);
  }, [selectedProducts]);

  const generatedMessage = useMemo(() => {
    return buildResultMessage({
      businessName: contractor.contact.businessName,
      openingLine: contractor.resultTemplate.openingLine,
      closingLine: contractor.resultTemplate.closingLine,
      measurement,
      selectedProducts,
      customerName,
      customerAddress,
      siteAccess: "Easy access",
      oldFenceRemoval: "No old fence to remove",
      projectTiming: "Within the next month",
      siteNotes: "Add any gate width, slope, retaining walls, awkward corners, or boundary notes here.",
    });
  }, [contractor, customerAddress, customerName, measurement, selectedProducts]);
  const [messageOverride, setMessageOverride] = useState<string | null>(null);
  const message = messageOverride ?? generatedMessage;

  const validateLead = () => {
    if (!customerName.trim()) {
      setError("Please enter your name so the contractor knows who to contact.");
      return false;
    }

    if (!customerAddress.trim()) {
      setError("Please enter the fence site address so the contractor knows where the job is located.");
      return false;
    }

    if (!measurement) {
      setError("Please save your fence length before sending the enquiry.");
      return false;
    }

    if (!customerEmail.trim() && !customerPhone.trim()) {
      setError("Please enter an email address or phone number so the contractor can reply.");
      return false;
    }

    if (!turnstileToken) {
      setError("The secure enquiry check is not ready yet. Please try again, or use copy/email instead.");
      return false;
    }

    setError(null);
    return true;
  };

  const persistLead = async (source: LeadSource) => {
    if (!validateLead()) {
      return false;
    }

    setActiveAction(source);
    try {
      await submitLeadEvent({
        contractorId: contractor.id,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        message,
        measurement,
        estimatedTotal: estimatedTotal || null,
        selectedProductsSummary,
        source,
        turnstileToken,
      });
      if (source === "submit") {
        setSubmitStatus("saved");
      }
      setCustomerEmail("");
      setCustomerPhone("");
      onCustomerNameChange("");
      onCustomerAddressChange("");
      setMessageOverride(null);
      setTurnstileToken("");
      setTurnstileNonce((current) => current + 1);
      return true;
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : "Unable to submit lead.");
      return false;
    } finally {
      setActiveAction(null);
    }
  };

  const copyMessage = async () => {
    const wasSaved = await persistLead("copy");
    if (!wasSaved) {
      return;
    }

    await navigator.clipboard.writeText(message);
    setCopyLabel("Copied and saved");
    window.setTimeout(() => setCopyLabel("Copy result"), 1800);
  };

  const emailContractor = async () => {
    const wasSaved = await persistLead("email");
    if (!wasSaved) {
      return;
    }

    window.location.href = `mailto:${contractor.contact.email}?subject=Fence%20estimate%20request&body=${encodeURIComponent(message)}`;
    setEmailLabel("Saved and opened");
    window.setTimeout(() => setEmailLabel("Email contractor"), 1800);
  };

  const submitLead = async () => {
    await persistLead("submit");
  };

  return (
    <section className="panel panel-stack">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2>Your fence enquiry</h2>
          <p>Enter your contact details, check the summary, then send it to the contractor.</p>
        </div>
        <button type="button" className="wizard-back-btn" onClick={onBack}>
          ← Back to products
        </button>
      </div>

      <div className="result-layout">
        <div className="result-fields">
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

          <label className="field-stack">
            <span>Fence site address</span>
            <input
              type="text"
              placeholder="Required"
              value={customerAddress}
              onChange={(event) => {
                onCustomerAddressChange(event.target.value);
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
              <strong>{estimatedTotal > 0 ? formatAmount(estimatedTotal) : "Not calculated"}</strong>
            </div>
          </div>
        </div>

        <div className="result-message">
          <textarea
            className="result-area"
            value={message}
            onChange={(event) => {
              setMessageOverride(event.target.value);
            }}
          />
          {submitStatus === "saved" ? (
            <div className="success-panel">
              <strong>Enquiry sent!</strong>
              <p>Your fence details have been sent to the team. We'll be in touch soon.</p>
              <button type="button" onClick={() => setSubmitStatus("idle")}>
                Start a new enquiry
              </button>
            </div>
          ) : (
            <TurnstileWidget key={turnstileNonce} onTokenChange={setTurnstileToken} />
          )}

          <div className="action-row stretch">
            <button type="button" className="primary" onClick={() => void copyMessage()}>
              {activeAction === "copy" ? "Saving..." : copyLabel}
            </button>
            <button type="button" onClick={() => void submitLead()} disabled={activeAction !== null || submitStatus === "saved"}>
              {activeAction === "submit" ? "Sending..." : submitStatus === "saved" ? "Enquiry sent" : "Send enquiry"}
            </button>
            <button type="button" onClick={() => void emailContractor()} disabled={activeAction !== null}>
              {activeAction === "email" ? "Saving..." : emailLabel}
            </button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          {contractor.resultTemplate.includePricingDisclaimer ? (
            <p className="helper-text">
              Displayed pricing is for lead qualification only. Final quotes still depend on site conditions and access.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};
