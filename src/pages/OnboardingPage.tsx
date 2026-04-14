import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { claimOnboardingContext, replaceProducts, updateContractorSettings, updateOnboardingProgress } from "../lib/repository";
import type { ContractorRecord, OnboardingContext, Product } from "../types";

const defaultProduct = (): Product => ({
  id: crypto.randomUUID(),
  name: "New product",
  description: "Describe the product customers should request.",
  unit: "lineal metre",
  basePrice: 100,
});

export const OnboardingPage = () => {
  const { session, isLoading } = useAuth();
  const [context, setContext] = useState<OnboardingContext | null>(null);
  const [draft, setDraft] = useState<ContractorRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

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
    try {
      await updateContractorSettings(draft);
      await replaceProducts(draft.id, draft.products);
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
            This is the first-pass wizard for getting a paid customer live. It uses the payment-created contractor record
            and lets them fill the rest of their business details and first products.
          </p>
        </div>
        <div className="admin-hero-links">
          <span>Plan: {context.subscription?.planCode ?? "starter-monthly"}</span>
          <span>Suggested URL: /{recommendedSlug}</span>
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
              <input value={draft.contact.phone} onChange={(event) => updateContact("phone", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Email</span>
              <input value={draft.contact.email} onChange={(event) => updateContact("email", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Website</span>
              <input value={draft.contact.website} onChange={(event) => updateContact("website", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Facebook URL</span>
              <input value={draft.contact.facebookUrl} onChange={(event) => updateContact("facebookUrl", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Hero label</span>
              <input value={draft.branding.heroLabel} onChange={(event) => updateBranding("heroLabel", event.target.value)} />
            </label>
            <label className="field-stack full-span">
              <span>Intro text</span>
              <textarea rows={3} value={draft.branding.introText} onChange={(event) => updateBranding("introText", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Primary color</span>
              <input value={draft.branding.primaryColor} onChange={(event) => updateBranding("primaryColor", event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Accent color</span>
              <input value={draft.branding.accentColor} onChange={(event) => updateBranding("accentColor", event.target.value)} />
            </label>
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
          {saveStatus === "saved" ? <p className="success-text">Onboarding details saved.</p> : null}
          <button type="button" onClick={() => void handleSave(false)} disabled={saveStatus === "saving"}>
            Save progress
          </button>
          <button type="button" className="primary" onClick={() => void handleSave(true)} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Publishing..." : "Save and go live"}
          </button>
        </div>
      </section>
    </main>
  );
};
