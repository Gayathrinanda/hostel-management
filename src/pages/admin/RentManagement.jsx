import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import { formatDate, monthKey, monthLabel, toDateInput } from '../../lib/dates';
import { advanceBalance, rentSummary } from '../../lib/rent';
import { validateAdvance, validatePayment } from '../../lib/validation';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const METHODS = ['Cash', 'UPI', 'Paytm', 'Bank Transfer', 'Other'];

function PaymentModal({ hostellerId, onClose }) {
  const { db, recordRentPayment } = useData();
  const toast = useToast();
  const hosteller = db.hostellers.find((item) => item.id === hostellerId);
  const summary = hosteller ? rentSummary(hosteller, db.rentPayments, new Date()) : null;

  const [values, setValues] = useState({
    amount: summary ? String(summary.pending) : '',
    date: toDateInput(new Date()),
    method: 'UPI',
    reference: '',
    note: '',
  });
  const [errors, setErrors] = useState({});

  if (!hosteller || !summary) return null;

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validatePayment(values, { pending: summary.pending });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = recordRentPayment({
      hostellerId: hosteller.id,
      amount: values.amount,
      date: values.date,
      method: values.method,
      reference: values.reference,
      note: values.note,
      period: summary.period,
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      `Payment of ${money(result.payment.amount)} recorded for ${monthLabel(summary.period)}.`,
    );
    onClose();
  };

  return (
    <Modal
      open
      title="Record rent payment"
      description={`${hosteller.fullName} · Room ${hosteller.roomNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rent-payment-form">
            Save payment
          </Button>
        </>
      }
    >
      <form id="rent-payment-form" onSubmit={submit} noValidate className="stack-sm">
        <div className="banner banner-info">
          <p>
            Rent cycle <strong>{summary.periodLabel}</strong> · due{' '}
            <strong>{formatDate(summary.dueDate)}</strong> · pending{' '}
            <strong>{money(summary.pending)}</strong>.
          </p>
        </div>

        <div className="form-grid">
          <Field label="Amount received (₹)" htmlFor="pay-amount" required error={errors.amount}>
            <Input
              id="pay-amount"
              type="number"
              min="1"
              step="1"
              max={summary.pending}
              value={values.amount}
              error={errors.amount}
              onChange={(event) => setValues({ ...values, amount: event.target.value })}
            />
          </Field>
          <Field label="Payment date" htmlFor="pay-date" required error={errors.date}>
            <Input
              id="pay-date"
              type="date"
              max={toDateInput(new Date())}
              value={values.date}
              error={errors.date}
              onChange={(event) => setValues({ ...values, date: event.target.value })}
            />
          </Field>
          <Field label="Payment method" htmlFor="pay-method" required error={errors.method}>
            <Select
              id="pay-method"
              value={values.method}
              error={errors.method}
              onChange={(event) => setValues({ ...values, method: event.target.value })}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Transaction ID / reference"
            htmlFor="pay-reference"
            error={errors.reference}
            hint="Required for UPI, Paytm and bank transfers."
          >
            <Input
              id="pay-reference"
              value={values.reference}
              error={errors.reference}
              onChange={(event) => setValues({ ...values, reference: event.target.value })}
              placeholder="e.g. UPI/9981123"
            />
          </Field>
        </div>

        <Field label="Note (optional)" htmlFor="pay-note">
          <Textarea
            id="pay-note"
            rows={2}
            value={values.note}
            onChange={(event) => setValues({ ...values, note: event.target.value })}
            placeholder="Anything to remember about this payment"
          />
        </Field>

        <p className="small muted" style={{ marginBottom: 0 }}>
          Advance deposits are never adjusted against rent automatically. Use “Update advance” to
          manage the security deposit separately.
        </p>
      </form>
    </Modal>
  );
}

function AdvanceModal({ hostellerId, onClose }) {
  const { db, addAdvanceEntry } = useData();
  const toast = useToast();
  const hosteller = db.hostellers.find((item) => item.id === hostellerId);
  const balance = hosteller ? advanceBalance(hosteller.id, db.advancePayments) : 0;

  const [values, setValues] = useState({
    type: 'deposit',
    amount: '',
    date: toDateInput(new Date()),
    method: 'Cash',
    reference: '',
    note: '',
  });
  const [errors, setErrors] = useState({});

  if (!hosteller) return null;

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateAdvance(values, { balance });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = addAdvanceEntry({ hostellerId: hosteller.id, ...values });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      `${values.type === 'refund' ? 'Advance refund' : 'Advance deposit'} of ${money(
        values.amount,
      )} recorded.`,
    );
    onClose();
  };

  return (
    <Modal
      open
      title="Update advance / security deposit"
      description={`${hosteller.fullName} · current balance ${money(balance)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="advance-form">
            Save advance entry
          </Button>
        </>
      }
    >
      <form id="advance-form" onSubmit={submit} noValidate className="stack-sm">
        <div className="form-grid">
          <Field label="Entry type" htmlFor="advance-type" required error={errors.type}>
            <Select
              id="advance-type"
              value={values.type}
              error={errors.type}
              onChange={(event) => setValues({ ...values, type: event.target.value })}
            >
              <option value="deposit">Deposit received</option>
              <option value="refund">Refund to hosteller</option>
            </Select>
          </Field>
          <Field label="Amount (₹)" htmlFor="advance-amount" required error={errors.amount}>
            <Input
              id="advance-amount"
              type="number"
              min="1"
              step="1"
              value={values.amount}
              error={errors.amount}
              onChange={(event) => setValues({ ...values, amount: event.target.value })}
            />
          </Field>
          <Field label="Date" htmlFor="advance-date" required error={errors.date}>
            <Input
              id="advance-date"
              type="date"
              max={toDateInput(new Date())}
              value={values.date}
              error={errors.date}
              onChange={(event) => setValues({ ...values, date: event.target.value })}
            />
          </Field>
          <Field label="Method" htmlFor="advance-method" required error={errors.method}>
            <Select
              id="advance-method"
              value={values.method}
              error={errors.method}
              onChange={(event) => setValues({ ...values, method: event.target.value })}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference (optional)" htmlFor="advance-reference">
            <Input
              id="advance-reference"
              value={values.reference}
              onChange={(event) => setValues({ ...values, reference: event.target.value })}
            />
          </Field>
          <Field label="Note (optional)" htmlFor="advance-note">
            <Input
              id="advance-note"
              value={values.note}
              onChange={(event) => setValues({ ...values, note: event.target.value })}
              placeholder="e.g. Deposit refunded on leaving"
            />
          </Field>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Advance is tracked in a separate ledger. Recording rent payments never changes this
          balance.
        </p>
      </form>
    </Modal>
  );
}

function HistoryModal({ hostellerId, onClose }) {
  const { db } = useData();
  const hosteller = db.hostellers.find((item) => item.id === hostellerId);
  const [tab, setTab] = useState('rent');

  if (!hosteller) return null;

  const rentPayments = db.rentPayments
    .filter((payment) => payment.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const advanceEntries = db.advancePayments
    .filter((entry) => entry.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal
      open
      title="Payment history"
      description={`${hosteller.fullName} · Room ${hosteller.roomNumber}`}
      onClose={onClose}
      size="lg"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'rent' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('rent')}
        >
          Rent payments
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'advance' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('advance')}
        >
          Advance ledger
        </button>
      </div>

      {tab === 'rent' ? (
        rentPayments.length ? (
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
                    <td className="nowrap">{monthLabel(payment.period)}</td>
                    <td className="num">{money(payment.amount)}</td>
                    <td>{payment.method}</td>
                    <td className="cell-muted">{payment.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No rent payments" message="Payments recorded for this hosteller appear here." />
        )
      ) : advanceEntries.length ? (
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
        <EmptyState title="No advance entries" message="Security deposit entries appear here." />
      )}
    </Modal>
  );
}

export default function RentManagement() {
  const { db } = useData();
  const [searchParams] = useSearchParams();
  const now = useNow(60000);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTargetId, setPaymentTargetId] = useState(null);
  const [advanceTargetId, setAdvanceTargetId] = useState(null);
  const [historyTargetId, setHistoryTargetId] = useState(null);

  const rows = db.hostellers
    .map((hosteller) => ({
      hosteller,
      summary: rentSummary(hosteller, db.rentPayments, now),
      advance: advanceBalance(hosteller.id, db.advancePayments),
    }))
    .filter((row) => {
      const text = `${row.hosteller.fullName} ${row.hosteller.roomNumber} ${row.hosteller.username}`.toLowerCase();
      const matchesSearch = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || row.summary.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const order = { overdue: 0, pending: 1, paid: 2 };
      if (order[a.summary.status] !== order[b.summary.status]) {
        return order[a.summary.status] - order[b.summary.status];
      }
      return a.hosteller.fullName.localeCompare(b.hosteller.fullName);
    });

  const activeRows = rows.filter((row) => row.hosteller.active);
  const pendingTotal = activeRows.reduce((total, row) => total + row.summary.pending, 0);
  const overdueCount = activeRows.filter((row) => row.summary.status === 'overdue').length;
  const collectedThisMonth = db.rentPayments
    .filter((payment) => monthKey(payment.date) === monthKey(now))
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const advanceHeld = db.hostellers.reduce(
    (total, hosteller) => total + advanceBalance(hosteller.id, db.advancePayments),
    0,
  );

  return (
    <>
      <PageHeader
        title="Rent Management"
        subtitle="Record monthly rent, track advances separately and follow every payment."
      />

      <div className="stat-grid">
        <StatCard
          label="Collected This Month"
          value={money(collectedThisMonth)}
          hint={`Payments received in ${monthLabel(monthKey(now))}`}
          tone="success"
        />
        <StatCard
          label="Pending Rent"
          value={money(pendingTotal)}
          hint={`${activeRows.filter((row) => row.summary.pending > 0).length} active hostellers`}
          tone="warning"
        />
        <StatCard
          label="Overdue Accounts"
          value={overdueCount}
          hint="Past the rent due date"
          tone="danger"
        />
        <StatCard
          label="Advance Held"
          value={money(advanceHeld)}
          hint="Security deposits across all hostellers"
          tone="info"
        />
      </div>

      <Card flush className="" bodyClassName="" >
        <div className="card-body">
          <div className="toolbar">
            <Field className="field-grow" label="Search" htmlFor="rent-search">
              <Input
                id="rent-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by hosteller, room or username"
              />
            </Field>
            <Field label="Payment status" htmlFor="rent-status">
              <Select
                id="rent-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </Select>
            </Field>
          </div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Hosteller</th>
                  <th>Room</th>
                  <th>Monthly rent</th>
                  <th>Advance balance</th>
                  <th>Last payment</th>
                  <th>Next due date</th>
                  <th>Status</th>
                  <th>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ hosteller, summary, advance }) => (
                  <tr key={hosteller.id}>
                    <td>
                      <Link className="cell-strong" to={`/admin/hostellers/${hosteller.id}`}>
                        {hosteller.fullName}
                      </Link>
                      <div className="cell-muted">
                        @{hosteller.username}
                        {hosteller.active ? '' : ' · account inactive'}
                      </div>
                    </td>
                    <td>{hosteller.roomNumber}</td>
                    <td className="num">{money(summary.rent)}</td>
                    <td className="num">{money(advance)}</td>
                    <td className="num">
                      {summary.lastPayment ? formatDate(summary.lastPayment.date) : '—'}
                    </td>
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
                    <td className="num">{money(summary.pending)}</td>
                    <td>
                      <div className="cell-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={summary.pending <= 0 || !hosteller.active}
                          title={
                            !hosteller.active
                              ? 'Reactivate the account before recording rent.'
                              : summary.pending <= 0
                                ? 'Rent for this cycle is already paid.'
                                : undefined
                          }
                          onClick={() => setPaymentTargetId(hosteller.id)}
                        >
                          Record payment
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAdvanceTargetId(hosteller.id)}
                        >
                          Advance
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setHistoryTargetId(hosteller.id)}
                        >
                          History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No rent records match"
            message="Try a different search or status filter."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </Card>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <Card title="How reminders are calculated">
          <div className="stack-sm small muted">
            <p style={{ margin: 0 }}>
              Each hosteller has a rent due day (for example the 10th). Reminders appear on the
              dashboard and notifications page two days before the due date, on the due date, and
              then as overdue until a payment is recorded.
            </p>
            <p style={{ margin: 0 }}>
              Payments are recorded against the current rent cycle. Partial payments reduce the
              pending amount without touching the advance ledger.
            </p>
            <p style={{ margin: 0 }}>
              The advance / security deposit is shown separately and is only changed from the
              advance ledger.
            </p>
          </div>
        </Card>
        <Card title="Payment status key">
          <dl className="info-list">
            <div className="info-row">
              <dt>
                <StatusBadge status="paid" />
              </dt>
              <dd>Full rent received for the current cycle</dd>
            </div>
            <div className="info-row">
              <dt>
                <StatusBadge status="pending" />
              </dt>
              <dd>Due date is today or in the future</dd>
            </div>
            <div className="info-row">
              <dt>
                <StatusBadge status="overdue" />
              </dt>
              <dd>Due date has passed with a balance remaining</dd>
            </div>
          </dl>
        </Card>
      </div>

      {paymentTargetId ? (
        <PaymentModal hostellerId={paymentTargetId} onClose={() => setPaymentTargetId(null)} />
      ) : null}
      {advanceTargetId ? (
        <AdvanceModal hostellerId={advanceTargetId} onClose={() => setAdvanceTargetId(null)} />
      ) : null}
      {historyTargetId ? (
        <HistoryModal hostellerId={historyTargetId} onClose={() => setHistoryTargetId(null)} />
      ) : null}
    </>
  );
}
