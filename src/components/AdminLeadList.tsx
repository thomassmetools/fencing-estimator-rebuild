import { Fragment, useMemo, useState } from "react";
import { currency } from "../lib/estimate";
import { LeadMeasurementMap } from "./LeadMeasurementMap";
import type { LeadRecord, LeadStatus } from "../types";

interface AdminLeadListProps {
  leads: LeadRecord[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUpdateLead: (
    leadId: string,
    updates: Partial<{
      status: LeadStatus;
      internalNotes: string;
      archivedAt: string | null;
      deletedAt: string | null;
    }>,
  ) => Promise<void>;
}

const leadStatuses: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatMeasurement = (lead: LeadRecord) => {
  if (!lead.measurementMode || !lead.measurementValue || !lead.measurementUnit) {
    return "No measurement";
  }

  return `${lead.measurementValue.toFixed(1)} ${lead.measurementUnit}`;
};

const contactSummary = (lead: LeadRecord) => {
  if (lead.customerEmail && lead.customerPhone) {
    return `${lead.customerEmail} / ${lead.customerPhone}`;
  }

  return lead.customerEmail || lead.customerPhone || "No contact";
};

const buildMapLink = (lead: LeadRecord) => {
  if (lead.customerAddress.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.customerAddress.trim())}`;
  }

  const point = lead.measurementPoints[0];
  if (!point) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
};

const notificationSummary = (lead: LeadRecord) => {
  switch (lead.notificationStatus) {
    case "sent":
      return "Lead email sent";
    case "failed":
      return lead.notificationError || "Lead email failed";
    case "skipped":
      return lead.notificationError || "Lead email not configured";
    default:
      return "Lead email pending";
  }
};

export const AdminLeadList = ({ leads, isLoading, error, onRefresh, onUpdateLead }: AdminLeadListProps) => {
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    const normalisedSearch = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      if (!showArchived && lead.archivedAt) {
        return false;
      }

      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (!normalisedSearch) {
        return true;
      }

      const searchable = [
        lead.customerName,
        lead.customerEmail,
        lead.customerPhone,
        lead.customerAddress,
        lead.message,
        lead.selectedProductsSummary.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalisedSearch);
    });
  }, [leads, searchQuery, showArchived, statusFilter]);

  const leadStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeLeads = leads.filter((lead) => !lead.archivedAt && !lead.deletedAt);
    const leadsThisMonth = activeLeads.filter((lead) => new Date(lead.createdAt) >= monthStart);
    const openValue = activeLeads
      .filter((lead) => lead.status !== "lost")
      .reduce((sum, lead) => sum + (lead.estimatedTotal ?? 0), 0);

    return {
      newCount: activeLeads.filter((lead) => lead.status === "new").length,
      monthCount: leadsThisMonth.length,
      wonCount: activeLeads.filter((lead) => lead.status === "won").length,
      openValue,
    };
  }, [leads]);

  const performLeadUpdate = async (
    leadId: string,
    updates: Parameters<AdminLeadListProps["onUpdateLead"]>[1],
  ) => {
    setSavingLeadId(leadId);
    setActionError(null);

    try {
      await onUpdateLead(leadId, updates);
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Unable to update lead.");
    } finally {
      setSavingLeadId(null);
    }
  };

  const saveNotes = async (lead: LeadRecord) => {
    const draft = notesDrafts[lead.id] ?? lead.internalNotes;
    await performLeadUpdate(lead.id, { internalNotes: draft });
  };

  const softDeleteLead = async (lead: LeadRecord) => {
    const confirmed = window.confirm("Delete this lead from the admin list? This keeps a soft-delete record in Supabase.");
    if (!confirmed) {
      return;
    }

    await performLeadUpdate(lead.id, {
      archivedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="panel admin-panel full-span-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Leads</p>
          <h2>Lead pipeline</h2>
          <p>Track new enquiries, follow-up status, notes, measurements, and archived leads.</p>
        </div>
        <button type="button" onClick={() => void onRefresh()} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="lead-controls">
        <label className="field-stack grow">
          <span>Search leads</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Name, email, phone, product"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <label className="field-stack narrow">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "all")}>
            <option value="all">All active</option>
            {leadStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row lead-archive-toggle">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          <span>Show archived</span>
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {actionError ? <p className="error-text">{actionError}</p> : null}

      <div className="lead-stat-grid">
        <div className="lead-stat-card">
          <span className="summary-label">New</span>
          <strong>{leadStats.newCount}</strong>
        </div>
        <div className="lead-stat-card">
          <span className="summary-label">This month</span>
          <strong>{leadStats.monthCount}</strong>
        </div>
        <div className="lead-stat-card">
          <span className="summary-label">Won</span>
          <strong>{leadStats.wonCount}</strong>
        </div>
        <div className="lead-stat-card">
          <span className="summary-label">Open value</span>
          <strong>{leadStats.openValue > 0 ? currency.format(leadStats.openValue) : "$0"}</strong>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <p className="helper-text">No matching leads yet. New submitted enquiries will appear here.</p>
      ) : (
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Measurement</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const isExpanded = expandedLeadId === lead.id;
                const notesValue = notesDrafts[lead.id] ?? lead.internalNotes;
                const isSaving = savingLeadId === lead.id;
                const mapLink = buildMapLink(lead);

                return (
                  <Fragment key={lead.id}>
                    <tr className={lead.archivedAt ? "lead-row archived" : "lead-row"}>
                      <td>
                        <button
                          type="button"
                          className="lead-expand-button"
                          onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                        <div>
                          <strong>{lead.customerName || "Unnamed customer"}</strong>
                          <span>{formatDateTime(lead.createdAt)}</span>
                        </div>
                      </td>
                      <td>{contactSummary(lead)}</td>
                      <td>{formatMeasurement(lead)}</td>
                      <td>{lead.estimatedTotal ? currency.format(lead.estimatedTotal) : "Not calculated"}</td>
                      <td>
                        <select
                          value={lead.status}
                          onChange={(event) => void performLeadUpdate(lead.id, { status: event.target.value as LeadStatus })}
                          disabled={isSaving}
                          aria-label={`Status for ${lead.customerName || "lead"}`}
                        >
                          {leadStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="lead-action-row">
                          <button
                            type="button"
                            onClick={() =>
                              void performLeadUpdate(lead.id, {
                                archivedAt: lead.archivedAt ? null : new Date().toISOString(),
                              })
                            }
                            disabled={isSaving}
                          >
                            {lead.archivedAt ? "Restore" : "Archive"}
                          </button>
                          <button type="button" onClick={() => void softDeleteLead(lead)} disabled={isSaving}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="lead-detail-row">
                        <td colSpan={6}>
                          <div className="lead-detail-grid">
                            <div>
                              <h3>Lead details</h3>
                              {lead.customerAddress ? <p className="helper-text">Site address: {lead.customerAddress}</p> : null}
                              <p className="helper-text">Source: {lead.source}</p>
                              {lead.selectedProductsSummary.length > 0 ? (
                                <p className="helper-text">{lead.selectedProductsSummary.join(" | ")}</p>
                              ) : (
                                <p className="helper-text">No products selected.</p>
                              )}
                              <p className={lead.notificationStatus === "failed" ? "error-text" : "helper-text"}>
                                {notificationSummary(lead)}
                              </p>
                              <textarea className="result-area lead-message" value={lead.message} readOnly />
                            </div>
                            <div>
                              <h3>Internal notes</h3>
                              <textarea
                                className="lead-notes"
                                value={notesValue}
                                placeholder="Add follow-up notes for your team."
                                onChange={(event) => setNotesDrafts((current) => ({ ...current, [lead.id]: event.target.value }))}
                              />
                              <div className="lead-action-row">
                                <button type="button" className="primary" onClick={() => void saveNotes(lead)} disabled={isSaving}>
                                  {isSaving ? "Saving..." : "Save notes"}
                                </button>
                                {lead.customerEmail ? <a href={`mailto:${lead.customerEmail}`}>Email</a> : null}
                                {lead.customerPhone ? <a href={`tel:${lead.customerPhone}`}>Call</a> : null}
                                {mapLink ? <a href={mapLink} target="_blank" rel="noreferrer">Open map</a> : null}
                              </div>
                              {lead.lastContactedAt ? (
                                <p className="helper-text">Last contacted {formatDateTime(lead.lastContactedAt)}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="lead-map-section">
                            <div>
                              <h3>Map points</h3>
                              <p className="helper-text">
                                {lead.measurementPoints.length > 0
                                  ? `${lead.measurementPoints.length} saved points from the customer measurement.`
                                  : "No map points were saved with this lead."}
                              </p>
                            </div>
                            {lead.measurementPoints.length > 0 ? (
                              <ol className="lead-points-list">
                                {lead.measurementPoints.map((point, index) => (
                                  <li key={`${lead.id}-point-${index}`}>
                                    {index + 1}. {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                  </li>
                                ))}
                              </ol>
                            ) : null}
                            <LeadMeasurementMap lead={lead} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
