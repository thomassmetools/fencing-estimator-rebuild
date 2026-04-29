import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ForgotPasswordPage = () => {
  const { isConfigured, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setStatus("Password reset email sent. Open the link in your inbox to choose a new password.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send password reset email.");
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
        <p className="eyebrow">Password reset</p>
        <h1>Reset your password</h1>
        <p>Enter the contractor email and we’ll send a secure reset link.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          {status ? <p className="success-text">{status}</p> : null}
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset email"}
          </button>
          <Link className="button-link" to="/login">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
};

