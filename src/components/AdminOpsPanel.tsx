import { useCallback, useEffect, useState } from "react";
import type { ContractorOpsStatus } from "../types";
import { fetchContractorOpsStatus, sendContractorTestLeadEmail } from "../lib/repository";

interface AdminOpsPanelProps {
  contractorId: string;
}

export const AdminOpsPanel = ({ contractorId }: AdminOpsPanelProps) => {
  const [status, setStatus] = useState<ContractorOpsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextStatus = await fetchContractorOpsStatus(contractorId);
      setStatus(nextStatus);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load ops status.");
    } finally {
      setIsLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const sendTestEmail = async () => {
    setIsSendingTest(true);
    setError(null);
    setMessage(null);
    try {
      const response = await sendContractorTestLeadEmail(contractorId);
      setMessage(response.message);
      await loadStatus();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to send test email.");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <section className="panel admin-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Lead delivery health</h2>
          <p>Make sure the contractor can actually receive notifications before relying on the pipeline.</p>
        </div>
        <button type="button" onClick={() => void loadStatus()} disabled={isLoading || isSendingTest}>
          {isLoading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {status ? (
        <div className="panel-stack">
          <p className="helper-text">Lead email recipient: {status.contractorEmail || "No contractor email saved"}</p>
          <p className={status.leadEmailConfigured ? "success-text" : "error-text"}>
            {status.leadEmailConfigured ? "Lead notification email is configured." : "Lead notification email is not fully configured."}
          </p>
          <p className="helper-text">Resend secrets: {status.resendConfigured ? "Configured" : "Missing"}</p>
          <p className="helper-text">Turnstile: {status.turnstileConfigured ? "Configured" : "Missing"}</p>
        </div>
      ) : null}

      <div className="admin-footer">
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        <button type="button" className="primary" onClick={() => void sendTestEmail()} disabled={isLoading || isSendingTest}>
          {isSendingTest ? "Sending..." : "Send test lead email"}
        </button>
      </div>
    </section>
  );
};
