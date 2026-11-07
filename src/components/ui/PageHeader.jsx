import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, backTo, backLabel = 'Back' }) {
  return (
    <div className="page-header">
      <div>
        {backTo ? (
          <Link to={backTo} className="back-link">
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
