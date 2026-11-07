import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import HostellerStatusModal from '../../components/admin/HostellerStatusModal';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox, Field, Input } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  ordinal,
} from '../../lib/dates';
import { currentPoll, pollWeekLabel, selectionFor } from '../../lib/food';
import { advanceBalance, rentSummary } from '../../lib/rent';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function IdProofPreview({ proof }) {
  if (!proof) {
    return (
      <div className="doc-frame">
        <p className="doc-empty">No ID proof uploaded for this hosteller.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="doc-frame">
        {proof.type === 'application/pdf' ? (
          <iframe src={proof.dataUrl} title="ID proof document" />
        ) : (
          <img src={proof.dataUrl} alt="Uploaded ID proof" />
        )}
      </div>
      <div className="upload-row" style={{ marginTop: 8 }}>
        <span className="small muted">{proof.name}</span>
        <a className="btn-link" href={proof.dataUrl} target="_blank" rel="noreferrer">
          Open document
        </a>
      </div>
    </div>
  );
}

export default function HostellerProfile() {
  const { id } = useParams();
  const { db, updateSubscription } = useData();
  const toast = useToast();
  const now = useNow(30000);

  const [statusOpen, setStatusOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionErrors, setSubscriptionErrors] = useState({});
  const [subscriptionForm, setSubscriptionForm] = useState({
    enabled: false,
    amount: '',
    startDate: '',
  });

  const hosteller = db.hostellers.find((item) => item.id === id);

  if (!hosteller) {
    return (
      <>
        <PageHeader title="Hosteller not found" backTo="/admin/hostellers" backLabel="All hostellers" />
        <Card>
          <EmptyState
            title="Profile unavailable"
            message="This hosteller record could not be found. Demo data may have been reset."
            action={
              <Link className="btn btn-primary btn-sm" to="/admin/hostellers">
                Back to hostellers
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const summary = rentSummary(hosteller, db.rentPayments, now);
  const advance = advanceBalance(hosteller.id, db.advancePayments);
  const rentPayments = db.rentPayments
    .filter((payment) => payment.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const advanceEntries = db.advancePayments
    .filter((entry) => entry.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const outings = db.outings
    .filter((outing) => outing.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.outAt).getTime() - new Date(a.outAt).getTime());
  const activeOuting = outings.find((outing) => !outing.inAt);

  const poll = currentPoll(db.foodPolls, now);
  const selection = poll
    ? db.foodSelections.find(
        (item) => item.pollId === poll.id && item.hostellerId === hosteller.id,
      )
    : null;
  const mealTotals = selectionFor(selection);

  const openSubscription = () => {
    setSubscriptionForm({
      enabled: Boolean(hosteller.washingMachine?.enabled),
      amount: hosteller.washingMachine?.amount ? String(hosteller.washingMachine.amount) : '',
      startDate: hosteller.washingMachine?.startDate || '',
    });
    setSubscriptionErrors({});
    setSubscriptionOpen(true);
  };

  const saveSubscription = (event) => {
    event.preventDefault();
    const errors = {};
    if (subscriptionForm.enabled) {
      if (
        subscriptionForm.amount === '' ||
        Number.isNaN(Number(subscriptionForm.amount)) ||
        Number(subscriptionForm.amount) < 0
      ) {
        errors.amount = 'Enter a valid subscription amount (zero or more).';
      }
      if (!subscriptionForm.startDate) {
        errors.startDate = 'Subscription start date is required.';
      }
    }
    setSubscriptionErrors(errors);
    if (Object.keys(errors).length) return;

    updateSubscription(hosteller.id, subscriptionForm);
    toast.success('Washing machine subscription updated.');
    setSubscriptionOpen(false);
  };

  return (
    <>
      <PageHeader
        title={hosteller.fullName}
        subtitle={`Room ${hosteller.roomNumber} · Bed ${hosteller.bedNumber} · Hosteller since ${formatDate(
          hosteller.joinDate,
        )}`}
        backTo="/admin/hostellers"
        backLabel="All hostellers"
        actions={
          <>
            <Link className="btn btn-secondary" to={`/admin/hostellers/${hosteller.id}/edit`}>
              Edit details
            </Link>
            <Button variant={hosteller.active ? 'danger' : 'primary'} onClick={() => setStatusOpen(true)}>
              {hosteller.active ? 'Deactivate account' : 'Reactivate account'}
            </Button>
          </>
        }
      />

      <div className="stack">
        <div className="hosteller-hero">
          <span className="avatar">{initials(hosteller.fullName)}</span>
          <div className="hosteller-hero-text">
            <h1>{hosteller.fullName}</h1>
            <p>
              {hosteller.email} · {hosteller.phone} · @{hosteller.username}
            </p>
            <div className="row" style={{ marginTop: 8 }}>
              <StatusBadge status={hosteller.active ? 'active' : 'inactive'} />
              <StatusBadge status={activeOuting ? 'outside' : 'inside'} />
              <StatusBadge status={summary.status} />
              {hosteller.washingMachine?.enabled ? (
                <Badge tone="info">Washing machine subscriber</Badge>
              ) : null}
            </div>
          </div>
          {activeOuting ? (
            <div className="small muted">
              Outside since {formatTime(activeOuting.outAt)} (
              {formatDuration(now.getTime() - new Date(activeOuting.outAt).getTime())})
            </div>
          ) : (
            <div className="small muted">Currently inside the hostel</div>
          )}
        </div>

        <div className="grid-2">
          <Card title="Personal information">
            <dl className="info-list">
              <div className="info-row">
                <dt>Phone number</dt>
                <dd>{hosteller.phone}</dd>
              </div>
              <div className="info-row">
                <dt>Email address</dt>
                <dd>{hosteller.email}</dd>
              </div>
              <div className="info-row">
                <dt>Date of joining</dt>
                <dd>{formatDate(hosteller.joinDate)}</dd>
              </div>
              <div className="info-row">
                <dt>Emergency contact</dt>
                <dd>{hosteller.emergencyContact}</dd>
              </div>
              <div className="info-row">
                <dt>Account created</dt>
                <dd>{formatDate(hosteller.createdAt)}</dd>
              </div>
              {hosteller.deactivatedAt ? (
                <div className="info-row">
                  <dt>Deactivated on</dt>
                  <dd>{formatDate(hosteller.deactivatedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card title="Identity documents" subtitle="Visible only in the admin interface">
            <dl className="info-list">
              <div className="info-row">
                <dt>Document type</dt>
                <dd>{hosteller.idType}</dd>
              </div>
              <div className="info-row">
                <dt>ID number</dt>
                <dd>{hosteller.idNumber}</dd>
              </div>
            </dl>
            <div style={{ marginTop: 14 }}>
              <IdProofPreview proof={hosteller.idProof} />
            </div>
          </Card>
        </div>

        <div className="grid-2">
          <Card title="Hostel information">
            <div className="detail-grid">
              <div>
                <p className="detail-label">Room</p>
                <p className="detail-value">{hosteller.roomNumber}</p>
              </div>
              <div>
                <p className="detail-label">Bed</p>
                <p className="detail-value">{hosteller.bedNumber}</p>
              </div>
              <div>
                <p className="detail-label">Monthly rent</p>
                <p className="detail-value">{money(hosteller.monthlyRent)}</p>
              </div>
              <div>
                <p className="detail-label">Rent due day</p>
                <p className="detail-value">{ordinal(hosteller.rentDueDay)} of each month</p>
              </div>
              <div>
                <p className="detail-label">Advance balance</p>
                <p className="detail-value">{money(advance)}</p>
              </div>
              <div>
                <p className="detail-label">Next due date</p>
                <p className="detail-value">{formatDate(summary.dueDate)}</p>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
              Advance deposits stay separate from rent and are never adjusted automatically.
            </p>
          </Card>

          <Card
            title="Washing machine subscription"
            actions={
              <Button size="sm" variant="secondary" onClick={openSubscription}>
                Update subscription
              </Button>
            }
          >
            {hosteller.washingMachine?.enabled ? (
              <dl className="info-list">
                <div className="info-row">
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status="active" />
                  </dd>
                </div>
                <div className="info-row">
                  <dt>Subscription amount</dt>
                  <dd>{money(hosteller.washingMachine.amount)} per month</dd>
                </div>
                <div className="info-row">
                  <dt>Start date</dt>
                  <dd>{formatDate(hosteller.washingMachine.startDate)}</dd>
                </div>
              </dl>
            ) : (
              <div>
                <Badge tone="neutral">Not subscribed</Badge>
                <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
                  This hosteller does not have a washing machine subscription.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="grid-2">
          <Card
            title="Current rent cycle"
            subtitle={`${summary.periodLabel} · due ${formatDate(summary.dueDate)}`}
            actions={
              <Link
                className="btn btn-secondary btn-sm"
                to={`/admin/rent?q=${encodeURIComponent(hosteller.fullName)}`}
              >
                Record payment
              </Link>
            }
          >
            <dl className="info-list">
              <div className="info-row">
                <dt>Payment status</dt>
                <dd>
                  <StatusBadge status={summary.status} />
                </dd>
              </div>
              <div className="info-row">
                <dt>Rent for this cycle</dt>
                <dd>{money(summary.rent)}</dd>
              </div>
              <div className="info-row">
                <dt>Paid this cycle</dt>
                <dd>{money(summary.paidThisCycle)}</dd>
              </div>
              <div className="info-row">
                <dt>Pending amount</dt>
                <dd>{money(summary.pending)}</dd>
              </div>
              <div className="info-row">
                <dt>Last payment</dt>
                <dd>{summary.lastPayment ? formatDate(summary.lastPayment.date) : 'No payments yet'}</dd>
              </div>
            </dl>
          </Card>

          <Card
            title="Advance / security deposit"
            subtitle="Kept separate from monthly rent"
            actions={
              <Link
                className="btn btn-secondary btn-sm"
                to={`/admin/rent?q=${encodeURIComponent(hosteller.fullName)}`}
              >
                Manage advance
              </Link>
            }
          >
            <p className="stat-value" style={{ marginTop: 0 }}>
              {money(advance)}
            </p>
            <p className="small muted">Current advance balance</p>
            <dl className="info-list">
              <div className="info-row">
                <dt>Deposits recorded</dt>
                <dd>
                  {money(
                    advanceEntries
                      .filter((entry) => entry.type !== 'refund')
                      .reduce((total, entry) => total + Number(entry.amount), 0),
                  )}
                </dd>
              </div>
              <div className="info-row">
                <dt>Refunds recorded</dt>
                <dd>
                  {money(
                    advanceEntries
                      .filter((entry) => entry.type === 'refund')
                      .reduce((total, entry) => total + Number(entry.amount), 0),
                  )}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="grid-2">
          <Card title="Rent payment history" subtitle="Advance payments are tracked separately" flush>
            {rentPayments.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Period</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="nowrap">{formatDate(payment.date)}</td>
                        <td className="nowrap">{payment.period}</td>
                        <td className="num">{money(payment.amount)}</td>
                        <td>{payment.method}</td>
                        <td className="cell-muted">{payment.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No rent payments" message="Recorded payments will appear here." />
            )}
          </Card>

          <Card title="Advance ledger" subtitle="Deposits and refunds" flush>
            {advanceEntries.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanceEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="nowrap">{formatDate(entry.date)}</td>
                        <td>
                          <Badge tone={entry.type === 'refund' ? 'warning' : 'success'}>
                            {entry.type === 'refund' ? 'Refund' : 'Deposit'}
                          </Badge>
                        </td>
                        <td className="num">
                          {entry.type === 'refund' ? '−' : '+'}
                          {money(entry.amount)}
                        </td>
                        <td>{entry.method}</td>
                        <td className="cell-muted">{entry.note || entry.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No advance entries" message="Advance deposits will appear here." />
            )}
          </Card>
        </div>

        <div className="grid-2">
          <Card title="Recent outings" subtitle="Latest movement records" flush>
            {outings.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Clocked out</th>
                      <th>Clocked in</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outings.slice(0, 6).map((outing) => (
                      <tr key={outing.id}>
                        <td className="nowrap">{formatDateTime(outing.outAt)}</td>
                        <td className="nowrap">
                          {outing.inAt ? formatDateTime(outing.inAt) : 'Not yet returned'}
                        </td>
                        <td className="num">
                          {formatDuration(
                            outing.durationMs ??
                              now.getTime() - new Date(outing.outAt).getTime(),
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
              <EmptyState title="No outings recorded" message="Clock-outs appear here after the hosteller uses Clock Out." />
            )}
          </Card>

          <Card
            title="Weekly food poll"
            subtitle={poll ? `Week ${pollWeekLabel(poll)}` : 'No poll created'}
            actions={
              <Link className="btn-link" to="/admin/food">
                Open food management
              </Link>
            }
          >
            {poll ? (
              selection ? (
                <div>
                  <div className="detail-grid">
                    <div>
                      <p className="detail-label">Breakfast</p>
                      <p className="detail-value">{mealTotals.breakfast} of 7 days</p>
                    </div>
                    <div>
                      <p className="detail-label">Lunch</p>
                      <p className="detail-value">{mealTotals.lunch} of 7 days</p>
                    </div>
                    <div>
                      <p className="detail-label">Dinner</p>
                      <p className="detail-value">{mealTotals.dinner} of 7 days</p>
                    </div>
                  </div>
                  <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                    Last updated {formatDateTime(selection.updatedAt)}
                  </p>
                </div>
              ) : (
                <p className="muted" style={{ marginBottom: 0 }}>
                  No food selection submitted for this week.
                </p>
              )
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                Create a weekly poll to collect meal requirements.
              </p>
            )}
          </Card>
        </div>
      </div>

      <HostellerStatusModal hosteller={statusOpen ? hosteller : null} onClose={() => setStatusOpen(false)} />

      <Modal
        open={subscriptionOpen}
        title="Update washing machine subscription"
        description={`${hosteller.fullName} · Room ${hosteller.roomNumber}`}
        onClose={() => setSubscriptionOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubscriptionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="subscription-form">
              Save subscription
            </Button>
          </>
        }
      >
        <form id="subscription-form" onSubmit={saveSubscription} noValidate>
          <div className="stack-sm">
            <Checkbox
              label="Subscription enabled"
              description="Disabled subscriptions keep their history but show as not subscribed."
              checked={subscriptionForm.enabled}
              onChange={(event) =>
                setSubscriptionForm({ ...subscriptionForm, enabled: event.target.checked })
              }
            />
            {subscriptionForm.enabled ? (
              <>
                <Field
                  label="Subscription amount (₹ / month)"
                  htmlFor="sub-amount"
                  required
                  error={subscriptionErrors.amount}
                >
                  <Input
                    id="sub-amount"
                    type="number"
                    min="0"
                    value={subscriptionForm.amount}
                    error={subscriptionErrors.amount}
                    onChange={(event) =>
                      setSubscriptionForm({ ...subscriptionForm, amount: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Start date"
                  htmlFor="sub-start"
                  required
                  error={subscriptionErrors.startDate}
                >
                  <Input
                    id="sub-start"
                    type="date"
                    value={subscriptionForm.startDate}
                    error={subscriptionErrors.startDate}
                    onChange={(event) =>
                      setSubscriptionForm({ ...subscriptionForm, startDate: event.target.value })
                    }
                  />
                </Field>
              </>
            ) : null}
          </div>
        </form>
      </Modal>
    </>
  );
}
