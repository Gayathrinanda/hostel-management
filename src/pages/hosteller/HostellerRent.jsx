import { Link } from 'react-router-dom';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import useNow from '../../hooks/useNow';
import { formatDate, monthLabel, ordinal } from '../../lib/dates';
import { advanceBalance, rentSummary } from '../../lib/rent';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function HostellerRent() {
  const { user } = useAuth();
  const { db } = useData();
  const now = useNow(60000);

  const hosteller = user;
  if (!hosteller) return null;

  const summary = rentSummary(hosteller, db.rentPayments, now);
  const advance = advanceBalance(hosteller.id, db.advancePayments);

  const rentPayments = db.rentPayments
    .filter((payment) => payment.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const advanceEntries = db.advancePayments
    .filter((entry) => entry.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader
        title="Rent & Payments"
        subtitle="Your rent cycle, payment history and separate security deposit records."
      />

      <div className="stat-grid">
        <StatCard
          label="Monthly Rent"
          value={money(summary.rent)}
          hint={`Due on the ${ordinal(hosteller.rentDueDay)} of each month`}
        />
        <StatCard
          label="Current Status"
          value={summary.status === 'paid' ? 'Paid' : summary.status === 'overdue' ? 'Overdue' : 'Pending'}
          hint={`${monthLabel(summary.period)} cycle`}
          tone={summary.status === 'paid' ? 'success' : summary.status === 'overdue' ? 'danger' : 'warning'}
        />
        <StatCard
          label="Pending Amount"
          value={money(summary.pending)}
          hint={summary.pending === 0 ? 'Nothing outstanding' : `Due ${formatDate(summary.dueDate)}`}
          tone={summary.pending === 0 ? 'success' : 'warning'}
        />
        <StatCard
          label="Advance / Deposit"
          value={money(advance)}
          hint="Held separately — never applied to rent"
          tone="info"
        />
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <Card title="Current rent cycle" subtitle={`${summary.periodLabel}`}>
          <dl className="info-list">
            <div className="info-row">
              <dt>Payment status</dt>
              <dd>
                <StatusBadge status={summary.status} />
              </dd>
            </div>
            <div className="info-row">
              <dt>Rent amount</dt>
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
              <dt>Due date</dt>
              <dd>{formatDate(summary.dueDate)}</dd>
            </div>
            <div className="info-row">
              <dt>Last payment</dt>
              <dd>
                {summary.lastPayment
                  ? `${money(summary.lastPayment.amount)} on ${formatDate(summary.lastPayment.date)}`
                  : 'No payments recorded yet'}
              </dd>
            </div>
          </dl>
          <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
            Rent payments are recorded by the hostel admin. Contact the office if a payment is
            missing.
          </p>
        </Card>

        <div className="stack">
          <Card title="Advance / security deposit">
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

          <Card title="Washing machine subscription">
            {hosteller.washingMachine?.enabled ? (
              <dl className="info-list">
                <div className="info-row">
                  <dt>Status</dt>
                  <dd>
                    <Badge tone="success">Active</Badge>
                  </dd>
                </div>
                <div className="info-row">
                  <dt>Amount</dt>
                  <dd>{money(hosteller.washingMachine.amount)} per month</dd>
                </div>
                <div className="info-row">
                  <dt>Start date</dt>
                  <dd>{formatDate(hosteller.washingMachine.startDate)}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                You do not have a washing machine subscription. Ask the admin to add one if needed.
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <Card title="Rent payment history" subtitle="Recorded by the hostel admin" flush>
          {rentPayments.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Month</th>
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
            <EmptyState title="No payments yet" message="Rent payments recorded by the admin appear here." />
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
            <EmptyState title="No advance entries" message="Your security deposit records appear here." />
          )}
        </Card>
      </div>

      <p className="small muted" style={{ marginTop: 14 }}>
        Need to update your subscription or deposit? Contact the hostel admin from the office.
      </p>
    </>
  );
}
