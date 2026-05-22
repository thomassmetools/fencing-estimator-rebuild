import { Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminAccessRecords } from "../lib/repository";
import type { AdminAccessRecord } from "../types";

export const AdminHomePage = () => {
  const { isConfigured, isLoading, session, signOut } = useAuth();
  const [records, setRecords] = useState<AdminAccessRecord[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    let active = true;

    void fetchAdminAccessRecords(session.user.id)
      .then((nextRecords) => {
        if (!active) {
          return;
        }
        setRecords(nextRecords);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setPageError(loadError instanceof Error ? loadError.message : "Unable to load your admin access.");
      })
      .finally(() => {
        if (active) {
          setIsLoadingRecords(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (!isConfigured) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Supabase setup required</h1>
          <p>Add your Supabase project URL and anon key to enable contractor admin access.</p>
        </div>
      </main>
    );
  }

  if (!isLoading && !session) {
    return <Navigate to="/login?next=/admin" replace />;
  }

  if (isLoading || isLoadingRecords) {
    return (
      <main className="page-shell loading-shell">
        <div className="empty-state">
          <h1>Loading your portal</h1>
          <p>Checking which contractor admin areas this login can access.</p>
        </div>
      </main>
    );
  }

  if (records.length === 1) {
    return <Navigate to={`/admin/${records[0].contractorId}`} replace />;
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

  return (
    <main className="page-shell admin-home-shell">
      <section className="portal-header panel">
        <div>
          <p className="eyebrow">Contractor login</p>
          <h1>Choose your admin portal</h1>
          <p>
            Use the workspace below to jump straight into the contractor account linked to this email.
          </p>
        </div>
        <div className="admin-hero-links">
          <Link className="button-link" to="/">
            Back to landing page
          </Link>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>

      {records.length === 0 ? (
        <section className="panel">
          <h2>No contractor access found</h2>
          <p className="helper-text">
            This login is not yet linked to an admin portal. Try the payment email from checkout or contact support to finish setup.
          </p>
        </section>
      ) : (
        <section className="portal-grid">
          {records.map((record) => (
            <article className="portal-card" key={record.contractorId}>
              <div>
                <p className="card-kicker">{record.heroLabel || "Estimator portal"}</p>
                <h2>{record.businessName}</h2>
                <p className="helper-text">Admin URL: /admin/{record.contractorId}</p>
              </div>
              <Link className="button-link primary" to={`/admin/${record.contractorId}`}>
                Open admin portal
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};
