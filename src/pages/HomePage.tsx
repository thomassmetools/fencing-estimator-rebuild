import type { ContractorRecord } from "../types";

interface HomePageProps {
  contractors: ContractorRecord[];
}

const stripeCheckoutUrl = "https://buy.stripe.com/9B600kgBn8fy5Tp1sSdAk01";

export const HomePage = ({ contractors }: HomePageProps) => {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-nav">
        <div className="nav-brand">
          <p className="eyebrow">Tradies Tools</p>
          <strong>More quotes. Less wasted measuring.</strong>
        </div>
        <div className="landing-nav-actions">
          <a className="button-link" href="/admin">
            Contractor login
          </a>
        </div>
      </section>

      <section className="hero-panel landing-hero">
        <div className="hero-copy landing-copy">
          <p className="eyebrow">For small fencing contractors</p>
          <h1>Stop wasting time driving out to measure jobs that do not convert.</h1>
          <p className="hero-text">
            Let customers measure the fence line first. See the job size before you quote. Filter out time-wasters and
            get to the good jobs faster.
          </p>

          <div className="hero-checklist">
            <p>Know job size before you quote</p>
            <p>Reduce wasted site visits</p>
            <p>Reply faster with better leads</p>
          </div>

          <p className="hero-support-text">
            Customers send the measurement, product selected, and contact details before you quote.
          </p>

          <div className="price-strip">
            <strong>$7.50/month</strong>
            <span>No contracts</span>
          </div>

          <div className="action-row hero-actions">
            <a className="button-link primary" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
              Start for $7.50/month
            </a>
            <a className="button-link" href="/admin">
              Already a customer? Contractor login
            </a>
          </div>

          <p className="helper-text">
            {contractors.length > 0
              ? `${contractors.length} contractor workspace${contractors.length === 1 ? "" : "s"} currently active in this environment.`
              : "After checkout, you get your own customer page and contractor admin login."}
          </p>
        </div>

        <div className="hero-card demo-card">
          <p className="hero-card-label">What the customer sends you</p>
          <div className="map-demo">
            <div className="map-demo-grid" aria-hidden="true">
              <span className="map-line map-line-a" />
              <span className="map-line map-line-b" />
              <span className="map-point map-point-a" />
              <span className="map-point map-point-b" />
              <span className="map-point map-point-c" />
            </div>
            <div className="map-demo-card">
              <strong>Fence run measured</strong>
              <p>32.4m boundary line</p>
            </div>
            <div className="map-demo-card">
              <strong>Customer ready to quote</strong>
              <p>Contact details, product selected, and site notes included</p>
            </div>
          </div>
          <p className="helper-text hero-card-note">
            Customers measure it on the map before they ask you to quote.
          </p>
        </div>
      </section>

      <section className="value-grid">
        <article className="panel value-panel">
          <p className="eyebrow">Step 1</p>
          <h2>Share your link</h2>
          <p className="helper-text">Post it on Facebook, send it in Messenger, or add it to your website.</p>
        </article>
        <article className="panel value-panel">
          <p className="eyebrow">Step 2</p>
          <h2>Let customers measure it</h2>
          <p className="helper-text">They map the fence line and send through the size before you spend time on it.</p>
        </article>
        <article className="panel value-panel">
          <p className="eyebrow">Step 3</p>
          <h2>Quote faster</h2>
          <p className="helper-text">You get the job size first, so you can decide who is worth following up.</p>
        </article>
      </section>

      <section className="proof-strip">
        <article className="proof-card">
          <strong>Built for owner-operators</strong>
          <p>No big system to learn. Just a simple way to pre-qualify fencing jobs.</p>
        </article>
        <article className="proof-card">
          <strong>Simple monthly pricing</strong>
          <p>$7.50/month with no contract makes it an easy yes for small contractors.</p>
        </article>
        <article className="proof-card">
          <strong>One clear action</strong>
          <p>Buy it, get set up, and start using it in your Facebook and Messenger replies.</p>
        </article>
      </section>

      <section className="panel cta-panel">
        <div>
          <p className="eyebrow">Stop wasting time measuring every job</p>
          <h2>Start for $7.50/month</h2>
          <p className="helper-text">
            Use it to filter out time-wasters, cut down site visits, and see job size before you quote.
          </p>
          <p className="helper-text">
            Each enquiry includes the measurement, product selected, and customer contact details.
          </p>
        </div>
        <a className="button-link primary cta-button" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
          Buy now through Stripe
        </a>
      </section>

      <section className="panel helper-panel portal-section">
        <div className="panel-header compact portal-header-row">
          <div>
            <p className="eyebrow">Contractor access</p>
            <h2>Easy admin login</h2>
            <p>Keep the sales page focused on buying. Existing customers can use the contractor login button.</p>
          </div>
        </div>
        <div className="portal-plan-grid">
          <article className="portal-plan-card">
            <strong>Best option</strong>
            <p>Use a clear contractor login link, not a big login form on the homepage.</p>
          </article>
          <article className="portal-plan-card">
            <strong>What they see</strong>
            <p>After sign-in, they land on their own admin portal or choose from the accounts linked to that email.</p>
          </article>
          <article className="portal-plan-card">
            <strong>Why it works</strong>
            <p>It keeps the page simple for buyers and still makes admin access easy for existing customers.</p>
          </article>
        </div>
        <div className="card-links">
          <a href="/admin">Contractor login</a>
        </div>
      </section>
    </main>
  );
};
