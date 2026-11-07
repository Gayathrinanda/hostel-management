import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createSeedDatabase } from '../data/seed';
import { loadDatabase, saveDatabase } from '../services/database';
import { addDays, parseDateInput, toDateInput } from '../lib/dates';
import { isPollLocked } from '../lib/food';
import { rentSummary } from '../lib/rent';
import { useToast } from './ToastContext';

const DataContext = createContext(null);

const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toStoredDate = (value) => {
  const parsed = parseDateInput(value);
  return parsed ? parsed.toISOString() : new Date().toISOString();
};

export function DataProvider({ children }) {
  const [db, setDb] = useState(() => loadDatabase() || createSeedDatabase());
  const toast = useToast();
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    const saved = saveDatabase(db);
    if (!saved) {
      setStorageWarning(
        'Browser storage is full. Document uploads take the most space — remove an ID proof or reset demo data in Settings.',
      );
    }
  }, [db]);

  const addHosteller = useCallback(
    (values) => {
      const username = String(values.username).trim();
      const clash =
        db.hostellers.some((item) => item.username.toLowerCase() === username.toLowerCase()) ||
        db.admins.some((item) => item.username.toLowerCase() === username.toLowerCase());
      if (clash) {
        return { ok: false, message: 'That username is already taken.' };
      }

      const now = new Date();
      const hosteller = {
        id: uid('hst'),
        fullName: String(values.fullName).trim(),
        phone: String(values.phone).trim(),
        email: String(values.email).trim(),
        joinDate: values.joinDate,
        emergencyContact: String(values.emergencyContact).trim(),
        idType: values.idType,
        idNumber: String(values.idNumber).trim(),
        idProof: values.idProof || null,
        roomNumber: String(values.roomNumber).trim(),
        bedNumber: String(values.bedNumber).trim(),
        monthlyRent: Number(values.monthlyRent),
        rentDueDay: Number(values.rentDueDay),
        washingMachine: values.washingEnabled
          ? {
              enabled: true,
              amount: Number(values.washingAmount) || 0,
              startDate: values.washingStartDate || values.joinDate,
            }
          : { enabled: false, amount: 0, startDate: '' },
        username,
        password: values.password,
        active: true,
        createdAt: now.toISOString(),
      };

      const advanceAmount = Number(values.advanceDeposit) || 0;
      const advanceEntry =
        advanceAmount > 0
          ? {
              id: uid('adv'),
              hostellerId: hosteller.id,
              type: 'deposit',
              amount: advanceAmount,
              date: toStoredDate(values.joinDate),
              method: 'Cash',
              reference: '',
              note: 'Security deposit at joining',
              createdAt: now.toISOString(),
            }
          : null;

      setDb((previous) => ({
        ...previous,
        hostellers: [...previous.hostellers, hosteller],
        advancePayments: advanceEntry
          ? [...previous.advancePayments, advanceEntry]
          : previous.advancePayments,
      }));

      return { ok: true, hosteller };
    },
    [db.hostellers, db.admins],
  );

  const updateHosteller = useCallback(
    (hostellerId, values) => {
      const target = db.hostellers.find((item) => item.id === hostellerId);
      if (!target) return { ok: false, message: 'Hosteller not found.' };

      const username = String(values.username).trim();
      const clash =
        db.hostellers.some(
          (item) => item.id !== hostellerId && item.username.toLowerCase() === username.toLowerCase(),
        ) || db.admins.some((item) => item.username.toLowerCase() === username.toLowerCase());
      if (clash) return { ok: false, message: 'That username is already taken.' };

      const updated = {
        ...target,
        fullName: String(values.fullName).trim(),
        phone: String(values.phone).trim(),
        email: String(values.email).trim(),
        joinDate: values.joinDate,
        emergencyContact: String(values.emergencyContact).trim(),
        idType: values.idType,
        idNumber: String(values.idNumber).trim(),
        idProof: values.idProof || null,
        roomNumber: String(values.roomNumber).trim(),
        bedNumber: String(values.bedNumber).trim(),
        monthlyRent: Number(values.monthlyRent),
        rentDueDay: Number(values.rentDueDay),
        washingMachine: values.washingEnabled
          ? {
              enabled: true,
              amount: Number(values.washingAmount) || 0,
              startDate:
                values.washingStartDate || target.washingMachine?.startDate || values.joinDate,
            }
          : { ...target.washingMachine, enabled: false, amount: 0 },
        username,
        password: values.password ? values.password : target.password,
        updatedAt: new Date().toISOString(),
      };

      setDb((previous) => ({
        ...previous,
        hostellers: previous.hostellers.map((item) =>
          item.id === hostellerId ? updated : item,
        ),
      }));
      return { ok: true, hosteller: updated };
    },
    [db.hostellers, db.admins],
  );

  const setHostellerActive = useCallback((hostellerId, active) => {
    setDb((previous) => ({
      ...previous,
      hostellers: previous.hostellers.map((hosteller) => {
        if (hosteller.id !== hostellerId) return hosteller;
        return {
          ...hosteller,
          active,
          deactivatedAt: active ? null : new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const updateSubscription = useCallback((hostellerId, subscription) => {
    setDb((previous) => ({
      ...previous,
      hostellers: previous.hostellers.map((hosteller) => {
        if (hosteller.id !== hostellerId) return hosteller;
        return {
          ...hosteller,
          washingMachine: {
            enabled: Boolean(subscription.enabled),
            amount: subscription.enabled ? Number(subscription.amount) || 0 : 0,
            startDate: subscription.enabled ? subscription.startDate : '',
          },
        };
      }),
    }));
  }, []);

  const clockOut = useCallback(
    (hostellerId, location) => {
      const hosteller = db.hostellers.find((item) => item.id === hostellerId);
      if (!hosteller || !hosteller.active) {
        return { ok: false, message: 'Only active hostellers can clock out.' };
      }
      const activeOuting = db.outings.find(
        (outing) => outing.hostellerId === hostellerId && !outing.inAt,
      );
      if (activeOuting) {
        return { ok: false, message: 'You are already clocked out. Clock in before starting a new outing.' };
      }

      const now = new Date();
      const outing = {
        id: uid('out'),
        hostellerId,
        outAt: now.toISOString(),
        outLat: location?.latitude ?? null,
        outLng: location?.longitude ?? null,
        outAccuracy: location?.accuracy ?? null,
        inAt: null,
        durationMs: null,
        createdAt: now.toISOString(),
      };
      setDb((previous) => ({ ...previous, outings: [outing, ...previous.outings] }));
      return { ok: true, outing };
    },
    [db.hostellers, db.outings],
  );

  const clockIn = useCallback(
    (hostellerId) => {
      const activeOuting = db.outings.find(
        (outing) => outing.hostellerId === hostellerId && !outing.inAt,
      );
      if (!activeOuting) {
        return { ok: false, message: 'You have no active outing. Clock out before clocking in.' };
      }
      const now = new Date();
      const updated = {
        ...activeOuting,
        inAt: now.toISOString(),
        durationMs: now.getTime() - new Date(activeOuting.outAt).getTime(),
      };
      setDb((previous) => ({
        ...previous,
        outings: previous.outings.map((outing) =>
          outing.id === activeOuting.id ? updated : outing,
        ),
      }));
      return { ok: true, outing: updated };
    },
    [db.outings],
  );

  const recordRentPayment = useCallback(
    (payment) => {
      const hosteller = db.hostellers.find((item) => item.id === payment.hostellerId);
      if (!hosteller) return { ok: false, message: 'Hosteller not found.' };
      const summary = rentSummary(hosteller, db.rentPayments, new Date());
      const amount = Number(payment.amount);
      if (!amount || amount <= 0) {
        return { ok: false, message: 'Payment amount must be greater than zero.' };
      }
      if (amount > summary.pending + 0.01) {
        return {
          ok: false,
          message: `Payment cannot exceed the pending rent of ₹${summary.pending.toLocaleString('en-IN')}.`,
        };
      }

      const entry = {
        id: uid('rent'),
        hostellerId: payment.hostellerId,
        amount,
        date: toStoredDate(payment.date),
        period: payment.period || summary.period,
        method: payment.method,
        reference: String(payment.reference || '').trim(),
        note: String(payment.note || '').trim(),
        createdAt: new Date().toISOString(),
      };
      setDb((previous) => ({ ...previous, rentPayments: [...previous.rentPayments, entry] }));
      return { ok: true, payment: entry };
    },
    [db.hostellers, db.rentPayments],
  );

  const addAdvanceEntry = useCallback(
    (entry) => {
      const hosteller = db.hostellers.find((item) => item.id === entry.hostellerId);
      if (!hosteller) return { ok: false, message: 'Hosteller not found.' };
      const amount = Number(entry.amount);
      if (!amount || amount <= 0) {
        return { ok: false, message: 'Amount must be greater than zero.' };
      }
      const stored = {
        id: uid('adv'),
        hostellerId: entry.hostellerId,
        type: entry.type,
        amount,
        date: toStoredDate(entry.date),
        method: entry.method,
        reference: String(entry.reference || '').trim(),
        note: String(entry.note || '').trim(),
        createdAt: new Date().toISOString(),
      };
      setDb((previous) => ({
        ...previous,
        advancePayments: [...previous.advancePayments, stored],
      }));
      return { ok: true, entry: stored };
    },
    [db.hostellers],
  );

  const createPoll = useCallback(
    (values) => {
      const weekStart = values.weekStart;
      if (db.foodPolls.some((poll) => poll.weekStart === weekStart)) {
        return { ok: false, message: 'A food poll already exists for that week.' };
      }
      const weekStartDate = parseDateInput(weekStart);
      if (!weekStartDate) return { ok: false, message: 'Invalid week start date.' };

      const poll = {
        id: uid('poll'),
        weekStart,
        weekEnd: toDateInput(addDays(weekStartDate, 6)),
        days: values.days.map((day) => ({
          date: day.date,
          breakfast: String(day.breakfast).trim(),
          lunch: String(day.lunch).trim(),
          dinner: String(day.dinner).trim(),
        })),
        deadline: new Date(values.deadline).toISOString(),
        status: 'open',
        createdAt: new Date().toISOString(),
        closedAt: null,
      };
      setDb((previous) => ({ ...previous, foodPolls: [...previous.foodPolls, poll] }));
      return { ok: true, poll };
    },
    [db.foodPolls],
  );

  const updatePoll = useCallback((pollId, patch) => {
    setDb((previous) => ({
      ...previous,
      foodPolls: previous.foodPolls.map((poll) =>
        poll.id === pollId ? { ...poll, ...patch, updatedAt: new Date().toISOString() } : poll,
      ),
    }));
  }, []);

  const setPollStatus = useCallback((pollId, status) => {
    setDb((previous) => ({
      ...previous,
      foodPolls: previous.foodPolls.map((poll) => {
        if (poll.id !== pollId) return poll;
        return {
          ...poll,
          status,
          closedAt: status === 'closed' ? new Date().toISOString() : null,
        };
      }),
    }));
  }, []);

  const submitFoodSelection = useCallback(
    (pollId, hostellerId, daySelections) => {
      const poll = db.foodPolls.find((item) => item.id === pollId);
      if (!poll) return { ok: false, message: 'Food poll not found.' };
      if (isPollLocked(poll)) {
        return { ok: false, message: 'This food poll is closed. Selections can no longer be changed.' };
      }
      const hosteller = db.hostellers.find((item) => item.id === hostellerId);
      if (!hosteller || !hosteller.active) {
        return { ok: false, message: 'Only active hostellers can submit food selections.' };
      }

      const now = new Date().toISOString();
      const existing = db.foodSelections.find(
        (selection) => selection.pollId === pollId && selection.hostellerId === hostellerId,
      );
      if (existing) {
        setDb((previous) => ({
          ...previous,
          foodSelections: previous.foodSelections.map((selection) =>
            selection.id === existing.id
              ? { ...selection, days: daySelections, updatedAt: now }
              : selection,
          ),
        }));
        return { ok: true, updated: true };
      }

      const selection = {
        id: uid('sel'),
        pollId,
        hostellerId,
        days: daySelections,
        submittedAt: now,
        updatedAt: now,
      };
      setDb((previous) => ({
        ...previous,
        foodSelections: [...previous.foodSelections, selection],
      }));
      return { ok: true, updated: false };
    },
    [db.foodPolls, db.foodSelections, db.hostellers],
  );

  const updateAdmin = useCallback(
    (adminId, values) => {
      const username = String(values.username).trim();
      const clash =
        db.admins.some(
          (admin) => admin.id !== adminId && admin.username.toLowerCase() === username.toLowerCase(),
        ) ||
        db.hostellers.some((hosteller) => hosteller.username.toLowerCase() === username.toLowerCase());
      if (clash) return { ok: false, message: 'That username is already taken.' };

      setDb((previous) => ({
        ...previous,
        admins: previous.admins.map((admin) =>
          admin.id === adminId
            ? {
                ...admin,
                name: String(values.name).trim(),
                username,
                password: values.password ? values.password : admin.password,
              }
            : admin,
        ),
      }));
      return { ok: true };
    },
    [db.admins, db.hostellers],
  );

  const dismissNotification = useCallback((notificationId) => {
    setDb((previous) =>
      previous.dismissedNotifications.includes(notificationId)
        ? previous
        : { ...previous, dismissedNotifications: [...previous.dismissedNotifications, notificationId] },
    );
  }, []);

  const dismissAllNotifications = useCallback((notificationIds) => {
    setDb((previous) => ({
      ...previous,
      dismissedNotifications: Array.from(
        new Set([...previous.dismissedNotifications, ...notificationIds]),
      ),
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createSeedDatabase(new Date());
    setDb(fresh);
    toast.info('Demo data has been reset to the original sample records.');
  }, [toast]);

  const value = useMemo(
    () => ({
      db,
      storageWarning,
      addHosteller,
      updateHosteller,
      setHostellerActive,
      updateSubscription,
      clockOut,
      clockIn,
      recordRentPayment,
      addAdvanceEntry,
      createPoll,
      updatePoll,
      setPollStatus,
      submitFoodSelection,
      updateAdmin,
      dismissNotification,
      dismissAllNotifications,
      resetDemoData,
    }),
    [
      db,
      storageWarning,
      addHosteller,
      updateHosteller,
      setHostellerActive,
      updateSubscription,
      clockOut,
      clockIn,
      recordRentPayment,
      addAdvanceEntry,
      createPoll,
      updatePoll,
      setPollStatus,
      submitFoodSelection,
      updateAdmin,
      dismissNotification,
      dismissAllNotifications,
      resetDemoData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
