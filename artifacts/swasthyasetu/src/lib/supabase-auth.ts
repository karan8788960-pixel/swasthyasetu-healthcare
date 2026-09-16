export type SupabaseUser = {
  id: string;
  phone?: string;
  email?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  user: SupabaseUser;
};

const STORAGE_KEY = "swasthyasetu.auth";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function headers(accessToken?: string): HeadersInit {
  return {
    apikey: supabaseAnonKey ?? "",
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function saveSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export async function sendOtp(phone: string): Promise<void> {
  if (!supabaseAuthConfigured) return;
  const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ phone, create_user: true }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { msg?: string; error_description?: string } | null;
    throw new Error(body?.msg ?? body?.error_description ?? "OTP could not be sent");
  }
}

export async function verifyOtp(phone: string, token: string): Promise<SupabaseUser> {
  if (!supabaseAuthConfigured) {
    const demoSession = { access_token: "demo-session", user: { id: "demo-user", phone } };
    saveSession(demoSession);
    return demoSession.user;
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=otp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ phone, token, type: "sms" }),
  });
  const data = (await response.json().catch(() => null)) as
    | (AuthSession & { error_description?: string; msg?: string })
    | null;
  if (!response.ok || !data?.access_token || !data.user) {
    throw new Error(data?.msg ?? data?.error_description ?? "The OTP is not valid");
  }
  saveSession(data);
  return data.user;
}

export async function signOut(): Promise<void> {
  const session = getAuthSession();
  if (supabaseAuthConfigured && session?.access_token) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: headers(session.access_token),
    }).catch(() => undefined);
  }
  window.localStorage.removeItem(STORAGE_KEY);
}