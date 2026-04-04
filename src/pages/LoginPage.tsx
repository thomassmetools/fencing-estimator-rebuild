import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const { isConfigured, isLoading, session, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = searchParams.get("next") || "/admin";

  if (session) {
    return <Navigate to={next} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
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
        <p>Use the Supabase user account linked to your contractor profile.</p>

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
          <button type="submit" className="primary" disabled={isSubmitting || isLoading}>
            {isSubmitting || isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
};
