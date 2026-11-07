import { useEffect, useState } from 'react';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useNow from '../../hooks/useNow';
import { formatDate, formatDateTime, formatWeekday } from '../../lib/dates';
import { currentPoll, isPollLocked, pollStatus, pollWeekLabel } from '../../lib/food';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

export default function HostellerFood() {
  const { user } = useAuth();
  const { db, submitFoodSelection } = useData();
  const toast = useToast();
  const now = useNow(30000);

  const hosteller = user;
  const poll = currentPoll(db.foodPolls, now);
  const selection = poll
    ? db.foodSelections.find(
        (item) => item.pollId === poll.id && item.hostellerId === hosteller.id,
      )
    : null;
  const locked = poll ? isPollLocked(poll, now) : true;

  const [days, setDays] = useState({});

  useEffect(() => {
    if (!poll) return;
    const next = {};
    poll.days.forEach((day) => {
      const picks = selection?.days?.[day.date];
      next[day.date] = {
        breakfast: Boolean(picks?.breakfast),
        lunch: Boolean(picks?.lunch),
        dinner: Boolean(picks?.dinner),
      };
    });
    setDays(next);
  }, [poll?.id, selection?.updatedAt]);

  if (!hosteller) return null;

  const toggleMeal = (date, meal) => {
    if (locked) return;
    setDays((current) => ({
      ...current,
      [date]: { ...current[date], [meal]: !current[date]?.[meal] },
    }));
  };

  const selectedMeals = Object.values(days).reduce(
    (total, picks) =>
      total +
      (picks?.breakfast ? 1 : 0) +
      (picks?.lunch ? 1 : 0) +
      (picks?.dinner ? 1 : 0),
    0,
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!poll) return;
    if (locked) {
      toast.error('This food poll is closed. Selections can no longer be changed.');
      return;
    }
    const result = submitFoodSelection(poll.id, hosteller.id, days);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      result.updated
        ? 'Your food selections were updated.'
        : 'Your weekly food selections were submitted.',
    );
  };

  return (
    <>
      <PageHeader
        title="Weekly Food Poll"
        subtitle="Choose the meals you need for each day. Only one submission is kept per week, and you can edit before the deadline."
        actions={poll ? <StatusBadge status={pollStatus(poll, now)} /> : null}
      />

      {!poll ? (
        <Card>
          <EmptyState
            title="No food poll available"
            message="The admin has not created a weekly food poll yet. Check back later."
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="stack">
            <Card
              title={`Week ${pollWeekLabel(poll)}`}
              subtitle={`Submission deadline: ${formatDateTime(poll.deadline)}`}
              actions={
                selection ? (
                  <Badge tone="info">Submitted {formatDateTime(selection.updatedAt)}</Badge>
                ) : (
                  <Badge tone="warning">Not submitted yet</Badge>
                )
              }
            >
              {locked ? (
                <div className="banner banner-warning">
                  <p>
                    This poll is closed. Your saved selections are shown below and cannot be changed.
                    Contact the hostel office if you need help.
                  </p>
                </div>
              ) : selection ? (
                <div className="banner banner-success">
                  <p>
                    Your selections are saved. You can change them any time before{' '}
                    {formatDateTime(poll.deadline)}.
                  </p>
                </div>
              ) : (
                <div className="banner banner-info">
                  <p>
                    Select the meals you need and submit before {formatDateTime(poll.deadline)}.
                  </p>
                </div>
              )}

              <div className="spread" style={{ marginTop: 16 }}>
                <p className="small muted" style={{ margin: 0 }}>
                  {selectedMeals} meal{selectedMeals === 1 ? '' : 's'} selected for the week
                </p>
                <Button type="submit" disabled={locked}>
                  {selection ? 'Update selections' : 'Submit selections'}
                </Button>
              </div>
            </Card>

            <Card title="Your meal choices" subtitle="Each day has breakfast, lunch and dinner" flush>
              {poll.days.map((day) => {
                const picks = days[day.date] || {};
                const dayCount =
                  (picks.breakfast ? 1 : 0) + (picks.lunch ? 1 : 0) + (picks.dinner ? 1 : 0);
                return (
                  <div className="meal-day" key={day.date}>
                    <div className="meal-day-head">
                      <h3 className="meal-day-name">
                        {formatWeekday(day.date)} · {formatDate(day.date)}
                      </h3>
                      <Badge tone={dayCount ? 'info' : 'neutral'}>
                        {dayCount} meal{dayCount === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <div className="meal-chips">
                      {MEALS.map((meal) => {
                        const checked = Boolean(picks[meal.key]);
                        return (
                          <label
                            key={meal.key}
                            className={`meal-chip${checked ? ' selected' : ''}${
                              locked ? ' meal-chip-disabled' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={locked}
                              onChange={() => toggleMeal(day.date, meal.key)}
                            />
                            {meal.label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="meal-menu">
                      <strong>Menu:</strong> {day.breakfast} · {day.lunch} · {day.dinner}
                    </p>
                  </div>
                );
              })}
            </Card>

            <Card title="How the food poll works">
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li>One submission per hosteller per weekly poll.</li>
                <li>You can edit your choices until the submission deadline.</li>
                <li>After the deadline or when the admin closes the poll, selections are locked.</li>
                <li>Only active hostellers are included in the meal counts.</li>
              </ul>
            </Card>
          </div>
        </form>
      )}
    </>
  );
}
