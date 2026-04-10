import { LeadMeasurementMap } from "./LeadMeasurementMap";
import type { LeadRecord } from "../types";

interface AdminLeadListProps {
  leads: LeadRecord[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const AdminLeadList = ({ leads, isLoading, error, onRefresh }: AdminLeadListProps) => {
  return (
    <section className="panel admin-panel full-span-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Leads</p>
          <h2>Recent enquiry activity</h2>
          <p>Shows protected quote requests captured from the public estimator, including the customer's map pins.</p>
        </div>
        <button type="button" onClick={() => void onRefresh()} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh leads"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {leads.length === 0 ? (
        <p className="helper-text">No leads captured yet. Submitted leads from the customer page will appear here.</p>
      ) : (
        <div className="lead-list">
          {leads.map((lead) => (
            <article className="lead-card" key={lead.id}>
              <div className="lead-card-header">
                <div>
                  <h3>{lead.customerName || "Unnamed customer"}</h3>
                  <p>{formatDateTime(lead.createdAt)}</p>
                </div>
                <span className="pill">{lead.source}</span>
              </div>
              <div className="lead-meta-grid">
                <span>{lead.customerEmail || "No email provided"}</span>
                <span>{lead.customerPhone || "No phone provided"}</span>
                <span>
                  {lead.measurementMode && lead.measurementValue && lead.measurementUnit
                    ? `${lead.measurementMode}: ${lead.measurementValue.toFixed(1)} ${lead.measurementUnit}`
                    : "No measurement saved"}
                </span>
              </div>
              {lead.selectedProductsSummary.length > 0 ? (
                <p className="helper-text">{lead.selectedProductsSummary.join(" | ")}</p>
              ) : null}
              <LeadMeasurementMap lead={lead} />
              <textarea className="result-area lead-message" value={lead.message} readOnly />
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
