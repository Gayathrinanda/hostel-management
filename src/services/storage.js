const PREFIX = 'hms.';

export const STORAGE_KEYS = {
  database: `${PREFIX}database.v1`,
  session: `${PREFIX}session.v1`,
};

export function readJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Unable to read ${key} from localStorage`, error);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to localStorage`, error);
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Unable to remove ${key} from localStorage`, error);
  }
}
