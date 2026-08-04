const SESSION_KEY = 'slides_token';
const LOGIN_TIME_KEY = 'slides_login_time';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export function setSession(token) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LOGIN_TIME_KEY);
}

export function isSessionValid() {
  const token = localStorage.getItem(SESSION_KEY);
  const loginTime = localStorage.getItem(LOGIN_TIME_KEY);

  if (!token || !loginTime) return false;

  const elapsed = Date.now() - parseInt(loginTime, 10);
  if (elapsed > TWELVE_HOURS_MS) {
    clearSession(); // Auto-expire after 12 hours
    return false;
  }

  return true;
}

export function getSessionToken() {
  if (isSessionValid()) {
    return localStorage.getItem(SESSION_KEY);
  }
  return null;
}
