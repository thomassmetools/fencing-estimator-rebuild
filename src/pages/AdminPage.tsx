import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AdminLeadList } from "../components/AdminLeadList";
import { AdminProductsTable } from "../components/AdminProductsTable";
import { AdminSettingsForm } from "../components/AdminSettingsForm";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminContractor, fetchLeadEvents, replaceProducts, updateContractorSettings, updateLeadEvent } from "../lib/repository";
import type { ContractorRecord, LeadRecord, LeadStatus, Product } from "../types";

interface AdminPageProps {
  refreshPublicContractors: () => Promise<void>;
}

export const AdminPage = ({ refreshPublicContractors }: AdminPageProps) => {
  const { slug = "" } = useParams();
  const { isConfigured, isLoading: authLoading, session, signOut } = useAuth();
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadedSlug, setLoadedSlug] = useState("");
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [productsStatus, setProductsStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const publicUrl = useMemo(() => `${window.location.origin}/${slug}`, [slug]);

  const loadLeads = async (contractorId: string) => {
    setIsLoadingLeads(true);
    setLeadsError(null);
    try {
      const nextLeads = await fetchLeadEvents(contractorId);
      setLeads(nextLeads);
    } catch (loadError) {
      setLeadsError(loadError instanceof Error ? loadError.message : "Unable to load leads.");
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (!isConfigured || authLoading || !session?.user.id) {
      return;
    }

    let active = true;

    void fetchAdminContractor(slug, session.user.id)
      .then((record) => {
        if (!active) {
          return;
        }
        setPageError(null);
        setContractor(record);
        setLoadedSlug(slug);
        if (record) {
          void loadLeads(record.id);
        }
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setPageError(loadError instanceof Error ? loadError.message : "Unable to load contractor settings.");
        setLoadedSlug(slug);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isConfigured, session?.user.id, slug]);

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
    return <Navigate to={`/login?next=${encodeURIComponent(`/admin/${slug}`)}`} replace />;
  }

  if (authLoading || (!!session && loadedSlug !== slug)) {
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
          <p>This signed-in user is not linked to the requested contractor slug.</p>
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
          <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copy share link
          </button>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>

      <section className="admin-grid">
        <AdminSettingsForm key={`settings-${contractor.id}`} contractor={contractor} onSave={saveSettings} saveStatus={settingsStatus} />
        <AdminProductsTable key={`products-${contractor.id}-${contractor.products.length}`} products={contractor.products} onSave={saveProducts} saveStatus={productsStatus} />
      </section>
      <AdminLeadList
        leads={leads}
        isLoading={isLoadingLeads}
        error={leadsError}
        onRefresh={() => loadLeads(contractor.id)}
        onUpdateLead={updateLead}
      />
    </main>
  );
};
