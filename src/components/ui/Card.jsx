export function Card({ title, subtitle, actions, children, className = '', bodyClassName = '', flush = false }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title || actions ? (
        <div className="card-header">
          <div>
            {title ? <h2 className="card-title">{title}</h2> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${flush ? 'card-body-flush' : 'card-body'} ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default', to }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-hint">{hint}</p>
      {to ? <span className="stat-corner" aria-hidden="true" /> : null}
    </div>
  );
}
