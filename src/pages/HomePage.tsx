import type { ContractorRecord } from "../types";

interface HomePageProps {
  contractors: ContractorRecord[];
}

export const HomePage = ({ contractors }: HomePageProps) => {
  return (
    <main className="page-shell landing-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Hosted estimator starter</p>
          <h1>One app, many contractors, ready for Facebook traffic and website embeds.</h1>
          <p className="hero-text">
            This scaffold keeps the public experience focused on measuring, selecting products, and copying a clean
            result message. Each contractor gets their own branded URL and admin screen.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-card-label">Recommended rollout</p>
          <ol>
            <li>
              Use a public route per contractor, like <code>/tasman-fencing</code>.
            </li>
            <li>
              Use <code>/admin/tasman-fencing</code> for product and branding updates.
            </li>
            <li>Replace local storage with Supabase once the flows are approved.</li>
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
              Once Supabase is configured, the admin links will require login and the public contractor pages will read
              live settings from your hosted database.
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
