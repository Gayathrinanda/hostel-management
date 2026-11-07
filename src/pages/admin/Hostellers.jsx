import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HostellerStatusModal from '../../components/admin/HostellerStatusModal';
import { StatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import useNow from '../../hooks/useNow';
import { formatDate, ordinal } from '../../lib/dates';
import { rentSummary } from '../../lib/rent';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function Hostellers() {
  const { db } = useData();
  const now = useNow(60000);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [washer, setWasher] = useState('all');
  const [room, setRoom] = useState('all');
  const [statusTarget, setStatusTarget] = useState(null);

  const rooms = useMemo(
    () => Array.from(new Set(db.hostellers.map((hosteller) => hosteller.roomNumber))).sort(),
    [db.hostellers],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return db.hostellers
      .filter((hosteller) => {
        const haystack = [
          hosteller.fullName,
          hosteller.username,
          hosteller.roomNumber,
          hosteller.phone,
          hosteller.email,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = !search || haystack.includes(search);
        const matchesStatus =
          status === 'all' || (status === 'active' ? hosteller.active : !hosteller.active);
        const matchesWasher =
          washer === 'all' ||
          (washer === 'yes'
            ? Boolean(hosteller.washingMachine?.enabled)
            : !hosteller.washingMachine?.enabled);
        const matchesRoom = room === 'all' || hosteller.roomNumber === room;
        return matchesQuery && matchesStatus && matchesWasher && matchesRoom;
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [db.hostellers, query, status, washer, room]);

  const activeOutings = new Set(
    db.outings.filter((outing) => !outing.inAt).map((outing) => outing.hostellerId),
  );

  const hasFilters = Boolean(query || status !== 'all' || washer !== 'all' || room !== 'all');
  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setWasher('all');
    setRoom('all');
  };

  return (
    <>
      <PageHeader
        title="Hosteller Management"
        subtitle="Add, edit, search and manage every hosteller account and profile."
        actions={
          <Link className="btn btn-primary" to="/admin/hostellers/new">
            Add hosteller
          </Link>
        }
      />

      <Card flush>
        <div className="card-body">
          <div className="toolbar">
            <Field className="field-grow" label="Search" htmlFor="hosteller-search">
              <Input
                id="hosteller-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, username, room, phone or email"
              />
            </Field>
            <Field label="Account status" htmlFor="status-filter">
              <Select
                id="status-filter"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </Select>
            </Field>
            <Field label="Room" htmlFor="room-filter">
              <Select id="room-filter" value={room} onChange={(event) => setRoom(event.target.value)}>
                <option value="all">All rooms</option>
                {rooms.map((roomNumber) => (
                  <option key={roomNumber} value={roomNumber}>
                    Room {roomNumber}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Washing machine" htmlFor="washer-filter">
              <Select
                id="washer-filter"
                value={washer}
                onChange={(event) => setWasher(event.target.value)}
              >
                <option value="all">Any subscription</option>
                <option value="yes">Subscribed</option>
                <option value="no">Not subscribed</option>
              </Select>
            </Field>
            {hasFilters ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
          <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
            Showing {filtered.length} of {db.hostellers.length} hostellers
            {hasFilters ? ' matching your filters' : ''}.
          </p>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Hosteller</th>
                  <th>Room / Bed</th>
                  <th>Contact</th>
                  <th>Monthly rent</th>
                  <th>Rent status</th>
                  <th>Washing machine</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((hosteller) => {
                  const summary = rentSummary(hosteller, db.rentPayments, now);
                  const isOutside = activeOutings.has(hosteller.id);
                  return (
                    <tr key={hosteller.id}>
                      <td>
                        <Link to={`/admin/hostellers/${hosteller.id}`} className="cell-strong">
                          {hosteller.fullName}
                        </Link>
                        <div className="cell-muted">
                          @{hosteller.username} · joined {formatDate(hosteller.joinDate)}
                        </div>
                      </td>
                      <td>
                        Room {hosteller.roomNumber}
                        <div className="cell-muted">Bed {hosteller.bedNumber}</div>
                      </td>
                      <td>
                        {hosteller.phone}
                        <div className="cell-muted">{hosteller.email}</div>
                      </td>
                      <td className="num">
                        {money(hosteller.monthlyRent)}
                        <div className="cell-muted">Due on the {ordinal(hosteller.rentDueDay)}</div>
                      </td>
                      <td>
                        <StatusBadge status={summary.status} />
                        <div className="cell-muted">
                          {summary.pending > 0 ? `${money(summary.pending)} pending` : 'Settled'}
                        </div>
                      </td>
                      <td>
                        {hosteller.washingMachine?.enabled ? (
                          <>
                            <span className="badge badge-info">Subscribed</span>
                            <div className="cell-muted">{money(hosteller.washingMachine.amount)}/mo</div>
                          </>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={hosteller.active ? 'active' : 'inactive'} />
                        <div className="cell-muted">
                          {hosteller.active ? (isOutside ? 'Outside hostel' : 'Inside hostel') : 'No login'}
                        </div>
                      </td>
                      <td>
                        <div className="cell-actions">
                          <Link
                            className="btn btn-secondary btn-sm"
                            to={`/admin/hostellers/${hosteller.id}`}
                          >
                            View
                          </Link>
                          <Link
                            className="btn btn-secondary btn-sm"
                            to={`/admin/hostellers/${hosteller.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className={`btn btn-sm ${hosteller.active ? 'btn-ghost' : 'btn-secondary'}`}
                            onClick={() => setStatusTarget(hosteller)}
                          >
                            {hosteller.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={db.hostellers.length ? 'No hostellers match your filters' : 'No hostellers yet'}
            message={
              db.hostellers.length
                ? 'Try a different search term or clear the filters.'
                : 'Add your first hosteller to create their login and start tracking rent and outings.'
            }
            action={
              db.hostellers.length ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/admin/hostellers/new">
                  Add hosteller
                </Link>
              )
            }
          />
        )}
      </Card>

      <HostellerStatusModal hosteller={statusTarget} onClose={() => setStatusTarget(null)} />
    </>
  );
}
