import config from "@/business.config";

/** Header and footer shared by every customer page. */
export default function Chrome({ children }: { children: React.ReactNode }) {
  const b = config.business;
  return (
    <div className="shell">
      <nav className="topbar">
        <a href="/" className="wordmark">
          {b.name}
        </a>
        <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="toplink">
          {b.phone}
        </a>
      </nav>
      <main>{children}</main>
      <footer className="footer">
        <span>{b.address}</span>
        <span>
          <a href={`mailto:${b.email}`}>{b.email}</a>
          {b.website && (
            <>
              {", "}
              <a href={b.website}>{b.website.replace(/^https?:\/\//, "")}</a>
            </>
          )}
        </span>
      </footer>
    </div>
  );
}
