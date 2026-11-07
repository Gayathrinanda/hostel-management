export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {message ? <p className="empty-text">{message}</p> : null}
      {action}
    </div>
  );
}
