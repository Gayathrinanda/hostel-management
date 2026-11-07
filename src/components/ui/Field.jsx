export function Field({ label, htmlFor, error, hint, required, className = '', children }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field-required"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ error, className = '', ...props }) {
  return <input className={`input${error ? ' input-error' : ''} ${className}`.trim()} {...props} />;
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={`input${error ? ' input-error' : ''} ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`input${error ? ' input-error' : ''} ${className}`.trim()}
      {...props}
    />
  );
}

export function Checkbox({ label, description, className = '', ...props }) {
  return (
    <label className={`checkbox ${className}`.trim()}>
      <input type="checkbox" {...props} />
      <span className="checkbox-text">
        <span className="checkbox-label">{label}</span>
        {description ? <span className="field-hint">{description}</span> : null}
      </span>
    </label>
  );
}
