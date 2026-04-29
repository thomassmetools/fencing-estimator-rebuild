import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const { isConfigured, isLoading, session, sendMagicLink, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const next = searchParams.get("next") || "/admin";

  if (session) {
    return <Navigate to={next} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLinkMessage(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter the payment email or admin email first.");
      return;
    }

    setError(null);
    setLinkMessage(null);
    setIsSendingLink(true);

    try {
      await sendMagicLink(email, next);
      setLinkMessage("Setup link sent. Open the email inbox tied to this contractor account.");
    } catch (magicLinkError) {
      setError(magicLinkError instanceof Error ? magicLinkError.message : "Unable to send setup link.");
    } finally {
      setIsSendingLink(false);
    }
  };

  if (!isConfigured) {
    return (
      <main className="page-shell not-found-shell">
        <div className="empty-state">
          <h1>Supabase setup required</h1>
          <p>Add your Supabase project URL and anon key to enable contractor login.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Contractor sign in</p>
        <h1>Admin access</h1>
        <p>Use your password, request a sign-in link, or reset your password without needing manual help.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field-stack">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          {linkMessage ? <p className="success-text">{linkMessage}</p> : null}
          <button type="submit" className="primary" disabled={isSubmitting || isLoading}>
            {isSubmitting || isLoading ? "Signing in..." : "Sign in"}
          </button>
          <button type="button" onClick={() => void handleMagicLink()} disabled={isSendingLink || isLoading}>
            {isSendingLink ? "Sending setup link..." : "Email me a setup link"}
          </button>
          <Link className="button-link" to="/forgot-password">
            Forgot password?
          </Link>
        </form>
      </section>
    </main>
  );
};
