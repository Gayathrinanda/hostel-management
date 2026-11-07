import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import useNow from '../../hooks/useNow';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  toDateInput,
} from '../../lib/dates';

function LocationLink({ outing }) {
  if (outing.outLat === null || outing.outLat === undefined) {
    return <span className="cell-muted">Location not captured</span>;
  }
  const url = `https://www.google.com/maps?q=${outing.outLat},${outing.outLng}`;
  return (
    <div>
      <a href={url} target="_blank" rel="noreferrer">
        View on map
      </a>
      <div className="cell-muted">
        {Number(outing.outLat).toFixed(5)}, {Number(outing.outLng).toFixed(5)}
      </div>
    </div>
  );
}

export default function InOutTracking() {
  const { db } = useData();
  const now = useNow(15000);
  const [tab, setTab] = useState('live');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [hostellerFilter, setHostellerFilter] = useState('all');

  const activeHostellers = useMemo(
    () => db.hostellers.filter((hosteller) => hosteller.active),
    [db.hostellers],
  );
  const openOutings = useMemo(() => {
    const map = new Map();
    db.outings
      .filter((outing) => !outing.inAt)
      .forEach((outing) => map.set(outing.hostellerId, outing));
    return map;
  }, [db.outings]);

  const latestReturns = useMemo(() => {
    const map = new Map();
    db.outings
      .filter((outing) => outing.inAt)
      .sort((a, b) => new Date(b.inAt).getTime() - new Date(a.inAt).getTime())
      .forEach((outing) => {
        if (!map.has(outing.hostellerId)) map.set(outing.hostellerId, outing);
      });
    return map;
  }, [db.outings]);

  const searchText = search.trim().toLowerCase();

  const liveRows = activeHostellers
    .map((hosteller) => ({
      hosteller,
      outing: openOutings.get(hosteller.id) || null,
      lastReturn: latestReturns.get(hosteller.id) || null,
    }))
    .filter((row) => {
      const matchesSearch =
        !searchText ||
        `${row.hosteller.fullName} ${row.hosteller.roomNumber} ${row.hosteller.username}`
          .toLowerCase()
          .includes(searchText);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'outside' ? Boolean(row.outing) : !row.outing);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (Boolean(a.outing) !== Boolean(b.outing)) return a.outing ? -1 : 1;
      return a.hosteller.fullName.localeCompare(b.hosteller.fullName);
    });

  const historyRows = db.outings
    .map((outing) => ({
      outing,
      hosteller: db.hostellers.find((hosteller) => hosteller.id === outing.hostellerId),
    }))
    .filter((row) => row.hosteller)
    .filter((row) => {
      const matchesSearch =
        !searchText ||
        `${row.hosteller.fullName} ${row.hosteller.roomNumber}`
          .toLowerCase()
          .includes(searchText);
      const matchesHosteller =
        hostellerFilter === 'all' || row.hosteller.id === hostellerFilter;
      const matchesDate = !dateFilter || toDateInput(row.outing.outAt) === dateFilter;
      return matchesSearch && matchesHosteller && matchesDate;
    })
    .sort((a, b) => new Date(b.outing.outAt).getTime() - new Date(a.outing.outAt).getTime());

  const returnedToday = db.outings.filter(
    (outing) => outing.inAt && toDateInput(outing.inAt) === toDateInput(now),
  ).length;
  const outingsToday = db.outings.filter(
    (outing) => toDateInput(outing.outAt) === toDateInput(now),
  ).length;

  const resetHistoryFilters = () => {
    setSearch('');
    setDateFilter('');
    setHostellerFilter('all');
  };

  return (
    <>
      <PageHeader
        title="In/Out Tracking"
        subtitle="Live inside/outside status and the full movement history of every hosteller."
      />

      <div className="stat-grid">
        <StatCard
          label="Currently Outside"
          value={openOutings.size}
          hint="Open outings with no clock-in yet"
          tone="warning"
        />
        <StatCard
          label="Currently Inside"
          value={activeHostellers.length - openOutings.size}
          hint="Active hostellers in the hostel"
          tone="success"
        />
        <StatCard label="Today's Outings" value={outingsToday} hint="Clock-outs recorded today" tone="info" />
        <StatCard label="Returned Today" value={returnedToday} hint="Clock-ins recorded today" />
      </div>

      <div className="row" style={{ marginTop: 18, marginBottom: 12 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'live' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('live')}
        >
          Current status
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('history')}
        >
          Outing history
        </button>
      </div>

      {tab === 'live' ? (
        <Card
          title="Current hosteller status"
          subtitle="Durations update automatically while hostellers are outside"
          flush
        >
          <div className="card-body">
            <div className="toolbar">
              <Field className="field-grow" label="Search hosteller" htmlFor="live-search">
                <Input
                  id="live-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, room or username"
                />
              </Field>
              <Field label="Status" htmlFor="live-status">
                <Select
                  id="live-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Everyone</option>
                  <option value="inside">Inside hostel</option>
                  <option value="outside">Outside hostel</option>
                </Select>
              </Field>
            </div>
          </div>

          {liveRows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hosteller</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Clocked out</th>
                    <th>Clock out location</th>
                    <th>Time outside</th>
                    <th>Last return</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRows.map(({ hosteller, outing, lastReturn }) => (
                    <tr key={hosteller.id}>
                      <td>
                        <Link className="cell-strong" to={`/admin/hostellers/${hosteller.id}`}>
                          {hosteller.fullName}
                        </Link>
                        <div className="cell-muted">@{hosteller.username}</div>
                      </td>
                      <td>{hosteller.roomNumber}</td>
                      <td>
                        <StatusBadge status={outing ? 'outside' : 'inside'} />
                      </td>
                      <td className="num">{outing ? formatDateTime(outing.outAt) : '—'}</td>
                      <td>{outing ? <LocationLink outing={outing} /> : '—'}</td>
                      <td className="num">
                        {outing
                          ? formatDuration(now.getTime() - new Date(outing.outAt).getTime())
                          : '—'}
                      </td>
                      <td className="num">
                        {lastReturn ? (
                          <>
                            {formatDateTime(lastReturn.inAt)}
                            <div className="cell-muted">
                              {formatDuration(lastReturn.durationMs)}
                            </div>
                          </>
                        ) : (
                          <span className="cell-muted">No completed outing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No hostellers match this filter"
              message="Try clearing the search or choosing a different status."
            />
          )}
        </Card>
      ) : (
        <Card title="Outing history" subtitle="All clock-out and clock-in records" flush>
          <div className="card-body">
            <div className="toolbar">
              <Field className="field-grow" label="Search hosteller" htmlFor="history-search">
                <Input
                  id="history-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or room number"
                />
              </Field>
              <Field label="Hosteller" htmlFor="history-hosteller">
                <Select
                  id="history-hosteller"
                  value={hostellerFilter}
                  onChange={(event) => setHostellerFilter(event.target.value)}
                >
                  <option value="all">All hostellers</option>
                  {db.hostellers.map((hosteller) => (
                    <option key={hosteller.id} value={hosteller.id}>
                      {hosteller.fullName} (Room {hosteller.roomNumber})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Outing date" htmlFor="history-date">
                <Input
                  id="history-date"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                />
              </Field>
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetHistoryFilters}>
                Clear filters
              </button>
            </div>
          </div>

          {historyRows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hosteller</th>
                    <th>Room</th>
                    <th>Clock out</th>
                    <th>Clock out location</th>
                    <th>Clock in</th>
                    <th>Total time outside</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map(({ outing, hosteller }) => (
                    <tr key={outing.id}>
                      <td>
                        <Link className="cell-strong" to={`/admin/hostellers/${hosteller.id}`}>
                          {hosteller.fullName}
                        </Link>
                      </td>
                      <td>{hosteller.roomNumber}</td>
                      <td className="num">
                        {formatDate(outing.outAt)}
                        <div className="cell-muted">{formatTime(outing.outAt)}</div>
                      </td>
                      <td>
                        <LocationLink outing={outing} />
                      </td>
                      <td className="num">
                        {outing.inAt ? (
                          <>
                            {formatDate(outing.inAt)}
                            <div className="cell-muted">{formatTime(outing.inAt)}</div>
                          </>
                        ) : (
                          <span className="cell-muted">Not yet returned</span>
                        )}
                      </td>
                      <td className="num">
                        {formatDuration(
                          outing.inAt
                            ? outing.durationMs
                            : now.getTime() - new Date(outing.outAt).getTime(),
                        )}
                        {!outing.inAt ? <div className="cell-muted">In progress</div> : null}
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
              title="No outings found"
              message="Adjust the filters, or wait for hostellers to clock out from their dashboard."
            />
          )}
        </Card>
      )}
    </>
  );
}
