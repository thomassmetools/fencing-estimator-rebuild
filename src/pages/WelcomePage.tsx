import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const WelcomePage = () => {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Navigate to="/login?next=/welcome" replace />;
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Welcome</p>
        <h1>Your estimator is almost ready</h1>
        <p>
          Payment is the trigger to create the contractor account shell. The next step is onboarding: business details,
          branding, and the first product set.
        </p>
        <div className="auth-form">
          <Link className="button-link primary" to="/onboarding">
            Start onboarding
          </Link>
          <Link className="button-link" to="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
};
