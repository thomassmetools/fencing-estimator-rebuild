import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ResetPasswordPage = () => {
  const { isConfigured, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await updatePassword(password);
      setStatus("Password updated. You can now return to the contractor login.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConfigured) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Supabase setup required</h1>
          <p>Add your Supabase project URL and anon key to enable password reset.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Choose a new password</p>
        <h1>Set your new password</h1>
        <p>Use the recovery link from your email, then choose a new password here.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>New password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label className="field-stack">
            <span>Confirm new password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          {status ? <p className="success-text">{status}</p> : null}
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save new password"}
          </button>
          <Link className="button-link" to="/login">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
};
