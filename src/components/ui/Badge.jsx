const TONES = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`badge ${TONES[tone] || TONES.neutral} ${className}`.trim()}>{children}</span>;
}

export function StatusBadge({ status }) {
  const map = {
    inside: { tone: 'success', label: 'Inside hostel' },
    outside: { tone: 'warning', label: 'Outside hostel' },
    active: { tone: 'success', label: 'Active' },
    inactive: { tone: 'neutral', label: 'Inactive' },
    paid: { tone: 'success', label: 'Paid' },
    pending: { tone: 'warning', label: 'Pending' },
    overdue: { tone: 'danger', label: 'Overdue' },
    open: { tone: 'success', label: 'Open' },
    closed: { tone: 'neutral', label: 'Closed' },
    'deadline-passed': { tone: 'warning', label: 'Deadline passed' },
  };
  const entry = map[status] || map.inactive;
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
