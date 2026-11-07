import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatLiveClock,
  formatTime,
} from '../../lib/dates';
import { currentPoll, isPollLocked, pollWeekLabel, selectionFor } from '../../lib/food';
import { buildHostellerNotifications } from '../../lib/notifications';
import { advanceBalance, rentSummary } from '../../lib/rent';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function GoogleMapLink({ lat, lng }) {
  if (lat === null || lat === undefined) return <span className="cell-muted">Not captured</span>;
  return (
    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
      View map
    </a>
  );
}

export default function HostellerHome() {
  const { user } = useAuth();
  const { db, clockOut, clockIn } = useData();
  const toast = useToast();
  const now = useNow(1000);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationRequestRef = useRef(null);
  const locationTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    },
    [],
  );

  const hosteller = user;
  if (!hosteller) return null;

  const activeOuting = db.outings.find(
    (outing) => outing.hostellerId === hosteller.id && !outing.inAt,
  );
  const myOutings = db.outings
    .filter((outing) => outing.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.outAt).getTime() - new Date(a.outAt).getTime());

  const summary = rentSummary(hosteller, db.rentPayments, now);
  const advance = advanceBalance(hosteller.id, db.advancePayments);
  const poll = currentPoll(db.foodPolls, now);
  const selection = poll
    ? db.foodSelections.find(
        (item) => item.pollId === poll.id && item.hostellerId === hosteller.id,
      )
    : null;
  const mealTotals = selectionFor(selection);
  const notifications = buildHostellerNotifications(db, hosteller, now);
  const clock = formatLiveClock(now);

  const stopLocating = () => {
    if (locationTimerRef.current) {
      clearTimeout(locationTimerRef.current);
      locationTimerRef.current = null;
    }
    locationRequestRef.current = null;
    setLocating(false);
  };

  const requestClockOut = async () => {
    if (activeOuting) {
      toast.error('You are already clocked out. Clock in before starting another outing.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError(
        'This browser does not support location capture. Clock out requires your current location, so it cannot be recorded.',
      );
      return;
    }

    setLocationError('');
    setLocating(true);

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          stopLocating();
          setLocationError(
            'Location permission is blocked for this site. Allow location access in your browser settings and retry.',
          );
          return;
        }
      } catch (error) {
        // The Permissions API cannot report geolocation here; continue with the request.
      }
    }

    const requestId = Date.now();
    locationRequestRef.current = requestId;
    locationTimerRef.current = setTimeout(() => {
      if (locationRequestRef.current !== requestId) return;
      locationRequestRef.current = null;
      locationTimerRef.current = null;
      setLocating(false);
      setLocationError(
        'The location request did not return a result. Check your browser location settings and retry.',
      );
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestRef.current !== requestId) return;
        stopLocating();
        const result = clockOut(hosteller.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success('Clocked out. Your outing time and location were saved.');
      },
      (error) => {
        if (locationRequestRef.current !== requestId) return;
        stopLocating();
        const messages = {
          1: 'Location permission was denied. Allow location access for this site in your browser settings, then retry.',
          2: 'Your location could not be determined right now. Move to an open area and retry.',
          3: 'The location request timed out. Please retry.',
        };
        setLocationError(messages[error.code] || 'Unable to capture your location. Please retry.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleClockIn = () => {
    const result = clockIn(hosteller.id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      `Welcome back! Recorded your return after ${formatDuration(result.outing.durationMs)}.`,
    );
  };

  return (
    <>
      <PageHeader
        title={`Welcome back, ${hosteller.fullName.split(' ')[0]}`}
        subtitle={`Room ${hosteller.roomNumber} · Bed ${hosteller.bedNumber} · Joined ${formatDate(
          hosteller.joinDate,
        )}`}
        actions={<StatusBadge status={activeOuting ? 'outside' : 'inside'} />}
      />

      <div className="stat-grid">
        <StatCard
          label="Monthly Rent"
          value={money(summary.rent)}
          hint={`${summary.periodLabel} cycle`}
        />
        <StatCard
          label="Rent Pending"
          value={money(summary.pending)}
          hint={
            summary.pending === 0
              ? 'Settled for this cycle'
              : summary.status === 'overdue'
                ? `Overdue since ${formatDate(summary.dueDate)}`
                : `Due on ${formatDate(summary.dueDate)}`
          }
          tone={summary.status === 'paid' ? 'success' : summary.status === 'overdue' ? 'danger' : 'warning'}
        />
        <StatCard
          label="Advance / Deposit"
          value={money(advance)}
          hint="Held by the hostel, separate from rent"
          tone="info"
        />
        <StatCard
          label="Washing Machine"
          value={hosteller.washingMachine?.enabled ? money(hosteller.washingMachine.amount) : 'Not subscribed'}
          hint={
            hosteller.washingMachine?.enabled
              ? `Monthly · since ${formatDate(hosteller.washingMachine.startDate)}`
              : 'No subscription on your profile'
          }
        />
      </div>

      <div className="grid-main-side" style={{ marginTop: 18 }}>
        <div className="stack">
          <Card title="In / Out status" className="clock-card">
            <div className="clock-live">
              <div>
                <p className="clock-time">{clock.time}</p>
                <p className="clock-date" style={{ marginBottom: 0 }}>
                  {clock.date}
                </p>
              </div>
              <StatusBadge status={activeOuting ? 'outside' : 'inside'} />
            </div>

            <div className={`status-banner ${activeOuting ? 'status-banner-out' : 'status-banner-in'}`}>
              <span className="status-dot" />
              <span>
                {activeOuting
                  ? `You are outside since ${formatDateTime(activeOuting.outAt)} (${formatDuration(
                      now.getTime() - new Date(activeOuting.outAt).getTime(),
                    )}).`
                  : 'You are currently inside the hostel.'}
              </span>
            </div>

            {activeOuting ? (
              <div className="clock-meta">
                <span>
                  Clock-out location:{' '}
                  {activeOuting.outLat !== null ? (
                    <>
                      {Number(activeOuting.outLat).toFixed(5)}, {Number(activeOuting.outLng).toFixed(5)} ·{' '}
                      <GoogleMapLink lat={activeOuting.outLat} lng={activeOuting.outLng} />
                    </>
                  ) : (
                    'not captured'
                  )}
                </span>
              </div>
            ) : null}

            {locationError ? (
              <div className="banner banner-danger" role="alert">
                <p>{locationError}</p>
                <div className="banner-actions">
                  <Button size="sm" variant="secondary" onClick={requestClockOut}>
                    Retry location
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="clock-actions">
              {activeOuting ? (
                <Button className="clock-btn" onClick={handleClockIn}>
                  Clock In
                </Button>
              ) : (
                <Button className="clock-btn" onClick={requestClockOut} disabled={locating}>
                  {locating ? 'Getting your location…' : 'Clock Out'}
                </Button>
              )}
              <Link className="btn btn-secondary" to="/hosteller/outings">
                View outing history
              </Link>
            </div>

            <p className="small muted" style={{ marginBottom: 0 }}>
              Clock Out asks for browser location permission and saves your current latitude and
              longitude. If permission is denied, the outing is not recorded — retry after allowing
              access.
            </p>
          </Card>

          <Card
            title="Recent outings"
            subtitle="Your latest clock-out and clock-in records"
            actions={
              <Link className="btn-link" to="/hosteller/outings">
                View all
              </Link>
            }
            flush
          >
            {myOutings.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Clocked out</th>
                      <th>Clocked in</th>
                      <th>Time outside</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOutings.slice(0, 4).map((outing) => (
                      <tr key={outing.id}>
                        <td className="num">
                          {formatDate(outing.outAt)}
                          <div className="cell-muted">{formatTime(outing.outAt)}</div>
                        </td>
                        <td className="num">
                          {outing.inAt ? (
                            <>
                              {formatDate(outing.inAt)}
                              <div className="cell-muted">{formatTime(outing.inAt)}</div>
                            </>
                          ) : (
                            <span className="cell-muted">Not returned yet</span>
                          )}
                        </td>
                        <td className="num">
                          {formatDuration(
                            outing.inAt
                              ? outing.durationMs
                              : now.getTime() - new Date(outing.outAt).getTime(),
                          )}
                        </td>
                        <td>
                          <StatusBadge status={outing.inAt ? 'inside' : 'outside'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No outings yet"
                message="When you clock out, your time and location are saved here."
              />
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="My details">
            <dl className="info-list">
              <div className="info-row">
                <dt>Room / bed</dt>
                <dd>
                  {hosteller.roomNumber} / {hosteller.bedNumber}
                </dd>
              </div>
              <div className="info-row">
                <dt>Date of joining</dt>
                <dd>{formatDate(hosteller.joinDate)}</dd>
              </div>
              <div className="info-row">
                <dt>Phone</dt>
                <dd>{hosteller.phone}</dd>
              </div>
              <div className="info-row">
                <dt>Email</dt>
                <dd>{hosteller.email}</dd>
              </div>
              <div className="info-row">
                <dt>Emergency contact</dt>
                <dd>{hosteller.emergencyContact}</dd>
              </div>
              <div className="info-row">
                <dt>Washing machine</dt>
                <dd>
                  {hosteller.washingMachine?.enabled
                    ? `${money(hosteller.washingMachine.amount)}/month`
                    : 'Not subscribed'}
                </dd>
              </div>
            </dl>
          </Card>

          <Card
            title="Weekly food poll"
            subtitle={poll ? `Week ${pollWeekLabel(poll)}` : 'No poll scheduled'}
            actions={
              <Link className="btn-link" to="/hosteller/food">
                Open poll
              </Link>
            }
          >
            {poll ? (
              <div className="stack-sm">
                {isPollLocked(poll, now) ? (
                  <div className="banner banner-warning">
                    <p>This poll is closed for edits.</p>
                  </div>
                ) : (
                  <div className="banner banner-info">
                    <p>Submit or edit your meals until {formatDateTime(poll.deadline)}.</p>
                  </div>
                )}
                {selection ? (
                  <p style={{ margin: 0 }}>
                    <strong>Your selections:</strong> {mealTotals.breakfast} breakfast,{' '}
                    {mealTotals.lunch} lunch and {mealTotals.dinner} dinner meals this week.
                  </p>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    You have not submitted your food preferences for this week yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                The admin has not created a food poll yet.
              </p>
            )}
          </Card>

          <Card
            title="Rent & advance"
            actions={
              <Link className="btn-link" to="/hosteller/rent">
                Details
              </Link>
            }
          >
            <dl className="info-list">
              <div className="info-row">
                <dt>Rent status</dt>
                <dd>
                  <StatusBadge status={summary.status} />
                </dd>
              </div>
              <div className="info-row">
                <dt>Next due date</dt>
                <dd>{formatDate(summary.dueDate)}</dd>
              </div>
              <div className="info-row">
                <dt>Pending amount</dt>
                <dd>{money(summary.pending)}</dd>
              </div>
              <div className="info-row">
                <dt>Last payment</dt>
                <dd>
                  {summary.lastPayment ? formatDate(summary.lastPayment.date) : 'No payments yet'}
                </dd>
              </div>
              <div className="info-row">
                <dt>Advance balance</dt>
                <dd>{money(advance)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Notifications" flush>
            {notifications.length ? (
              <div>
                {notifications.slice(0, 4).map((notification) => (
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
                title="No notifications"
                message="Rent reminders and food poll updates will appear here."
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
