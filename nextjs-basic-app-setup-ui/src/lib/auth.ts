export type AuthSession = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

const AUTH_KEY = "finanzapp:auth";

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("finanzapp:auth-changed"));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("finanzapp:auth-changed"));
}

export function getUserId() {
  return getSession()?.user.id ?? null;
}
