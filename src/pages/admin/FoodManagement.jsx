import { useEffect, useMemo, useState } from 'react';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import {
  addDays,
  formatDate,
  formatDateTime,
  formatDateTimeInput,
  formatWeekday,
  startOfWeekMonday,
  toDateInput,
} from '../../lib/dates';
import {
  currentPoll,
  getPollStats,
  isPollLocked,
  pollStatus,
  pollWeekLabel,
} from '../../lib/food';
import { validatePoll } from '../../lib/validation';

function emptyMenu(index) {
  return { breakfast: '', lunch: '', dinner: '' };
}

function nextWeekStart(polls) {
  const monday = startOfWeekMonday(new Date());
  const thisWeek = toDateInput(monday);
  if (polls.some((poll) => poll.weekStart === thisWeek)) {
    return toDateInput(addDays(monday, 7));
  }
  return thisWeek;
}

function buildDays(weekStart, previousDays = []) {
  const start = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => ({
    date: toDateInput(addDays(start, index)),
    ...(previousDays[index]
      ? {
          breakfast: previousDays[index].breakfast,
          lunch: previousDays[index].lunch,
          dinner: previousDays[index].dinner,
        }
      : emptyMenu(index)),
  }));
}

function CreatePollModal({ open, onClose, onCreated }) {
  const { db, createPoll } = useData();
  const toast = useToast();
  const initialWeekStart = nextWeekStart(db.foodPolls);
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(18, 0, 0, 0);

  const [values, setValues] = useState({
    weekStart: initialWeekStart,
    deadline: formatDateTimeInput(deadline),
    days: buildDays(initialWeekStart),
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const weekStart = nextWeekStart(db.foodPolls);
    setValues({
      weekStart,
      deadline: formatDateTimeInput(deadline),
      days: buildDays(weekStart),
    });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeWeekStart = (rawValue) => {
    if (!rawValue) {
      setValues((current) => ({ ...current, weekStart: '' }));
      return;
    }
    const monday = startOfWeekMonday(new Date(`${rawValue}T00:00:00`));
    const weekStart = toDateInput(monday);
    setValues((current) => ({
      ...current,
      weekStart,
      days: buildDays(weekStart, current.days),
    }));
  };

  const updateMenu = (index, meal, value) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) =>
        dayIndex === index ? { ...day, [meal]: value } : day,
      ),
    }));
    setErrors((current) => ({ ...current, [`${meal}-${values.days[index]?.date}`]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validatePoll(
      { ...values, days: buildDays(values.weekStart, values.days) },
      { polls: db.foodPolls },
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Complete the week, deadline and menu before creating the poll.');
      return;
    }
    const result = createPoll({
      ...values,
      days: buildDays(values.weekStart, values.days),
      deadline: new Date(values.deadline).toISOString(),
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Weekly food poll created. Hostellers can submit meal selections.');
    onCreated(result.poll.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Create weekly food poll"
      description="Set the week, submission deadline and menu for each day."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-poll-form">
            Create poll
          </Button>
        </>
      }
    >
      <form id="create-poll-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field
            label="Week start (Monday)"
            htmlFor="poll-week"
            required
            error={errors.weekStart}
            hint="Dates are adjusted to the Monday of the selected week."
          >
            <Input
              id="poll-week"
              type="date"
              value={values.weekStart}
              error={errors.weekStart}
              onChange={(event) => changeWeekStart(event.target.value)}
            />
          </Field>
          <Field
            label="Submission deadline"
            htmlFor="poll-deadline"
            required
            error={errors.deadline}
          >
            <Input
              id="poll-deadline"
              type="datetime-local"
              value={values.deadline}
              error={errors.deadline}
              onChange={(event) => setValues({ ...values, deadline: event.target.value })}
            />
          </Field>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Weekly menu</h3>
          <div className="stack-sm">
            {values.days.map((day, index) => (
              <div key={day.date}>
                <p className="cell-strong" style={{ marginBottom: 6 }}>
                  {formatWeekday(day.date)} · {formatDate(day.date)}
                </p>
                <div className="form-grid-3">
                  <Field label="Breakfast" htmlFor={`b-${day.date}`} error={errors[`breakfast-${day.date}`]}>
                    <Input
                      id={`b-${day.date}`}
                      value={day.breakfast}
                      error={errors[`breakfast-${day.date}`]}
                      onChange={(event) => updateMenu(index, 'breakfast', event.target.value)}
                      placeholder="e.g. Poha & Tea"
                    />
                  </Field>
                  <Field label="Lunch" htmlFor={`l-${day.date}`} error={errors[`lunch-${day.date}`]}>
                    <Input
                      id={`l-${day.date}`}
                      value={day.lunch}
                      error={errors[`lunch-${day.date}`]}
                      onChange={(event) => updateMenu(index, 'lunch', event.target.value)}
                      placeholder="e.g. Dal, Rice & Roti"
                    />
                  </Field>
                  <Field label="Dinner" htmlFor={`d-${day.date}`} error={errors[`dinner-${day.date}`]}>
                    <Input
                      id={`d-${day.date}`}
                      value={day.dinner}
                      error={errors[`dinner-${day.date}`]}
                      onChange={(event) => updateMenu(index, 'dinner', event.target.value)}
                      placeholder="e.g. Paneer & Roti"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function FoodManagement() {
  const { db, updatePoll, setPollStatus } = useData();
  const toast = useToast();
  const now = useNow(30000);

  const polls = useMemo(
    () => [...db.foodPolls].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [db.foodPolls],
  );

  const [selectedId, setSelectedId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [menuEditing, setMenuEditing] = useState(false);
  const [menuDraft, setMenuDraft] = useState([]);
  const [deadlineDraft, setDeadlineDraft] = useState('');

  const selectedPoll = polls.find((poll) => poll.id === selectedId) || polls[0] || null;
  const fallbackPoll = currentPoll(db.foodPolls, now);

  useEffect(() => {
    if (!selectedPoll) return;
    setMenuDraft(selectedPoll.days.map((day) => ({ ...day })));
    setDeadlineDraft(formatDateTimeInput(selectedPoll.deadline));
    setMenuEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoll?.id]);

  const stats = getPollStats(selectedPoll, db.foodSelections, db.hostellers);
  const status = selectedPoll ? pollStatus(selectedPoll, now) : 'none';
  const locked = selectedPoll ? isPollLocked(selectedPoll, now) : true;

  const submissionsById = new Map(
    stats.submissions.map((selection) => [selection.hostellerId, selection]),
  );

  const activeHostellers = db.hostellers.filter((hosteller) => hosteller.active);
  const notSubmitted = activeHostellers.filter(
    (hosteller) => !submissionsById.has(hosteller.id),
  );

  const saveDeadline = () => {
    if (!selectedPoll) return;
    if (!deadlineDraft) {
      toast.error('Choose a submission deadline.');
      return;
    }
    if (new Date(deadlineDraft).getTime() <= Date.now()) {
      toast.error('The deadline must be in the future.');
      return;
    }
    updatePoll(selectedPoll.id, { deadline: new Date(deadlineDraft).toISOString() });
    toast.success('Submission deadline updated.');
  };

  const startMenuEdit = () => {
    setMenuDraft(selectedPoll.days.map((day) => ({ ...day })));
    setMenuEditing(true);
  };

  const saveMenu = () => {
    const complete = menuDraft.every(
      (day) => day.breakfast.trim() && day.lunch.trim() && day.dinner.trim(),
    );
    if (!complete) {
      toast.error('Every day needs a breakfast, lunch and dinner entry.');
      return;
    }
    updatePoll(selectedPoll.id, {
      days: menuDraft.map((day) => ({
        date: day.date,
        breakfast: day.breakfast.trim(),
        lunch: day.lunch.trim(),
        dinner: day.dinner.trim(),
      })),
    });
    setMenuEditing(false);
    toast.success('Weekly menu updated for this poll.');
  };

  return (
    <>
      <PageHeader
        title="Food Management"
        subtitle="Create weekly food polls, set deadlines and read the meal counts hostellers submit."
        actions={
          <Button onClick={() => setCreateOpen(true)}>Create weekly poll</Button>
        }
      />

      <Card>
        <div className="toolbar">
          <Field className="field-grow" label="Select weekly poll" htmlFor="poll-select">
            <Select
              id="poll-select"
              value={selectedPoll?.id || ''}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={!polls.length}
            >
              {polls.length ? null : <option value="">No polls created yet</option>}
              {polls.map((poll) => (
                <option key={poll.id} value={poll.id}>
                  {pollWeekLabel(poll)} — {poll.status === 'closed' ? 'Closed' : 'Open'}
                </option>
              ))}
            </Select>
          </Field>
          {fallbackPoll && fallbackPoll.id !== selectedPoll?.id ? (
            <Button variant="secondary" onClick={() => setSelectedId(fallbackPoll.id)}>
              Go to current week
            </Button>
          ) : null}
        </div>
      </Card>

      {!selectedPoll ? (
        <Card className="stack" bodyClassName="">
          <EmptyState
            title="No food polls yet"
            message="Create a weekly poll so hostellers can choose the meals they need."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create weekly poll</Button>}
          />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: 18 }}>
          <Card
            title={`Week ${pollWeekLabel(selectedPoll)}`}
            subtitle={`Submission deadline: ${formatDateTime(selectedPoll.deadline)}`}
            actions={
              <>
                <StatusBadge status={status} />
                {selectedPoll.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setPollStatus(selectedPoll.id, 'closed');
                      toast.success('Food poll closed. Meal counts are now final.');
                    }}
                  >
                    Close poll
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPollStatus(selectedPoll.id, 'open');
                      toast.info(
                        new Date(selectedPoll.deadline).getTime() < Date.now()
                          ? 'Poll reopened. Set a new future deadline so hostellers can edit.'
                          : 'Poll reopened. Hostellers can edit until the deadline.',
                      );
                    }}
                  >
                    Reopen poll
                  </Button>
                )}
              </>
            }
          >
            <div className="toolbar">
              <Field label="Submission deadline" htmlFor="poll-deadline-edit">
                <Input
                  id="poll-deadline-edit"
                  type="datetime-local"
                  value={deadlineDraft}
                  onChange={(event) => setDeadlineDraft(event.target.value)}
                />
              </Field>
              <Button variant="secondary" onClick={saveDeadline}>
                Save deadline
              </Button>
              {menuEditing ? (
                <>
                  <Button variant="secondary" onClick={() => setMenuEditing(false)}>
                    Cancel menu edit
                  </Button>
                  <Button onClick={saveMenu}>Save menu</Button>
                </>
              ) : (
                <Button variant="secondary" onClick={startMenuEdit}>
                  Edit weekly menu
                </Button>
              )}
            </div>

            {locked ? (
              <div className="banner banner-warning" style={{ marginTop: 14 }}>
                <p>
                  {selectedPoll.status === 'closed'
                    ? 'This poll is closed. Hostellers can view their selections but cannot edit them.'
                    : 'The submission deadline has passed, so hostellers can no longer edit. Extend the deadline or reopen the poll.'}
                </p>
              </div>
            ) : null}

            <div className="detail-grid" style={{ marginTop: 18 }}>
              <div>
                <p className="detail-label">Submissions</p>
                <p className="detail-value">
                  {stats.submittedCount} of {stats.eligibleCount} active hostellers
                </p>
              </div>
              <div>
                <p className="detail-label">Total meals this week</p>
                <p className="detail-value">{stats.totals.meals}</p>
              </div>
              <div>
                <p className="detail-label">Breakfast plates</p>
                <p className="detail-value">{stats.totals.breakfast}</p>
              </div>
              <div>
                <p className="detail-label">Lunch plates</p>
                <p className="detail-value">{stats.totals.lunch}</p>
              </div>
              <div>
                <p className="detail-label">Dinner plates</p>
                <p className="detail-value">{stats.totals.dinner}</p>
              </div>
            </div>

            <div className="progress" style={{ marginTop: 14 }}>
              <span
                style={{
                  width: `${
                    stats.eligibleCount
                      ? Math.min(100, (stats.submittedCount / stats.eligibleCount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </Card>

          {menuEditing ? (
            <Card title="Edit weekly menu" subtitle="Menus are visible to all hostellers">
              <div className="stack-sm">
                {menuDraft.map((day, index) => (
                  <div key={day.date}>
                    <p className="cell-strong" style={{ marginBottom: 6 }}>
                      {formatWeekday(day.date)} · {formatDate(day.date)}
                    </p>
                    <div className="form-grid-3">
                      <Field label="Breakfast" htmlFor={`edit-b-${day.date}`}>
                        <Input
                          id={`edit-b-${day.date}`}
                          value={day.breakfast}
                          onChange={(event) =>
                            setMenuDraft((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, breakfast: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Lunch" htmlFor={`edit-l-${day.date}`}>
                        <Input
                          id={`edit-l-${day.date}`}
                          value={day.lunch}
                          onChange={(event) =>
                            setMenuDraft((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, lunch: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Dinner" htmlFor={`edit-d-${day.date}`}>
                        <Input
                          id={`edit-d-${day.date}`}
                          value={day.dinner}
                          onChange={(event) =>
                            setMenuDraft((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, dinner: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card
            title="Meal counts by day"
            subtitle="Active hosteller submissions only. Each hosteller is counted once per meal."
            flush
          >
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Breakfast</th>
                    <th>Lunch</th>
                    <th>Dinner</th>
                    <th>Total meals</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row) => (
                    <tr key={row.date}>
                      <td>
                        <span className="cell-strong">{formatWeekday(row.date)}</span>
                        <div className="cell-muted">{formatDate(row.date)}</div>
                      </td>
                      <td>
                        {row.breakfastCount} people
                        <div className="cell-muted">{row.breakfast}</div>
                      </td>
                      <td>
                        {row.lunchCount} people
                        <div className="cell-muted">{row.lunch}</div>
                      </td>
                      <td>
                        {row.dinnerCount} people
                        <div className="cell-muted">{row.dinner}</div>
                      </td>
                      <td className="num">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="cell-strong">Week total</td>
                    <td className="cell-strong">{stats.totals.breakfast}</td>
                    <td className="cell-strong">{stats.totals.lunch}</td>
                    <td className="cell-strong">{stats.totals.dinner}</td>
                    <td className="cell-strong">{stats.totals.meals}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card
            title="Final food quantity required"
            subtitle="Plates to prepare based on the current submissions"
          >
            <div className="detail-grid">
              <div>
                <p className="detail-label">Breakfast</p>
                <p className="detail-value">{stats.totals.breakfast} plates this week</p>
              </div>
              <div>
                <p className="detail-label">Lunch</p>
                <p className="detail-value">{stats.totals.lunch} plates this week</p>
              </div>
              <div>
                <p className="detail-label">Dinner</p>
                <p className="detail-value">{stats.totals.dinner} plates this week</p>
              </div>
              <div>
                <p className="detail-label">All meals</p>
                <p className="detail-value">{stats.totals.meals} plates this week</p>
              </div>
            </div>
            {notSubmitted.length ? (
              <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
                Awaiting submissions from: {notSubmitted.map((hosteller) => hosteller.fullName).join(', ')}.
              </p>
            ) : (
              <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
                Every active hosteller has submitted for this week.
              </p>
            )}
          </Card>

          <Card
            title="Individual hosteller selections"
            subtitle="B = breakfast, L = lunch, D = dinner. Highlighted letters are selected."
            flush
          >
            {stats.submissions.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hosteller</th>
                      {selectedPoll.days.map((day) => (
                        <th key={day.date}>
                          {formatWeekday(day.date)}
                          <div className="cell-muted" style={{ fontWeight: 400, textTransform: 'none' }}>
                            {formatDate(day.date)}
                          </div>
                        </th>
                      ))}
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHostellers.map((hosteller) => {
                      const selection = submissionsById.get(hosteller.id);
                      if (!selection) return null;
                      return (
                        <tr key={hosteller.id}>
                          <td>
                            <span className="cell-strong">{hosteller.fullName}</span>
                            <div className="cell-muted">Room {hosteller.roomNumber}</div>
                          </td>
                          {selectedPoll.days.map((day) => {
                            const picks = selection.days?.[day.date] || {};
                            return (
                              <td key={day.date}>
                                <span className="selection-cell">
                                  <span
                                    className={`meal-tag${picks.breakfast ? ' on' : ''}`}
                                    title="Breakfast"
                                  >
                                    B
                                  </span>
                                  <span className={`meal-tag${picks.lunch ? ' on' : ''}`} title="Lunch">
                                    L
                                  </span>
                                  <span
                                    className={`meal-tag${picks.dinner ? ' on' : ''}`}
                                    title="Dinner"
                                  >
                                    D
                                  </span>
                                </span>
                              </td>
                            );
                          })}
                          <td className="cell-muted nowrap">{formatDateTime(selection.updatedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No selections submitted"
                message="Meal counts will update as soon as hostellers submit their weekly choices."
              />
            )}
          </Card>
        </div>
      )}

      <CreatePollModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(pollId) => setSelectedId(pollId)}
      />
    </>
  );
}
