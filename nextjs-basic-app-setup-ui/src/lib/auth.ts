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

export function isDemoUser(): boolean {
  const session = getSession();
  return session?.user.id === "demo" || session?.user.email === "demo@finanzapp.com";
}

export function startDemoSession() {
  if (typeof window === "undefined") return;
  // Crear token base64 manualmente para evitar usar Buffer en el cliente
  const demoToken = btoa("demo");
  const demoSession: AuthSession = {
    token: demoToken,
    user: {
      id: "demo",
      name: "Demo",
      email: "demo@finanzapp.com",
    },
  };
  saveSession(demoSession);
}
