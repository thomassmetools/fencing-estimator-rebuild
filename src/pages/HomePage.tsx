import type { ContractorRecord } from "../types";

interface HomePageProps {
  contractors: ContractorRecord[];
}

export const HomePage = ({ contractors }: HomePageProps) => {
  return (
    <main className="page-shell landing-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Fence estimator</p>
          <h1>Fast fence enquiries for contractors and customers.</h1>
          <p className="hero-text">
            Customers can measure their fence line, choose a product, and send the job details from one branded page.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-card-label">How it works</p>
          <ol>
            <li>
              Open a contractor estimator, like <code>/tasman-fencing</code>.
            </li>
            <li>
              Measure the fence line and choose a product.
            </li>
            <li>Send the enquiry so the contractor can follow up.</li>
          </ol>
        </div>
      </section>

      <section className="contractor-grid">
        {contractors.map((contractor) => (
          <article className="contractor-card" key={contractor.id}>
            <div>
              <p className="card-kicker">{contractor.branding.heroLabel}</p>
              <h2>{contractor.contact.businessName}</h2>
              <p>{contractor.branding.introText}</p>
            </div>
            <div className="card-links">
              <a href={`/${contractor.slug}`}>Open customer estimator</a>
              <a href={`/admin/${contractor.slug}`}>Open admin view</a>
            </div>
          </article>
        ))}
      </section>

      <section className="panel helper-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Hosted rollout</p>
            <h2>Next live step</h2>
            <p>
              Contractors can update their branding, products, contact details, and enquiry message from the admin area.
            </p>
          </div>
        </div>
        <div className="card-links">
          <a href="/login">Open contractor login</a>
        </div>
      </section>
    </main>
  );
};
