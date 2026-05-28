import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AdminAccountPanel } from "../components/AdminAccountPanel";
import { AdminLeadList } from "../components/AdminLeadList";
import { AdminProductsTable } from "../components/AdminProductsTable";
import { AdminSettingsForm } from "../components/AdminSettingsForm";
import { AdminSubscriptionPanel } from "../components/AdminSubscriptionPanel";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAdminContractor,
  fetchBillingEvents,
  fetchLeadEvents,
  fetchLatestSubscription,
  replaceProducts,
  updateContractorSettings,
  updateLeadEvent,
} from "../lib/repository";
import type { BillingEventRecord, ContractorRecord, LeadRecord, LeadStatus, Product, SubscriptionRecord } from "../types";

interface AdminPageProps {
  refreshPublicContractors: () => Promise<void>;
}

export const AdminPage = ({ refreshPublicContractors }: AdminPageProps) => {
  const { id = "" } = useParams();
  const { isConfigured, isLoading: authLoading, session, signOut } = useAuth();
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState("");
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [productsStatus, setProductsStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [leadsOffset, setLeadsOffset] = useState(0);
  const [hasMoreLeads, setHasMoreLeads] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEventRecord[]>([]);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const publicUrl = useMemo(() => `${window.location.origin}/${id}`, [id]);
  const facebookShareText = useMemo(
    () =>
      `Need a fence quote? Measure your fence line and send us the details here: ${publicUrl}`,
    [publicUrl],
  );
  const embedCode = useMemo(
    () =>
      `<iframe src="${publicUrl}?embed=1" title="${contractor?.contact.businessName ?? "Fence estimator"}" style="width:100%;min-height:760px;border:0;"></iframe>`,
    [contractor?.contact.businessName, publicUrl],
  );


  const copyShareText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setShareStatus(label);
    window.setTimeout(() => setShareStatus(null), 1800);
  };

  const loadLeads = async (contractorId: string, offset = 0) => {
    setIsLoadingLeads(true);
    setLeadsError(null);
    try {
      const { leads: nextLeads, hasMore } = await fetchLeadEvents(contractorId, offset);
      setLeads((current) => (offset === 0 ? nextLeads : [...current, ...nextLeads]));
      setLeadsOffset(offset + nextLeads.length);
      setHasMoreLeads(hasMore);
    } catch (loadError) {
      setLeadsError(loadError instanceof Error ? loadError.message : "Unable to load leads.");
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const loadSubscription = async (contractorId: string) => {
    setIsLoadingSubscription(true);
    setSubscriptionError(null);
    try {
      const [nextSubscription, nextBillingEvents] = await Promise.all([
        fetchLatestSubscription(contractorId),
        fetchBillingEvents(contractorId),
      ]);
      setSubscription(nextSubscription);
      setBillingEvents(nextBillingEvents);
    } catch (loadError) {
      setSubscriptionError(loadError instanceof Error ? loadError.message : "Unable to load subscription.");
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  useEffect(() => {
    if (!isConfigured || authLoading || !session?.user.id) {
      return;
    }

    let active = true;

    void fetchAdminContractor(id, session.user.id)
      .then((record) => {
        if (!active) {
          return;
        }
        setPageError(null);
        setContractor(record);
        setLoadedId(id);
        if (record) {
          void loadLeads(record.id);
          void loadSubscription(record.id);
        }
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setPageError(loadError instanceof Error ? loadError.message : "Unable to load contractor settings.");
        setLoadedId(id);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isConfigured, session?.user.id, id]);

  if (!isConfigured) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Supabase setup required</h1>
          <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before using contractor admin routes.</p>
        </div>
      </main>
    );
  }

  if (!authLoading && !session) {
    return <Navigate to={`/login?next=${encodeURIComponent(`/admin/${id}`)}`} replace />;
  }

  if (authLoading || (!!session && loadedId !== id)) {
    return (
      <main className="page-shell loading-shell">
        <div className="empty-state">
          <h1>Loading contractor admin</h1>
          <p>Checking access and loading products.</p>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Unable to open admin</h1>
          <p>{pageError}</p>
        </div>
      </main>
    );
  }

  if (!contractor) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Access not available</h1>
          <p>This signed-in user is not linked to the requested contractor.</p>
        </div>
      </main>
    );
  }

  const saveSettings = async (nextContractor: ContractorRecord) => {
    setSettingsStatus("saving");
    await updateContractorSettings(nextContractor);
    setContractor(nextContractor);
    setSettingsStatus("saved");
    await refreshPublicContractors();
    window.setTimeout(() => setSettingsStatus("idle"), 1600);
  };

  const saveProducts = async (products: Product[]) => {
    setProductsStatus("saving");
    await replaceProducts(contractor.id, products);
    setContractor({ ...contractor, products });
    setProductsStatus("saved");
    await refreshPublicContractors();
    window.setTimeout(() => setProductsStatus("idle"), 1600);
  };

  const updateLead = async (
    leadId: string,
    updates: Partial<{
      status: LeadStatus;
      internalNotes: string;
      archivedAt: string | null;
      deletedAt: string | null;
    }>,
  ) => {
    const nextLead = await updateLeadEvent(leadId, updates);
    setLeads((current) => {
      if (nextLead.deletedAt) {
        return current.filter((lead) => lead.id !== leadId);
      }

      return current.map((lead) => (lead.id === leadId ? nextLead : lead));
    });
  };

  return (
    <main className="page-shell admin-shell">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Contractor admin</p>
          <h1>{contractor.contact.businessName}</h1>
          <p>Manage branding, contact details, products, and the enquiry message customers send through.</p>
        </div>
        <div className="admin-hero-links">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            Open public estimator
          </a>
          <button type="button" onClick={() => void copyShareText(publicUrl, "Estimator link copied.")}>
            Copy share link
          </button>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>

      <section className="panel share-panel">
        <div>
          <p className="eyebrow">Share estimator</p>
          <h2>Put this link where customers already are</h2>
          <p>Use the estimator link in Facebook posts, website buttons, email signatures, or messages.</p>
        </div>
        <div className="share-actions">
          <button type="button" className="primary" onClick={() => void copyShareText(facebookShareText, "Facebook post copied.")}>
            Copy Facebook post
          </button>
          <button type="button" onClick={() => void copyShareText(publicUrl, "Estimator link copied.")}>
            Copy link
          </button>
          <button type="button" onClick={() => void copyShareText(embedCode, "Website embed copied.")}>
            Copy website embed
          </button>
          {shareStatus ? <p className="success-text">{shareStatus}</p> : null}
        </div>
      </section>

      <section className="admin-grid">
        <AdminSettingsForm key={`settings-${contractor.id}`} contractor={contractor} onSave={saveSettings} saveStatus={settingsStatus} />
        <AdminProductsTable key={`products-${contractor.id}-${contractor.products.length}`} products={contractor.products} onSave={saveProducts} saveStatus={productsStatus} />
      </section>
      <section className="admin-grid">
        <AdminSubscriptionPanel
          subscription={subscription}
          billingEvents={billingEvents}
          contractorId={contractor.id}
          isLoading={isLoadingSubscription}
          error={subscriptionError}
          onRefresh={() => loadSubscription(contractor.id)}
        />
        <AdminAccountPanel email={contractor.contact.email} />
      </section>
      <AdminLeadList
        leads={leads}
        isLoading={isLoadingLeads}
        error={leadsError}
        currency={contractor.currency}
        hasMore={hasMoreLeads}
        onRefresh={() => loadLeads(contractor.id, 0)}
        onLoadMore={() => loadLeads(contractor.id, leadsOffset)}
        onUpdateLead={updateLead}
      />
    </main>
  );
};
