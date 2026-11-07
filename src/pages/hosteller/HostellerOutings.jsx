import { StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import useNow from '../../hooks/useNow';
import { formatDate, formatDateTime, formatDuration, formatTime } from '../../lib/dates';

export default function HostellerOutings() {
  const { user } = useAuth();
  const { db } = useData();
  const now = useNow(15000);

  const hosteller = user;
  if (!hosteller) return null;

  const outings = db.outings
    .filter((outing) => outing.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.outAt).getTime() - new Date(a.outAt).getTime());
  const activeOuting = outings.find((outing) => !outing.inAt);
  const totalTimeOutside = outings.reduce(
    (total, outing) =>
      total +
      (outing.inAt
        ? outing.durationMs
        : now.getTime() - new Date(outing.outAt).getTime()),
    0,
  );

  return (
    <>
      <PageHeader
        title="My Outings"
        subtitle="Every clock-out and clock-in recorded from your dashboard, with the captured location."
        actions={<StatusBadge status={activeOuting ? 'outside' : 'inside'} />}
      />

      <div className="stat-grid">
        <StatCard label="Total Outings" value={outings.length} hint="Recorded clock-outs" />
        <StatCard
          label="Current Status"
          value={activeOuting ? 'Outside' : 'Inside'}
          hint={
            activeOuting
              ? `Since ${formatDateTime(activeOuting.outAt)}`
              : 'You are currently in the hostel'
          }
          tone={activeOuting ? 'warning' : 'success'}
        />
        <StatCard
          label="Time Outside (total)"
          value={formatDuration(totalTimeOutside)}
          hint="Across all recorded outings"
        />
        <StatCard
          label="Last Return"
          value={
            outings.find((outing) => outing.inAt)
              ? formatTime(outings.find((outing) => outing.inAt).inAt)
              : '—'
          }
          hint={
            outings.find((outing) => outing.inAt)
              ? formatDate(outings.find((outing) => outing.inAt).inAt)
              : 'No completed outing yet'
          }
        />
      </div>

      <Card
        title="Outing history"
        subtitle="Locations are captured only when your browser grants permission."
        flush
        className=""
      >
        {outings.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Clocked out</th>
                  <th>Clock-out location</th>
                  <th>Clocked in</th>
                  <th>Time outside</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {outings.map((outing) => (
                  <tr key={outing.id}>
                    <td className="num">
                      {formatDate(outing.outAt)}
                      <div className="cell-muted">{formatTime(outing.outAt)}</div>
                    </td>
                    <td>
                      {outing.outLat !== null && outing.outLat !== undefined ? (
                        <>
                          <a
                            href={`https://www.google.com/maps?q=${outing.outLat},${outing.outLng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on map
                          </a>
                          <div className="cell-muted">
                            {Number(outing.outLat).toFixed(5)}, {Number(outing.outLng).toFixed(5)}
                          </div>
                        </>
                      ) : (
                        <span className="cell-muted">Location not captured</span>
                      )}
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
            title="No outings recorded"
            message="Use the Clock Out button on your dashboard when you leave the hostel."
          />
        )}
      </Card>

      <p className="small muted" style={{ marginTop: 14 }}>
        Only one outing can be active at a time. Clock in when you return so the hostel keeps an
        accurate record.
      </p>
    </>
  );
}
