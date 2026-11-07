import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, loadSession, saveSession } from '../services/database';
import { useData } from './DataContext';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { db } = useData();
  const toast = useToast();
  const [session, setSession] = useState(() => loadSession());

  useEffect(() => {
    if (!session) return;
    const valid =
      session.role === 'admin'
        ? db.admins.some((admin) => admin.id === session.id)
        : db.hostellers.some((hosteller) => hosteller.id === session.id && hosteller.active);

    if (!valid) {
      setSession(null);
      clearSession();
      toast.info('Your session has ended because the account is no longer active.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.admins, db.hostellers, session]);

  const login = useCallback(
    ({ role, username, password }) => {
      const uname = String(username).trim().toLowerCase();
      if (!uname || !password) {
        return { ok: false, message: 'Enter both username and password.' };
      }

      if (role === 'admin') {
        const admin = db.admins.find((item) => item.username.toLowerCase() === uname);
        if (!admin || admin.password !== password) {
          return { ok: false, message: 'Invalid admin username or password.' };
        }
        const nextSession = {
          role: 'admin',
          id: admin.id,
          name: admin.name,
          username: admin.username,
          loginAt: new Date().toISOString(),
        };
        setSession(nextSession);
        saveSession(nextSession);
        return { ok: true, session: nextSession };
      }

      const hosteller = db.hostellers.find((item) => item.username.toLowerCase() === uname);
      if (!hosteller) {
        return { ok: false, message: 'No hosteller account found with that username.' };
      }
      if (hosteller.password !== password) {
        return { ok: false, message: 'Incorrect password. Please try again.' };
      }
      if (!hosteller.active) {
        return {
          ok: false,
          message: 'This account has been deactivated. Please contact the hostel administrator.',
        };
      }

      const nextSession = {
        role: 'hosteller',
        id: hosteller.id,
        name: hosteller.fullName,
        username: hosteller.username,
        loginAt: new Date().toISOString(),
      };
      setSession(nextSession);
      saveSession(nextSession);
      return { ok: true, session: nextSession };
    },
    [db.admins, db.hostellers],
  );

  const logout = useCallback(() => {
    setSession(null);
    clearSession();
  }, []);

  const user = useMemo(() => {
    if (!session) return null;
    if (session.role === 'admin') {
      return db.admins.find((admin) => admin.id === session.id) || null;
    }
    return db.hostellers.find((hosteller) => hosteller.id === session.id) || null;
  }, [session, db.admins, db.hostellers]);

  const value = useMemo(
    () => ({ session, user, login, logout, isAuthenticated: Boolean(session && user) }),
    [session, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
