import { daysBetween, monthKey, pad2, parseDateInput, startOfDay } from './dates';

/**
 * Rent is tracked per calendar month ("cycle"). The advance/security deposit
 * is a separate ledger and is never applied to rent automatically.
 */
export function rentCycle(hosteller, now = new Date()) {
  const today = startOfDay(now);
  const join = parseDateInput(hosteller.joinDate) || today;
  const dueDay = Math.min(28, Math.max(1, Number(hosteller.rentDueDay) || 1));

  let year = today.getFullYear();
  let month = today.getMonth();
  if (today < new Date(join.getFullYear(), join.getMonth(), 1)) {
    year = join.getFullYear();
    month = join.getMonth();
  }

  let dueDate = new Date(year, month, dueDay);
  if (dueDate < startOfDay(join)) {
    dueDate = new Date(year, month + 1, dueDay);
  }

  const period = monthKey(dueDate);
  return {
    dueDate,
    period,
    dueDay,
    periodLabel: dueDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

export function rentSummary(hosteller, rentPayments = [], now = new Date()) {
  const cycle = rentCycle(hosteller, now);
  const rent = Number(hosteller.monthlyRent) || 0;
  const payments = rentPayments
    .filter((payment) => payment.hostellerId === hosteller.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const paidThisCycle = payments
    .filter((payment) => payment.period === cycle.period)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  // Older unpaid cycles are surfaced as well, but the current cycle is what the
  // admin records against. This keeps overdue rent visible after month change.
  const pending = Math.max(0, rent - paidThisCycle);
  const daysUntilDue = daysBetween(now, cycle.dueDate);

  let status = 'pending';
  if (pending === 0) status = 'paid';
  else if (startOfDay(now) > startOfDay(cycle.dueDate)) status = 'overdue';

  const lastPayment = payments[0] || null;

  return {
    ...cycle,
    rent,
    paidThisCycle,
    pending,
    daysUntilDue,
    status,
    lastPayment,
    overpaid: Math.max(0, paidThisCycle - rent),
    dueLabel: `${pad2(dueDateDay(cycle.dueDate))} of every month`,
  };
}

function dueDateDay(date) {
  return new Date(date).getDate();
}

export function advanceBalance(hostellerId, advancePayments = []) {
  return advancePayments
    .filter((entry) => entry.hostellerId === hostellerId)
    .reduce((sum, entry) => sum + (entry.type === 'refund' ? -1 : 1) * Number(entry.amount || 0), 0);
}

export function rentStatusLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  return 'Pending';
}

export function totalPendingRent(hostellers, rentPayments, now = new Date()) {
  return hostellers
    .filter((hosteller) => hosteller.active)
    .reduce((sum, hosteller) => sum + rentSummary(hosteller, rentPayments, now).pending, 0);
}
