import type { ContractorRecord } from "../types";

interface HomePageProps {
  contractors: ContractorRecord[];
}

const stripeCheckoutUrl = "https://buy.stripe.com/6oU7sMetfbrK2Hd7RgdAk02";

export const HomePage = ({ contractors }: HomePageProps) => {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-nav">
        <a className="nav-brand" href="/" aria-label="Tradies Tools home">
          <span className="nav-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <rect width="32" height="32" rx="7" fill="#1d4f41"/>
              <rect x="5"  y="9"  width="3.5" height="15" rx="1.5" fill="#f4b400"/>
              <rect x="14" y="9"  width="3.5" height="15" rx="1.5" fill="#f4b400"/>
              <rect x="23" y="9"  width="3.5" height="15" rx="1.5" fill="#f4b400"/>
              <rect x="5"  y="12" width="22"  height="3"  rx="1.5" fill="#fff9ef"/>
              <rect x="5"  y="18" width="22"  height="3"  rx="1.5" fill="#fff9ef"/>
            </svg>
          </span>
          <div>
            <strong className="nav-wordmark">Tradies Tools</strong>
            <span className="nav-tagline">More quotes. Less wasted measuring.</span>
          </div>
        </a>
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
            <strong>$29/month AUD</strong>
            <span>14-day free trial</span>
          </div>

          <div className="action-row hero-actions">
            <a className="button-link primary" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
              Start free for 14 days
            </a>
            <a className="button-link" href="/admin">
              Already a customer? Contractor login
            </a>
          </div>

          <p className="helper-text">
            {contractors.length > 0
              ? `${contractors.length} fencing contractor${contractors.length === 1 ? "" : "s"} already using Tradies Tools.`
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
          <p>14-day free trial, then $29/month AUD. No contract, cancel any time.</p>
        </article>
        <article className="proof-card">
          <strong>One clear action</strong>
          <p>Start a free trial, get set up, and start using it in your Facebook and Messenger replies.</p>
        </article>
      </section>

      <section className="panel cta-panel">
        <div>
          <p className="eyebrow">Stop wasting time measuring every job</p>
          <h2>Try it free for 14 days</h2>
          <p className="helper-text">
            Use it to filter out time-wasters, cut down site visits, and see job size before you quote.
          </p>
          <p className="helper-text">
            $29/month AUD after the trial. No contracts — cancel any time.
          </p>
        </div>
        <a className="button-link primary cta-button" href={stripeCheckoutUrl} target="_self" rel="noreferrer">
          Start free trial
        </a>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <p className="eyebrow">Tradies Tools</p>
          <p className="footer-tagline">More quotes. Less wasted measuring.</p>
        </div>
        <div className="footer-links">
          <a href="/admin">Contractor login</a>
          <a href={stripeCheckoutUrl}>Start free trial</a>
          <a href="mailto:hello@tradiestools.co.nz">hello@tradiestools.co.nz</a>
        </div>
        <div className="footer-legal">
          <p>© {new Date().getFullYear()} Tradies Tools. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
};
