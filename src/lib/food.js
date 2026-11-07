import { parseDateInput, toDateInput } from './dates';

export function isPollLocked(poll, now = new Date()) {
  if (!poll) return true;
  if (poll.status !== 'open') return true;
  return new Date(poll.deadline).getTime() < now.getTime();
}

export function pollStatus(poll, now = new Date()) {
  if (!poll) return 'none';
  if (poll.status === 'closed') return 'closed';
  return isPollLocked(poll, now) ? 'deadline-passed' : 'open';
}

export function currentPoll(polls = [], now = new Date()) {
  if (!polls.length) return null;
  const today = toDateInput(now);
  const sorted = [...polls].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const thisWeek = sorted.find((poll) => poll.weekStart <= today && today <= poll.weekEnd);
  if (thisWeek) return thisWeek;

  const open = sorted
    .filter((poll) => !isPollLocked(poll, now))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))[0];
  if (open) return open;

  return sorted[0];
}

export function getPollStats(poll, selections = [], hostellers = []) {
  const empty = {
    rows: [],
    totals: { breakfast: 0, lunch: 0, dinner: 0, meals: 0 },
    submissions: [],
    submittedCount: 0,
    eligibleCount: 0,
  };
  if (!poll) return empty;

  const activeIds = new Set(hostellers.filter((hosteller) => hosteller.active).map((hosteller) => hosteller.id));
  const submissions = selections.filter(
    (selection) => selection.pollId === poll.id && activeIds.has(selection.hostellerId),
  );

  const rows = (poll.days || []).map((day) => {
    let breakfast = 0;
    let lunch = 0;
    let dinner = 0;
    submissions.forEach((selection) => {
      const picked = selection.days?.[day.date];
      if (!picked) return;
      if (picked.breakfast) breakfast += 1;
      if (picked.lunch) lunch += 1;
      if (picked.dinner) dinner += 1;
    });
    return {
      ...day,
      breakfastCount: breakfast,
      lunchCount: lunch,
      dinnerCount: dinner,
      total: breakfast + lunch + dinner,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      breakfast: acc.breakfast + row.breakfastCount,
      lunch: acc.lunch + row.lunchCount,
      dinner: acc.dinner + row.dinnerCount,
      meals: acc.meals + row.total,
    }),
    { breakfast: 0, lunch: 0, dinner: 0, meals: 0 },
  );

  return {
    rows,
    totals,
    submissions,
    submittedCount: submissions.length,
    eligibleCount: activeIds.size,
  };
}

export function selectionFor(selection) {
  const meals = { breakfast: 0, lunch: 0, dinner: 0 };
  if (!selection) return meals;
  Object.values(selection.days || {}).forEach((day) => {
    if (day.breakfast) meals.breakfast += 1;
    if (day.lunch) meals.lunch += 1;
    if (day.dinner) meals.dinner += 1;
  });
  return meals;
}

export function pollWeekLabel(poll) {
  if (!poll) return '—';
  const start = parseDateInput(poll.weekStart);
  const end = parseDateInput(poll.weekEnd);
  const format = (date) =>
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${format(start)} – ${format(end)} ${end.getFullYear()}`;
}
