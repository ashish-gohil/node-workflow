/* ============================================================
   Auth utilities — pure functions used by sign-in/sign-up forms.
   Kept framework-agnostic so they can also run in tests.
   ============================================================ */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/* ── Password requirements ── */

export type PasswordRule = {
  id: "length" | "case" | "digit" | "symbol";
  label: string;
  test: (v: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (v) => v.length >= 8,
  },
  {
    id: "case",
    label: "Upper and lower case letters",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  {
    id: "digit",
    label: "A number",
    test: (v) => /[0-9]/.test(v),
  },
  {
    id: "symbol",
    label: "A symbol (!@#…)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

/* "Minimum to submit": length + at least one letter and one digit. The
 * other rules are surfaced as suggestions, not gates — matches typical
 * SaaS sign-up flows. */
export function isPasswordAcceptable(value: string): boolean {
  if (value.length < 8) {return false;}
  if (!/[A-Za-z]/.test(value)) {return false;}
  if (!/[0-9]/.test(value)) {return false;}
  return true;
}

/* Strength score 0–5 → label, used by the meter UI. */
export type PasswordStrength = {
  score: number;
  label:
    | "enter a password"
    | "too short"
    | "weak"
    | "fair"
    | "good"
    | "strong";
};

const STRENGTH_LABELS = [
  "enter a password",
  "too short",
  "weak",
  "fair",
  "good",
  "strong",
] as const;

export function scorePassword(value: string): PasswordStrength {
  if (!value) {return { score: 0, label: STRENGTH_LABELS[0] };}
  let s = 0;
  if (value.length >= 8) {s++;}
  if (value.length >= 12) {s++;}
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) {s++;}
  if (/[0-9]/.test(value)) {s++;}
  if (/[^A-Za-z0-9]/.test(value)) {s++;}
  const score = Math.min(s, 5);
  return { score, label: STRENGTH_LABELS[score] };
}

/* ── Signup API call ──
 *
 * Hits the backend directly (no auth required for signup). The proxy
 * route at /api/[...path] requires a backend token, so we cannot route
 * through it for unauthenticated calls. */

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignupResult {
  id: string;
  email: string;
  name?: string;
  accessToken: string;
}

export async function registerUser(input: SignupInput): Promise<SignupResult> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  const res = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    id?: string;
    email?: string;
    name?: string;
    accessToken?: string;
  };

  if (!res.ok || !body?.id || !body?.accessToken) {
    throw new Error(body?.error ?? `Sign-up failed (${res.status})`);
  }
  return body as SignupResult;
}
