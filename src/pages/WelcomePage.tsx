import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const WelcomePage = () => {
  const { session, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  if (!isLoading && !session) {
    return <Navigate to="/login?next=/welcome" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updatePassword(password);
      setPasswordSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to set password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Welcome</p>
        <h1>Your estimator is almost ready</h1>

        {passwordSaved ? (
          <>
            <p>Password saved. Head into onboarding to finish your setup.</p>
            <div className="auth-form">
              <Link className="button-link primary" to="/onboarding">
                Start onboarding
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>First, set a password so you can log back in any time.</p>
            <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
              <label className="field-stack">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label className="field-stack">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              <button type="submit" className="primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Set password and continue"}
              </button>
              <Link className="button-link" to="/onboarding">
                Skip — I'll use email links
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
};
