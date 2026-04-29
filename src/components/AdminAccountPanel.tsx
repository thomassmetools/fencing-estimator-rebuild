import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

interface AdminAccountPanelProps {
  email: string;
}

export const AdminAccountPanel = ({ email }: AdminAccountPanelProps) => {
  const { requestPasswordReset, sendMagicLink, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"magic" | "reset" | "password" | null>(null);

  const sendAccessLink = async () => {
    setActiveAction("magic");
    setError(null);
    setStatus(null);
    try {
      await sendMagicLink(email, "/admin");
      setStatus("Sign-in link sent to the contractor email.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to send sign-in link.");
    } finally {
      setActiveAction(null);
    }
  };

  const sendPasswordReset = async () => {
    setActiveAction("reset");
    setError(null);
    setStatus(null);
    try {
      await requestPasswordReset(email);
      setStatus("Password reset email sent.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to send password reset email.");
    } finally {
      setActiveAction(null);
    }
  };

  const savePassword = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setActiveAction("password");
    setError(null);
    setStatus(null);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      setStatus("Password updated.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update password.");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <section className="panel admin-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Account access</p>
          <h2>Login and recovery</h2>
          <p>Contractors can recover access themselves without needing manual help from you.</p>
        </div>
      </div>

      <div className="panel-stack">
        <p className="helper-text">Contractor email: {email || "No email saved yet"}</p>
        <div className="action-row">
          <button type="button" onClick={() => void sendAccessLink()} disabled={!email || activeAction !== null}>
            {activeAction === "magic" ? "Sending..." : "Email sign-in link"}
          </button>
          <button type="button" onClick={() => void sendPasswordReset()} disabled={!email || activeAction !== null}>
            {activeAction === "reset" ? "Sending..." : "Email password reset"}
          </button>
        </div>

        <label className="field-stack">
          <span>New password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Confirm new password</span>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
      </div>

      <div className="admin-footer">
        {error ? <p className="error-text">{error}</p> : null}
        {status ? <p className="success-text">{status}</p> : null}
        <button type="button" className="primary" onClick={() => void savePassword()} disabled={activeAction !== null}>
          {activeAction === "password" ? "Saving..." : "Update password"}
        </button>
      </div>
    </section>
  );
};

