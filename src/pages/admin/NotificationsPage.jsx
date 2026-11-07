import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Select } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import { formatDate, formatDateTime } from '../../lib/dates';
import { buildAdminNotifications } from '../../lib/notifications';

const CATEGORY_LABELS = {
  rent: 'Rent',
  food: 'Food poll',
  hosteller: 'Hostellers',
  outing: 'In/Out',
};

const SEVERITY_TONES = { danger: 'danger', warning: 'warning', info: 'info' };

export default function NotificationsPage() {
  const { db, dismissNotification, dismissAllNotifications } = useData();
  const toast = useToast();
  const now = useNow(60000);
  const [category, setCategory] = useState('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const notifications = buildAdminNotifications(db, now);
  const dismissed = new Set(db.dismissedNotifications || []);
  const unread = notifications.filter((notification) => !dismissed.has(notification.id));

  const visible = notifications.filter((notification) => {
    const matchesCategory = category === 'all' || notification.category === category;
    const matchesDismissed = showDismissed || !dismissed.has(notification.id);
    return matchesCategory && matchesDismissed;
  });

  const markAllRead = () => {
    if (!unread.length) return;
    dismissAllNotifications(unread.map((notification) => notification.id));
    toast.success(`${unread.length} notification${unread.length === 1 ? '' : 's'} marked as read.`);
  };

  const undoVisibility = () => {
    setShowDismissed((current) => !current);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Rent reminders, overdue alerts, food poll deadlines and movement updates generated from live data."
        actions={
          <Button variant="secondary" onClick={markAllRead} disabled={!unread.length}>
            Mark all as read
          </Button>
        }
      />

      <Card>
        <div className="toolbar">
          <Field label="Filter by category" htmlFor="notification-category">
            <Select
              id="notification-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All notifications</option>
              <option value="rent">Rent reminders</option>
              <option value="food">Food poll</option>
              <option value="hosteller">Hostellers</option>
              <option value="outing">In/Out movements</option>
            </Select>
          </Field>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <span className="small muted">
              {unread.length} unread · {notifications.length} total
            </span>
            <Button size="sm" variant="ghost" onClick={undoVisibility}>
              {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        className=""
        flush
        title="Alert feed"
        subtitle="Notifications recalculate automatically when rent payments, polls or movements change."
      >
        {visible.length ? (
          <div>
            {visible.map((notification) => {
              const isRead = dismissed.has(notification.id);
              return (
                <div
                  className={`notification-item${isRead ? '' : ' unread'}`}
                  key={notification.id}
                >
                  <span className={`notification-dot ${notification.severity}`} />
                  <div className="notification-body">
                    <div className="spread">
                      <p className="notification-title">{notification.title}</p>
                      <Badge tone={SEVERITY_TONES[notification.severity] || 'neutral'}>
                        {CATEGORY_LABELS[notification.category] || 'Update'}
                      </Badge>
                    </div>
                    <p className="notification-text">{notification.message}</p>
                    <div className="notification-meta">
                      <span>{formatDateTime(notification.createdAt)}</span>
                      <span>
                        <Link to={notification.link}>Open related page</Link>
                      </span>
                      {!isRead ? (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          Mark as read
                        </button>
                      ) : (
                        <span>Read</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="You are all caught up"
            message={
              category === 'all'
                ? 'Rent reminders and poll alerts will appear here when they need your attention.'
                : 'No notifications in this category right now.'
            }
            action={
              category !== 'all' ? (
                <Button size="sm" variant="secondary" onClick={() => setCategory('all')}>
                  Show all notifications
                </Button>
              ) : null
            }
          />
        )}
      </Card>

      <p className="small muted" style={{ marginTop: 14 }}>
        Last calculated {formatDate(now)} at{' '}
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Notifications are
        derived from rent due dates, open outings and food poll deadlines — nothing is hardcoded.
      </p>
    </>
  );
}
