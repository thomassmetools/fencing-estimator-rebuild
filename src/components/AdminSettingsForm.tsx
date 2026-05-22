import { useRef, useState } from "react";
import type { ContractorCurrency, ContractorRecord, MeasurementSystem } from "../types";
import { SUPPORTED_CURRENCIES } from "../lib/estimate";
import { validateContractor } from "../lib/validation";
import { uploadContractorLogo } from "../lib/repository";

interface AdminSettingsFormProps {
  contractor: ContractorRecord;
  onSave: (contractor: ContractorRecord) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved";
}

const normaliseColorValue = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
};

export const AdminSettingsForm = ({ contractor, onSave, saveStatus }: AdminSettingsFormProps) => {
  const [draft, setDraft] = useState(contractor);
  const [error, setError] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<"idle" | "uploading">("idle");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateField = (section: "branding" | "contact" | "resultTemplate", key: string, value: string | boolean) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  };

  const updateMeasurementSystem = (measurementSystem: MeasurementSystem) => {
    setDraft((current) => ({ ...current, measurementSystem }));
  };

  const updateCurrency = (currency: ContractorCurrency) => {
    setDraft((current) => ({ ...current, currency }));
  };

  const handleLogoUpload = async (file: File) => {
    setLogoStatus("uploading");
    setError(null);
    try {
      const url = await uploadContractorLogo(contractor.id, file);
      setDraft((current) => ({
        ...current,
        branding: { ...current.branding, logoUrl: url },
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Logo upload failed.");
    } finally {
      setLogoStatus("idle");
    }
  };

  const renderColorField = (
    label: string,
    key: keyof ContractorRecord["branding"],
    fallback: string,
  ) => {
    const value = normaliseColorValue(draft.branding[key] as string, fallback);

    return (
      <label className="field-stack" key={key}>
        <span>{label}</span>
        <div className="color-field">
          <input
            className="color-wheel"
            type="color"
            value={value}
            onChange={(event) => updateField("branding", key, event.target.value)}
            aria-label={`${label} picker`}
          />
          <input
            type="text"
            value={draft.branding[key] as string}
            onChange={(event) => updateField("branding", key, event.target.value)}
            placeholder={fallback}
            spellCheck={false}
          />
          <span className="color-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        </div>
      </label>
    );
  };

  const handleSave = async () => {
    setError(null);
    const validationError = validateContractor(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    }
  };

  return (
    <section className="panel admin-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Branding and messaging</p>
          <h2>Estimator settings</h2>
          <p>These settings control what each contractor sees on their public page.</p>
        </div>
      </div>

      <div className="admin-form-grid">
        <label className="field-stack">
          <span>Business name</span>
          <input value={draft.contact.businessName} onChange={(event) => updateField("contact", "businessName", event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Phone</span>
          <input type="tel" value={draft.contact.phone} onChange={(event) => updateField("contact", "phone", event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Email</span>
          <input type="email" value={draft.contact.email} onChange={(event) => updateField("contact", "email", event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Website</span>
          <input type="url" value={draft.contact.website} onChange={(event) => updateField("contact", "website", event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Customer measurements</span>
          <select
            value={draft.measurementSystem}
            onChange={(event) => updateMeasurementSystem(event.target.value as MeasurementSystem)}
          >
            <option value="metric">Metric (metres)</option>
            <option value="imperial">Imperial (feet)</option>
          </select>
        </label>
        <label className="field-stack">
          <span>Pricing currency</span>
          <select
            value={draft.currency}
            onChange={(event) => updateCurrency(event.target.value as ContractorCurrency)}
          >
            {SUPPORTED_CURRENCIES.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field-stack full-span">
          <span>Facebook URL</span>
          <input type="url" value={draft.contact.facebookUrl} onChange={(event) => updateField("contact", "facebookUrl", event.target.value)} />
        </label>
        <label className="field-stack full-span">
          <span>Hero label</span>
          <input value={draft.branding.heroLabel} onChange={(event) => updateField("branding", "heroLabel", event.target.value)} />
        </label>
        <label className="field-stack full-span">
          <span>Intro text</span>
          <textarea rows={3} value={draft.branding.introText} onChange={(event) => updateField("branding", "introText", event.target.value)} />
        </label>
        <div className="field-stack full-span">
          <span>Company logo</span>
          <div className="logo-upload-row">
            {draft.branding.logoUrl ? (
              <img src={draft.branding.logoUrl} alt="Company logo" className="logo-preview" />
            ) : (
              <div className="logo-placeholder">No logo uploaded</div>
            )}
            <div className="logo-upload-actions">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogoUpload(file);
                }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoStatus === "uploading"}
              >
                {logoStatus === "uploading" ? "Uploading..." : draft.branding.logoUrl ? "Replace logo" : "Upload logo"}
              </button>
              {draft.branding.logoUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      branding: { ...current.branding, logoUrl: "" },
                    }))
                  }
                >
                  Remove logo
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {renderColorField("Primary color", "primaryColor", "#1d4f41")}
        {renderColorField("Accent color", "accentColor", "#d8a64f")}
        <label className="field-stack full-span">
          <span>Opening line</span>
          <textarea rows={2} value={draft.resultTemplate.openingLine} onChange={(event) => updateField("resultTemplate", "openingLine", event.target.value)} />
        </label>
        <label className="field-stack full-span">
          <span>Closing line</span>
          <textarea rows={2} value={draft.resultTemplate.closingLine} onChange={(event) => updateField("resultTemplate", "closingLine", event.target.value)} />
        </label>
        <label className="checkbox-row full-span">
          <input
            type="checkbox"
            checked={draft.resultTemplate.includePricingDisclaimer}
            onChange={(event) => updateField("resultTemplate", "includePricingDisclaimer", event.target.checked)}
          />
          <span>Show pricing disclaimer in the public estimator</span>
        </label>
      </div>

      <div className="admin-footer">
        {error ? <p className="error-text">{error}</p> : null}
        {saveStatus === "saved" ? <p className="success-text">Settings saved to Supabase.</p> : null}
        <button type="button" className="primary" onClick={() => void handleSave()} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving..." : "Save settings"}
        </button>
      </div>
    </section>
  );
};
