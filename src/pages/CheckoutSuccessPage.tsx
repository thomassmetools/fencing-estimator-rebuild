import { Link } from "react-router-dom";

export const CheckoutSuccessPage = () => {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card success-card">
        <p className="eyebrow">Payment received</p>
        <h1>Your estimator setup is underway</h1>
        <p>
          We've started provisioning your contractor account. The next step is to open the invite email and finish your
          onboarding details.
        </p>

        <div className="success-checklist">
          <div>
            <strong>1. Check your email</strong>
            <p>Look for the Supabase invite or setup link sent to the email used at checkout.</p>
          </div>
          <div>
            <strong>2. Open the setup link</strong>
            <p>You'll land on your welcome screen and be guided into onboarding.</p>
          </div>
          <div>
            <strong>3. Finish your branding and products</strong>
            <p>Once saved, your estimator will be ready to share from Facebook or your website.</p>
          </div>
        </div>

        <div className="action-row stretch">
          <Link className="button-link primary" to="/login?next=/welcome">
            Go to contractor login
          </Link>
          <Link className="button-link" to="/forgot-password">
            Reset password
          </Link>
        </div>

        <p className="helper-text">
          If the invite doesn't arrive within a few minutes, open contractor login and use the same checkout email to
          request a sign-in link.
        </p>
      </section>
    </main>
  );
};
