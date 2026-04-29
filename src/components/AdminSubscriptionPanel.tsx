import { useState } from "react";
import { createBillingPortalSession } from "../lib/repository";
import type { BillingEventRecord, SubscriptionRecord } from "../types";

interface AdminSubscriptionPanelProps {
  subscription: SubscriptionRecord | null;
  billingEvents: BillingEventRecord[];
  contractorId: string;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null || !currency) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const billingSummary = (subscription: SubscriptionRecord | null, billingEvents: BillingEventRecord[]) => {
  if (!subscription) {
    return {
      tone: "helper-text",
      headline: "No subscription record found yet.",
      detail: "Stripe has not provisioned a subscription record for this contractor.",
    } as const;
  }

  const latestSuccess = billingEvents.find((event) => event.eventType === "invoice.paid");
  const latestFailure = billingEvents.find((event) => event.eventType === "invoice.payment_failed");
  const now = Date.now();
  const renewsAt = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
  const isHealthy =
    (subscription.status === "active" || subscription.status === "trialing") &&
    Boolean(renewsAt && renewsAt > now) &&
    (!latestFailure || (latestSuccess && new Date(latestSuccess.occurredAt) > new Date(latestFailure.occurredAt)));

  if (isHealthy) {
    return {
      tone: "success-text",
      headline: "Billing looks healthy.",
      detail: latestSuccess
        ? `Latest successful renewal was ${formatDateTime(latestSuccess.occurredAt)}. Next renewal is ${subscription.currentPeriodEnd ? formatDateTime(subscription.currentPeriodEnd) : "not available yet"}.`
        : `The subscription is ${subscription.status} and currently renews on ${subscription.currentPeriodEnd ? formatDateTime(subscription.currentPeriodEnd) : "not available yet"}.`,
    } as const;
  }

  if (latestFailure) {
    return {
      tone: "error-text",
      headline: "Latest renewal failed.",
      detail: `${latestFailure.summary} on ${formatDateTime(latestFailure.occurredAt)}. Stripe status is currently ${subscription.status}.`,
    } as const;
  }

  return {
    tone: "error-text",
    headline: "Billing needs attention.",
    detail: subscription.currentPeriodEnd
      ? `Current status is ${subscription.status}. Stripe says the current period ends on ${formatDateTime(subscription.currentPeriodEnd)}.`
      : `Current status is ${subscription.status}. No renewal date is currently stored.`,
  } as const;
};

export const AdminSubscriptionPanel = ({
  subscription,
  billingEvents,
  contractorId,
  isLoading,
  error,
  onRefresh,
}: AdminSubscriptionPanelProps) => {
  const [portalStatus, setPortalStatus] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"manage" | "cancel" | null>(null);
  const summary = billingSummary(subscription, billingEvents);

  const openPortal = async (flow: "manage" | "cancel") => {
    setActiveAction(flow);
    setPortalError(null);
    setPortalStatus(null);
    try {
      const session = await createBillingPortalSession({ contractorId, flow });
      window.location.href = session.url;
    } catch (actionError) {
      setPortalError(actionError instanceof Error ? actionError.message : "Unable to open Stripe billing portal.");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <section className="panel admin-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Subscription status</h2>
          <p>Contractors can manage billing in Stripe, and you can see whether monthly renewals actually succeeded.</p>
        </div>
        <button type="button" onClick={() => void onRefresh()} disabled={isLoading || activeAction !== null}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="panel-stack">
        <p className={summary.tone}>
          <strong>{summary.headline}</strong>
        </p>
        <p className="helper-text">{summary.detail}</p>

        {subscription ? (
          <div className="summary-box">
            <div>
              <span className="summary-label">Plan</span>
              <strong>{subscription.planCode}</strong>
            </div>
            <div>
              <span className="summary-label">Status</span>
              <strong>{subscription.status}</strong>
            </div>
            <div>
              <span className="summary-label">Renews</span>
              <strong>{subscription.currentPeriodEnd ? formatDateTime(subscription.currentPeriodEnd) : "Not available"}</strong>
            </div>
            <div>
              <span className="summary-label">Last Stripe sync</span>
              <strong>{formatDateTime(subscription.updatedAt)}</strong>
            </div>
          </div>
        ) : null}

        <div className="action-row">
          <button type="button" className="primary" onClick={() => void openPortal("manage")} disabled={!subscription || activeAction !== null}>
            {activeAction === "manage" ? "Opening..." : "Manage billing in Stripe"}
          </button>
          <button type="button" onClick={() => void openPortal("cancel")} disabled={!subscription || activeAction !== null}>
            {activeAction === "cancel" ? "Opening..." : "Cancel subscription"}
          </button>
        </div>

        {portalError ? <p className="error-text">{portalError}</p> : null}
        {portalStatus ? <p className="success-text">{portalStatus}</p> : null}

        <div className="billing-history">
          <div>
            <h3>Recent billing events</h3>
            <p className="helper-text">These come from Stripe webhooks and give you a real monthly audit trail.</p>
          </div>

          {billingEvents.length === 0 ? (
            <p className="helper-text">No billing events captured yet.</p>
          ) : (
            <div className="billing-event-list">
              {billingEvents.map((event) => (
                <article className="billing-event-card" key={event.id}>
                  <div className="billing-event-header">
                    <strong>{event.summary}</strong>
                    <span>{formatDateTime(event.occurredAt)}</span>
                  </div>
                  <div className="billing-event-meta">
                    <span>{event.eventType}</span>
                    <span>{event.invoiceStatus || "No invoice status"}</span>
                    <span>{formatMoney(event.amountPaid ?? event.amountDue, event.currency)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
