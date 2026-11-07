import { Link } from 'react-router-dom';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import useNow from '../../hooks/useNow';
import {
  formatDate,
  formatDuration,
  formatTime,
  formatWeekday,
  timeAgo,
  toDateInput,
} from '../../lib/dates';
import { currentPoll, getPollStats, isPollLocked, pollWeekLabel } from '../../lib/food';
import { buildAdminNotifications } from '../../lib/notifications';
import { rentSummary } from '../../lib/rent';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminDashboard() {
  const { db } = useData();
  const { user } = useAuth();
  const now = useNow(30000);

  const activeHostellers = db.hostellers.filter((hosteller) => hosteller.active);
  const inactiveCount = db.hostellers.length - activeHostellers.length;
  const activeOutings = db.outings.filter((outing) => !outing.inAt);
  const outsideIds = new Set(activeOutings.map((outing) => outing.hostellerId));
  const insideCount = activeHostellers.filter((hosteller) => !outsideIds.has(hosteller.id)).length;
  const today = toDateInput(now);
  const todaysOutings = db.outings.filter((outing) => toDateInput(outing.outAt) === today);

  const summaries = activeHostellers.map((hosteller) => ({
    hosteller,
    summary: rentSummary(hosteller, db.rentPayments, now),
  }));
  const pendingRent = summaries.filter((item) => item.summary.pending > 0);
  const pendingTotal = pendingRent.reduce((total, item) => total + item.summary.pending, 0);
  const overdue = pendingRent.filter((item) => item.summary.status === 'overdue');
  const dueSoon = pendingRent.filter(
    (item) => item.summary.daysUntilDue >= 0 && item.summary.daysUntilDue <= 7,
  );
  const reminders = [...pendingRent].sort(
    (a, b) => a.summary.daysUntilDue - b.summary.daysUntilDue,
  );

  const notifications = buildAdminNotifications(db, now);
  const dismissed = new Set(db.dismissedNotifications || []);
  const unreadNotifications = notifications.filter((item) => !dismissed.has(item.id));

  const poll = currentPoll(db.foodPolls, now);
  const pollStats = getPollStats(poll, db.foodSelections, db.hostellers);
  const todayRow = pollStats.rows.find((row) => row.date === today) || pollStats.rows[0] || null;

  const hostellerName = (id) =>
    db.hostellers.find((hosteller) => hosteller.id === id)?.fullName || 'Former hosteller';

  const activity = [
    ...db.outings.map((outing) => ({
      id: `out-${outing.id}`,
      at: outing.outAt,
      who: hostellerName(outing.hostellerId),
      text: 'Clocked out of the hostel',
    })),
    ...db.outings
      .filter((outing) => outing.inAt)
      .map((outing) => ({
        id: `in-${outing.id}`,
        at: outing.inAt,
        who: hostellerName(outing.hostellerId),
        text: 'Clocked back in to the hostel',
      })),
    ...db.rentPayments.map((payment) => ({
      id: `pay-${payment.id}`,
      at: payment.createdAt || payment.date,
      who: hostellerName(payment.hostellerId),
      text: `Rent payment of ${money(payment.amount)} recorded`,
    })),
    ...db.hostellers
      .filter((hosteller) => now.getTime() - new Date(hosteller.createdAt).getTime() < 30 * 86400000)
      .map((hosteller) => ({
        id: `new-${hosteller.id}`,
        at: hosteller.createdAt,
        who: hosteller.fullName,
        text: 'Hosteller profile created',
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Admin'}`}
        subtitle="A snapshot of hostellers, movements, meals and rent for today."
        actions={
          <>
            <Link className="btn btn-secondary" to="/admin/hostellers/new">
              Add hosteller
            </Link>
            <Link className="btn btn-primary" to="/admin/rent">
              Record rent payment
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Total Hostellers"
          value={db.hostellers.length}
          hint={`${activeHostellers.length} active · ${inactiveCount} inactive profiles kept`}
        />
        <StatCard
          label="Currently Inside"
          value={insideCount}
          hint="Active hostellers in the hostel"
          tone="success"
        />
        <StatCard
          label="Currently Outside"
          value={activeOutings.length}
          hint="Open outings in progress"
          tone="warning"
        />
        <StatCard
          label="Today's Outings"
          value={todaysOutings.length}
          hint="Clock-outs recorded today"
          tone="info"
        />
        <StatCard
          label="Rent Payments Pending"
          value={pendingRent.length}
          hint={`${money(pendingTotal)} outstanding`}
          tone="danger"
        />
        <StatCard
          label="Upcoming Rent Due Dates"
          value={dueSoon.length}
          hint="Due in the next 7 days"
          tone="warning"
        />
      </div>

      <div className="grid-main-side" style={{ marginTop: 18 }}>
        <div className="stack">
          <Card
            title="Rent reminders"
            subtitle={
              overdue.length
                ? `${overdue.length} overdue · ${dueSoon.length} due within 7 days`
                : `${dueSoon.length} hostellers due within 7 days`
            }
            actions={
              <Link className="btn-link" to="/admin/rent">
                Open rent management
              </Link>
            }
            flush
          >
            {reminders.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hosteller</th>
                      <th>Room</th>
                      <th>Pending</th>
                      <th>Due date</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.slice(0, 6).map(({ hosteller, summary }) => (
                      <tr key={hosteller.id}>
                        <td>
                          <Link to={`/admin/hostellers/${hosteller.id}`} className="cell-strong">
                            {hosteller.fullName}
                          </Link>
                        </td>
                        <td>{hosteller.roomNumber}</td>
                        <td className="num">{money(summary.pending)}</td>
                        <td className="num">
                          {formatDate(summary.dueDate)}
                          <div className="cell-muted">
                            {summary.daysUntilDue === 0
                              ? 'Due today'
                              : summary.daysUntilDue > 0
                                ? `In ${summary.daysUntilDue} day${summary.daysUntilDue === 1 ? '' : 's'}`
                                : `${Math.abs(summary.daysUntilDue)} days overdue`}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={summary.status} />
                        </td>
                        <td>
                          <Link className="btn btn-secondary btn-sm" to="/admin/rent">
                            Record
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No pending rent"
                message="Every active hosteller has paid for the current cycle."
              />
            )}
          </Card>

          <Card
            title="Recent hostel activity"
            subtitle="Clock movements, rent payments and new profiles"
            flush
          >
            {activity.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Hosteller</th>
                      <th>Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((item) => (
                      <tr key={item.id}>
                        <td className="nowrap cell-muted" title={formatDate(item.at)}>
                          {timeAgo(item.at, now)}
                        </td>
                        <td className="cell-strong">{item.who}</td>
                        <td>{item.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                message="Clock in/out events and rent payments will appear here."
              />
            )}
          </Card>
        </div>

        <div className="stack">
          <Card
            title="Currently outside"
            subtitle={`${activeOutings.length} hosteller${activeOutings.length === 1 ? '' : 's'} away`}
            actions={
              <Link className="btn-link" to="/admin/tracking">
                Track
              </Link>
            }
            flush
          >
            {activeOutings.length ? (
              <div>
                {activeOutings.map((outing) => {
                  const hosteller = db.hostellers.find((item) => item.id === outing.hostellerId);
                  if (!hosteller) return null;
                  return (
                    <div className="notification-item" key={outing.id}>
                      <span className="notification-dot warning" />
                      <div className="notification-body">
                        <p className="notification-title">{hosteller.fullName}</p>
                        <p className="notification-text">
                          Room {hosteller.roomNumber} · out at {formatTime(outing.outAt)} ·{' '}
                          {formatDuration(now.getTime() - new Date(outing.outAt).getTime())} outside
                        </p>
                        <div className="notification-meta">
                          <Link to="/admin/tracking">View location</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Everyone is inside" message="No hosteller is currently outside." />
            )}
          </Card>

          <Card
            title="Today's food requirements"
            subtitle={poll ? `Week ${pollWeekLabel(poll)}` : 'No food poll scheduled'}
            actions={
              <Link className="btn-link" to="/admin/food">
                Manage
              </Link>
            }
          >
            {poll && todayRow ? (
              <div className="stack-sm">
                <div className="spread">
                  <span className="cell-strong">
                    {formatWeekday(todayRow.date)}, {formatDate(todayRow.date)}
                  </span>
                  {isPollLocked(poll, now) ? (
                    <Badge tone="neutral">Closed</Badge>
                  ) : (
                    <Badge tone="success">Accepting responses</Badge>
                  )}
                </div>
                <dl className="info-list">
                  <div className="info-row">
                    <dt>Breakfast</dt>
                    <dd>{todayRow.breakfastCount} people</dd>
                  </div>
                  <div className="info-row">
                    <dt>Lunch</dt>
                    <dd>{todayRow.lunchCount} people</dd>
                  </div>
                  <div className="info-row">
                    <dt>Dinner</dt>
                    <dd>{todayRow.dinnerCount} people</dd>
                  </div>
                </dl>
                <div>
                  <div className="spread small muted" style={{ marginBottom: 6 }}>
                    <span>
                      {pollStats.submittedCount} of {pollStats.eligibleCount} hostellers submitted
                    </span>
                    <span>{pollStats.totals.meals} meals this week</span>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${
                          pollStats.eligibleCount
                            ? Math.min(100, (pollStats.submittedCount / pollStats.eligibleCount) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No active food poll"
                message="Create a weekly poll to start collecting meal requirements."
                action={
                  <Link className="btn btn-secondary btn-sm" to="/admin/food">
                    Create food poll
                  </Link>
                }
              />
            )}
          </Card>

          <Card
            title="Notifications"
            subtitle={`${unreadNotifications.length} unread alert${unreadNotifications.length === 1 ? '' : 's'}`}
            actions={
              <Link className="btn-link" to="/admin/notifications">
                View all
              </Link>
            }
            flush
          >
            {unreadNotifications.length ? (
              <div>
                {unreadNotifications.slice(0, 3).map((notification) => (
                  <div className="notification-item" key={notification.id}>
                    <span className={`notification-dot ${notification.severity}`} />
                    <div className="notification-body">
                      <p className="notification-title">{notification.title}</p>
                      <p className="notification-text">{notification.message}</p>
                      <div className="notification-meta">
                        <span>{formatDate(notification.createdAt)}</span>
                        <Link to={notification.link}>Open</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No new notifications"
                message="Rent, food poll and movement alerts appear here automatically."
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
