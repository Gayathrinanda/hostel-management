import { readJSON, writeJSON, removeKey, STORAGE_KEYS } from './storage';

/**
 * Persistence layer for the hostel application.
 *
 * Every read/write goes through this module so that the LocalStorage
 * implementation can later be swapped for REST API calls without touching
 * UI components or business logic.
 */
export function loadDatabase() {
  return readJSON(STORAGE_KEYS.database, null);
}

export function saveDatabase(database) {
  return writeJSON(STORAGE_KEYS.database, database);
}

export function clearDatabase() {
  removeKey(STORAGE_KEYS.database);
}

export function loadSession() {
  return readJSON(STORAGE_KEYS.session, null);
}

export function saveSession(session) {
  if (!session) return removeKey(STORAGE_KEYS.session);
  return writeJSON(STORAGE_KEYS.session, session);
}

export function clearSession() {
  removeKey(STORAGE_KEYS.session);
}

export function downloadBackup(database) {
  const payload = JSON.stringify(database, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hostel-data-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
