import type { ContractorRecord } from "../types";

interface HomePageProps {
  contractors: ContractorRecord[];
}

const stripeCheckoutUrl = "https://buy.stripe.com/test_7sYcN7aYNcXYdK4f6l9bO02";

export const HomePage = ({ contractors }: HomePageProps) => {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-nav">
        <div className="nav-brand">
          <p className="eyebrow">Tradies Tools</p>
          <strong>Fence Estimator Package</strong>
        </div>
        <div className="landing-nav-actions">
          <a className="button-link" href="/admin">
            Contractor login
          </a>
          <a className="button-link primary" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
            Buy now
          </a>
        </div>
      </section>

      <section className="hero-panel landing-hero">
        <div className="hero-copy landing-copy">
          <p className="eyebrow">Built for fence contractors</p>
          <h1>Turn Facebook messages and quote requests into measured fence leads.</h1>
          <p className="hero-text">
            Sell a hosted estimator your customers can use on their phone, then manage branding, products, and incoming
            enquiries from one admin portal.
          </p>
          <div className="hero-points">
            <div>
              <strong>Customers self-measure</strong>
              <p>They map the fence line, choose a product, and send the job details in minutes.</p>
            </div>
            <div>
              <strong>You stay on-brand</strong>
              <p>Each contractor gets a branded estimator page and admin area ready to share.</p>
            </div>
            <div>
              <strong>You close faster</strong>
              <p>Leads arrive with measurements, contact details, and product context already attached.</p>
            </div>
          </div>
          <div className="action-row">
            <a className="button-link primary" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
              Purchase the package
            </a>
            <a className="button-link" href="/admin">
              Already a customer? Log in
            </a>
          </div>
          <p className="helper-text">
            {contractors.length > 0
              ? `${contractors.length} estimator workspace${contractors.length === 1 ? "" : "s"} currently available in this environment.`
              : "Your estimator is provisioned after purchase and finished during onboarding."}
          </p>
        </div>
        <div className="hero-card pricing-card">
          <p className="hero-card-label">Package CTA</p>
          <h2>Hosted fence estimator</h2>
          <p>
            One purchase gets the contractor portal, onboarding flow, branded public estimator, and lead capture setup.
          </p>
          <ul className="feature-list">
            <li>Hosted customer estimator page</li>
            <li>Contractor admin portal</li>
            <li>Lead capture with measurements</li>
            <li>Branding and product setup</li>
          </ul>
          <a className="button-link primary full-width-button" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
            Buy through Stripe
          </a>
          <p className="helper-text">Checkout is handled securely by Stripe.</p>
        </div>
      </section>

      <section className="value-grid">
        <article className="panel">
          <p className="eyebrow">What customers do</p>
          <h2>Measure, choose, submit</h2>
          <p className="helper-text">
            Customers open the estimator, draw the fence line on the map, select a fence option, and send the lead.
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">What contractors get</p>
          <h2>One place to manage everything</h2>
          <p className="helper-text">
            Update products, branding, messaging, and review fresh leads from a simple admin workspace.
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">How it goes live</p>
          <h2>Checkout to onboarding</h2>
          <p className="helper-text">
            Purchase through Stripe, finish setup, and start sharing the estimator link across Facebook and your website.
          </p>
        </article>
      </section>

      <section className="panel helper-panel portal-section">
        <div className="panel-header compact portal-header-row">
          <div>
            <p className="eyebrow">Contractor access</p>
            <h2>Make admin portals easy to find</h2>
            <p>
              Keep the landing page focused on buying, then give existing customers one obvious path into admin.
            </p>
          </div>
        </div>
        <div className="portal-plan-grid">
          <article className="portal-plan-card">
            <strong>Best default</strong>
            <p>Use a clear “Contractor login” button in the header and route it to `/admin`.</p>
          </article>
          <article className="portal-plan-card">
            <strong>What happens next</strong>
            <p>After sign-in, contractors now land on their own portal picker instead of needing to remember a slug.</p>
          </article>
          <article className="portal-plan-card">
            <strong>Why not a homepage login box</strong>
            <p>A visible login button is cleaner for conversion and keeps the public page focused on the purchase CTA.</p>
          </article>
        </div>
        <div className="card-links">
          <a href="/admin">Open contractor login</a>
          <a href="/portal">Open portal finder</a>
        </div>
      </section>
    </main>
  );
};
