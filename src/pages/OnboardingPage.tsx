import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  claimOnboardingContext,
  replaceProducts,
  setContractorPublished,
  updateContractorSettings,
  updateOnboardingProgress,
} from "../lib/repository";
import type { ContractorRecord, MeasurementSystem, OnboardingContext, Product } from "../types";
import { validateContractor, validateProducts } from "../lib/validation";

const defaultProduct = (): Product => ({
  id: crypto.randomUUID(),
  name: "New product",
  description: "Describe the product customers should request.",
  unit: "lineal metre",
  basePrice: 100,
});

const normaliseColorValue = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
};

export const OnboardingPage = () => {
  const { session, isLoading } = useAuth();
  const [context, setContext] = useState<OnboardingContext | null>(null);
  const [draft, setDraft] = useState<ContractorRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let active = true;
    void claimOnboardingContext()
      .then((result) => {
        if (!active) {
          return;
        }
        setContext(result);
        setDraft(result?.contractor ?? null);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load onboarding.");
      });

    return () => {
      active = false;
    };
  }, [session]);

  const isLoadingContext = Boolean(session) && !context && !draft && !error;

  const recommendedSlug = useMemo(() => {
    if (!draft) {
      return "";
    }

    return draft.slug;
  }, [draft]);

  const publicUrl = useMemo(() => {
    if (!draft || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/${draft.slug}`;
  }, [draft]);

  const facebookShareText = useMemo(() => {
    return `Need a fence quote? Measure your fence line and send us the details here: ${publicUrl}`;
  }, [publicUrl]);

  const copyShareText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setShareStatus(label);
    window.setTimeout(() => setShareStatus(null), 1800);
  };

  if (!isLoading && !session) {
    return <Navigate to="/login?next=/onboarding" replace />;
  }

  if (isLoading || isLoadingContext) {
    return (
      <main className="page-shell loading-shell">
        <div className="empty-state">
          <h1>Loading onboarding</h1>
          <p>Preparing your account setup.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Unable to load onboarding</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!context || !draft) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>No onboarding record found</h1>
          <p>
            This login does not currently have a pending contractor subscription to claim. Once Stripe provisioning is
            wired, paid customers will land here automatically.
          </p>
          <Link to="/">Back to home</Link>
        </div>
      </main>
    );
  }

  const updateContact = (key: keyof ContractorRecord["contact"], value: string) => {
    setDraft((current) => (current ? { ...current, contact: { ...current.contact, [key]: value } } : current));
  };

  const updateBranding = (key: keyof ContractorRecord["branding"], value: string) => {
    setDraft((current) => (current ? { ...current, branding: { ...current.branding, [key]: value } } : current));
  };

  const updateMeasurementSystem = (measurementSystem: MeasurementSystem) => {
    setDraft((current) => (current ? { ...current, measurementSystem } : current));
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
            onChange={(event) => updateBranding(key, event.target.value)}
            aria-label={`${label} picker`}
          />
          <input
            type="text"
            value={draft.branding[key] as string}
            onChange={(event) => updateBranding(key, event.target.value)}
            placeholder={fallback}
            spellCheck={false}
          />
          <span className="color-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        </div>
      </label>
    );
  };

  const updateTemplate = (key: keyof ContractorRecord["resultTemplate"], value: string | boolean) => {
    setDraft((current) => (current ? { ...current, resultTemplate: { ...current.resultTemplate, [key]: value } } : current));
  };

  const updateProduct = (productId: string, key: keyof Product, value: string | number | boolean) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            products: current.products.map((product) => (product.id === productId ? { ...product, [key]: value } : product)),
          }
        : current,
    );
  };

  const addProduct = () => {
    setDraft((current) => (current ? { ...current, products: [...current.products, defaultProduct()] } : current));
  };

  const removeProduct = (productId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((product) => product.id !== productId),
          }
        : current,
    );
  };

  const handleSave = async (publish: boolean) => {
    if (!draft) {
      return;
    }

    setSaveStatus("saving");
    const contractorError = validateContractor(draft);
    if (contractorError) {
      setError(contractorError);
      setSaveStatus("idle");
      return;
    }

    const productsError = validateProducts(draft.products);
    if (productsError) {
      setError(productsError);
      setSaveStatus("idle");
      return;
    }

    try {
      await updateContractorSettings(draft);
      await replaceProducts(draft.id, draft.products);
      if (publish) {
        await setContractorPublished(draft.id, true);
      }
      const onboarding = await updateOnboardingProgress({
        contractorId: draft.id,
        currentStep: publish ? "complete" : "products",
        isLive: publish,
        complete: publish,
      });

      setContext({
        ...context,
        contractor: draft,
        onboarding,
      });
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save onboarding.");
      setSaveStatus("idle");
    }
  };

  return (
    <main className="page-shell admin-shell">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>{draft.contact.businessName || "New contractor account"}</h1>
          <p>
            Add your business details, confirm the products customers can choose, then publish your estimator.
          </p>
        </div>
        <div className="admin-hero-links">
          <span>Plan: {context.subscription?.planCode ?? "starter-monthly"}</span>
          <span>Suggested URL: /{recommendedSlug}</span>
          {context.onboarding.isLive ? (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              Open estimator
            </a>
          ) : null}
        </div>
      </section>

      <section className="admin-grid">
        <section className="panel admin-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Business details</p>
              <h2>Contractor profile</h2>
              <p>These details become the public estimator page and default admin contact information.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="field-stack">
              <span>Business name</span>
              <input value={draft.contact.businessName} onChange={(event) => updateContact("businessName", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Phone</span>
              <input type="tel" value={draft.contact.phone} onChange={(event) => updateContact("phone", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Email</span>
              <input type="email" value={draft.contact.email} onChange={(event) => updateContact("email", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Website</span>
              <input type="url" value={draft.contact.website} onChange={(event) => updateContact("website", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Customer measurements</span>
              <select value={draft.measurementSystem} onChange={(event) => updateMeasurementSystem(event.target.value as MeasurementSystem)}>
                <option value="metric">Metric (metres)</option>
                <option value="imperial">Imperial (feet)</option>
              </select>
            </label>
            <label className="field-stack full-span">
              <span>Facebook URL</span>
              <input type="url" value={draft.contact.facebookUrl} onChange={(event) => updateContact("facebookUrl", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Hero label</span>
              <input value={draft.branding.heroLabel} onChange={(event) => updateBranding("heroLabel", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Intro text</span>
              <textarea rows={3} value={draft.branding.introText} onChange={(event) => updateBranding("introText", event.target.value)} />
            </label>
            {renderColorField("Primary color", "primaryColor", "#1d4f41")}
            {renderColorField("Accent color", "accentColor", "#d8a64f")}
            <label className="field-stack full-span">
              <span>Opening line</span>
              <textarea rows={2} value={draft.resultTemplate.openingLine} onChange={(event) => updateTemplate("openingLine", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Closing line</span>
              <textarea rows={2} value={draft.resultTemplate.closingLine} onChange={(event) => updateTemplate("closingLine", event.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel admin-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Products</p>
              <h2>Starter product set</h2>
              <p>Seed these from templates later. For now, this is the first place a paid customer can finish setup.</p>
            </div>
            <button type="button" className="primary" onClick={addProduct}>
              Add product
            </button>
          </div>
          <div className="admin-product-list">
            {draft.products.map((product) => (
              <article className="admin-product-card" key={product.id}>
                <div className="admin-inline-grid">
                  <label className="field-stack grow">
                    <span>Name</span>
                    <input value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} />
                  </label>
                  <label className="field-stack narrow">
                    <span>Unit</span>
                    <select value={product.unit} onChange={(event) => updateProduct(product.id, "unit", event.target.value)}>
                      <option value="lineal metre">lineal metre</option>
                      <option value="metre squared">metre squared</option>
                      <option value="lineal foot">lineal foot</option>
                      <option value="square foot">square foot</option>
                      <option value="each">each</option>
                    </select>
                  </label>
                  <label className="field-stack narrow">
                    <span>Base price</span>
                    <input type="number" value={product.basePrice} onChange={(event) => updateProduct(product.id, "basePrice", Number(event.target.value))} />
                  </label>
                </div>
                <label className="field-stack">
                  <span>Description</span>
                  <textarea rows={2} value={product.description} onChange={(event) => updateProduct(product.id, "description", event.target.value)} />
                </label>
                <div className="action-row">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(product.isFeatured)}
                      onChange={(event) => updateProduct(product.id, "isFeatured", event.target.checked)}
                    />
                    <span>Featured</span>
                  </label>
                  <button type="button" onClick={() => removeProduct(product.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel helper-panel">
        <div className="admin-footer">
          {error ? <p className="error-text">{error}</p> : null}
          {saveStatus === "saved" ? (
            <p className="success-text">
              {context.onboarding.isLive ? "Your estimator is live." : "Onboarding details saved."}
            </p>
          ) : null}
          <button type="button" onClick={() => void handleSave(false)} disabled={saveStatus === "saving"}>
            Save progress
          </button>
          <button type="button" className="primary" onClick={() => void handleSave(true)} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Publishing..." : "Save and go live"}
          </button>
        </div>
        {context.onboarding.isLive ? (
          <div className="go-live-share">
            <div>
              <h2>Share your estimator</h2>
              <p className="helper-text">Copy this into a Facebook post, message, website button, or email signature.</p>
            </div>
            <div className="share-actions">
              <button type="button" className="primary" onClick={() => void copyShareText(facebookShareText, "Facebook post copied.")}>
                Copy Facebook post
              </button>
              <button type="button" onClick={() => void copyShareText(publicUrl, "Estimator link copied.")}>
                Copy estimator link
              </button>
              {shareStatus ? <p className="success-text">{shareStatus}</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};
