import {
  daysBetween,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  monthLabel,
  parseDateInput,
  startOfDay,
  toDateInput,
} from './dates';
import { rentSummary } from './rent';
import { currentPoll, isPollLocked, pollWeekLabel } from './food';

const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };

function sortNotifications(list) {
  return list.sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function buildAdminNotifications(db, now = new Date()) {
  const notifications = [];
  const activeHostellers = db.hostellers.filter((hosteller) => hosteller.active);

  activeHostellers.forEach((hosteller) => {
    const summary = rentSummary(hosteller, db.rentPayments, now);
    if (summary.pending <= 0) return;
    const base = {
      hostellerId: hosteller.id,
      link: '/admin/rent',
      createdAt: summary.dueDate.toISOString(),
      meta: {
        period: summary.period,
        periodLabel: monthLabel(summary.period),
        pending: summary.pending,
        dueDate: summary.dueDate.toISOString(),
      },
    };
    if (summary.daysUntilDue < 0) {
      notifications.push({
        ...base,
        id: `rent-${hosteller.id}-${summary.period}-${summary.daysUntilDue}`,
        type: 'rent-overdue',
        category: 'rent',
        severity: 'danger',
        title: `Rent overdue — ${hosteller.fullName}`,
        message: `Room ${hosteller.roomNumber} · ${money(summary.pending)} pending since ${formatDate(
          summary.dueDate,
        )} (${Math.abs(summary.daysUntilDue)} days overdue).`,
      });
    } else if (summary.daysUntilDue === 0) {
      notifications.push({
        ...base,
        id: `rent-${hosteller.id}-${summary.period}-0`,
        type: 'rent-due-today',
        category: 'rent',
        severity: 'warning',
        title: `Rent due today — ${hosteller.fullName}`,
        message: `Room ${hosteller.roomNumber} · ${money(summary.pending)} is due today (${formatDate(
          summary.dueDate,
        )}).`,
      });
    } else if (summary.daysUntilDue <= 2) {
      notifications.push({
        ...base,
        id: `rent-${hosteller.id}-${summary.period}-${summary.daysUntilDue}`,
        type: 'rent-due-soon',
        category: 'rent',
        severity: 'warning',
        title: `Rent due in ${summary.daysUntilDue} day${summary.daysUntilDue === 1 ? '' : 's'} — ${
          hosteller.fullName
        }`,
        message: `Room ${hosteller.roomNumber} · ${money(summary.pending)} is due on ${formatDate(
          summary.dueDate,
        )}.`,
      });
    }
  });

  db.hostellers.forEach((hosteller) => {
    const created = new Date(hosteller.createdAt);
    if (Number.isNaN(created.getTime())) return;
    if (now.getTime() - created.getTime() > 7 * 86400000) return;
    notifications.push({
      id: `new-hosteller-${hosteller.id}`,
      type: 'hosteller-added',
      category: 'hosteller',
      severity: 'info',
      title: `New hosteller added — ${hosteller.fullName}`,
      message: `Room ${hosteller.roomNumber}, bed ${hosteller.bedNumber}. Login username: ${hosteller.username}.`,
      createdAt: hosteller.createdAt,
      hostellerId: hosteller.id,
      link: `/admin/hostellers/${hosteller.id}`,
    });
  });

  db.outings
    .filter((outing) => !outing.inAt)
    .forEach((outing) => {
      const hosteller = db.hostellers.find((item) => item.id === outing.hostellerId);
      if (!hosteller || !hosteller.active) return;
      notifications.push({
        id: `outside-${outing.id}`,
        type: 'hosteller-outside',
        category: 'outing',
        severity: 'info',
        title: `Outside hostel — ${hosteller.fullName}`,
        message: `Room ${hosteller.roomNumber} · clocked out at ${formatTime(outing.outAt)} and has been outside for ${formatDuration(
          now.getTime() - new Date(outing.outAt).getTime(),
        )}.`,
        createdAt: outing.outAt,
        hostellerId: hosteller.id,
        link: '/admin/tracking',
      });
    });

  db.foodPolls.forEach((poll) => {
    if (poll.status === 'open' && new Date(poll.deadline) > now) {
      const hoursLeft = (new Date(poll.deadline).getTime() - now.getTime()) / 3600000;
      if (hoursLeft <= 48) {
        const submitted = db.foodSelections.filter((selection) => selection.pollId === poll.id).length;
        notifications.push({
          id: `poll-deadline-${poll.id}`,
          type: 'food-deadline',
          category: 'food',
          severity: 'warning',
          title: 'Food poll deadline approaching',
          message: `Week ${pollWeekLabel(poll)} · deadline ${formatDateTime(
            poll.deadline,
          )}. ${submitted} of ${activeHostellers.length} hostellers have submitted.`,
          createdAt: new Date().toISOString(),
          link: '/admin/food',
        });
      }
    }
    if (poll.status === 'closed') {
      const closedAt = poll.closedAt || poll.deadline;
      if (now.getTime() - new Date(closedAt).getTime() <= 7 * 86400000) {
        notifications.push({
          id: `poll-closed-${poll.id}`,
          type: 'food-poll-closed',
          category: 'food',
          severity: 'info',
          title: 'Weekly food poll closed',
          message: `Poll for ${pollWeekLabel(poll)} is closed. Final meal counts are available.`,
          createdAt: closedAt,
          link: '/admin/food',
        });
      }
    }
  });

  return sortNotifications(notifications);
}

export function buildHostellerNotifications(db, hosteller, now = new Date()) {
  if (!hosteller) return [];
  const notifications = [];
  const summary = rentSummary(hosteller, db.rentPayments, now);

  if (summary.pending > 0) {
    if (summary.daysUntilDue < 0) {
      notifications.push({
        id: `h-rent-${hosteller.id}-${summary.period}`,
        type: 'rent-overdue',
        severity: 'danger',
        title: 'Rent payment overdue',
        message: `${money(summary.pending)} for ${monthLabel(summary.period)} was due on ${formatDate(
          summary.dueDate,
        )}. Please contact the hostel office.`,
        createdAt: summary.dueDate.toISOString(),
        link: '/hosteller/rent',
      });
    } else {
      notifications.push({
        id: `h-rent-${hosteller.id}-${summary.period}-${summary.daysUntilDue}`,
        type: 'rent-reminder',
        severity: summary.daysUntilDue <= 2 ? 'warning' : 'info',
        title:
          summary.daysUntilDue === 0
            ? 'Rent is due today'
            : `Rent is due ${
                summary.daysUntilDue === 1 ? 'tomorrow' : `in ${summary.daysUntilDue} days`
              }`,
        message: `${money(summary.pending)} for ${monthLabel(summary.period)} is due on ${formatDate(
          summary.dueDate,
        )}.`,
        createdAt: new Date().toISOString(),
        link: '/hosteller/rent',
      });
    }
  }

  const activeOuting = db.outings.find((outing) => outing.hostellerId === hosteller.id && !outing.inAt);
  if (activeOuting) {
    notifications.push({
      id: `h-out-${activeOuting.id}`,
      type: 'hosteller-outside',
      severity: 'info',
      title: 'You are currently marked outside',
      message: `Clocked out at ${formatDateTime(activeOuting.outAt)}. Remember to clock in when you return.`,
      createdAt: activeOuting.outAt,
      link: '/hosteller/outings',
    });
  }

  const poll = currentPoll(db.foodPolls, now);
  if (poll) {
    const locked = isPollLocked(poll, now);
    const selection = db.foodSelections.find(
      (item) => item.pollId === poll.id && item.hostellerId === hosteller.id,
    );
    const deadlineText = formatDateTime(poll.deadline);
    if (locked) {
      notifications.push({
        id: `h-poll-closed-${poll.id}`,
        type: 'food-poll-closed',
        severity: 'info',
        title: 'Weekly food poll is closed',
        message: `Selections for ${pollWeekLabel(poll)} are locked. ${
          selection ? 'Your submitted meals are shown in the food poll page.' : 'You did not submit for this week.'
        }`,
        createdAt: poll.closedAt || poll.deadline,
        link: '/hosteller/food',
      });
    } else if (!selection) {
      notifications.push({
        id: `h-poll-open-${poll.id}`,
        type: 'food-poll-open',
        severity: 'warning',
        title: 'Submit your weekly food preferences',
        message: `The poll for ${pollWeekLabel(poll)} closes on ${deadlineText}. Select the meals you need.`,
        createdAt: poll.createdAt,
        link: '/hosteller/food',
      });
    } else {
      notifications.push({
        id: `h-poll-submitted-${poll.id}-${selection.updatedAt}`,
        type: 'food-poll-submitted',
        severity: 'info',
        title: 'Food preferences submitted',
        message: `Your meals for ${pollWeekLabel(poll)} were saved. You can edit them until ${deadlineText}.`,
        createdAt: selection.updatedAt,
        link: '/hosteller/food',
      });
    }
  }

  if (summary.lastPayment && now.getTime() - new Date(summary.lastPayment.date).getTime() <= 7 * 86400000) {
    notifications.push({
      id: `h-paid-${summary.lastPayment.id}`,
      type: 'payment-recorded',
      severity: 'info',
      title: 'Rent payment recorded',
      message: `${money(summary.lastPayment.amount)} received on ${formatDate(
        summary.lastPayment.date,
      )} via ${summary.lastPayment.method}.`,
      createdAt: summary.lastPayment.createdAt || summary.lastPayment.date,
      link: '/hosteller/rent',
    });
  }

  return sortNotifications(notifications);
}

export function unreadCount(db, notifications, now = new Date()) {
  const dismissed = new Set(db.dismissedNotifications || []);
  return notifications.filter((notification) => !dismissed.has(notification.id)).length;
}

export function daysUntilFoodDeadline(poll, now = new Date()) {
  if (!poll) return null;
  return daysBetween(now, parseDateInput(toDateInput(poll.deadline)) || now);
}
