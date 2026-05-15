"use client";

import { type FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Check } from "lucide-react";

import { OAuthGoogleButton } from "@/components/auth/oauth-google-button";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isPasswordAcceptable,
  isValidEmail,
  PASSWORD_RULES,
  registerUser,
  scorePassword,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

/* `useSearchParams` triggers Next.js's CSR bailout during prerender unless
 * it lives inside a Suspense boundary. The page export is the boundary; the
 * actual form lives in a child component. */
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const [submitting, setSubmitting] = useState(false);
  const [googling, setGoogling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);

  const emailError =
    touched.email && (!email.trim() || !isValidEmail(email))
      ? "Enter a valid email address"
      : undefined;
  const passwordOk = isPasswordAcceptable(password);
  const passwordError =
    touched.password && !passwordOk
      ? "Must be 8+ chars and include a letter and a number"
      : undefined;
  const canSubmit = isValidEmail(email) && passwordOk && agreed;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setFormError(null);
    if (!canSubmit) {return;}

    setSubmitting(true);
    try {
      await registerUser({ email: email.trim(), password });
      // Auto sign-in on the freshly created account.
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        // Account exists but session didn't establish — push them to sign-in.
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      router.push(result.url ?? callbackUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setGoogling(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <>
      <p className="text-text-muted text-h6 mb-5 flex items-center gap-2 tracking-wider uppercase">
        <span className="bg-accent-primary inline-block size-1.5" />
        Sign up
      </p>

      <h1 className="text-h1 text-text-primary mb-2.5 font-semibold">
        Create your account
      </h1>

      <p className="text-text-secondary text-body-md mb-8">
        Already have one?{" "}
        <Link
          href="/sign-in"
          className="text-text-primary border-border-strong hover:border-border-brand border-b font-medium transition-colors duration-[160ms]"
        >
          Sign in instead.
        </Link>
      </p>

      <OAuthGoogleButton
        onClick={handleGoogle}
        label={googling ? "Redirecting…" : "Continue with Google"}
      />

      <Divider />

      {formError && (
        <div
          role="alert"
          className="bg-error-surface text-error border-error mb-4 flex items-start gap-2 border px-3 py-2 [&_svg]:size-4"
        >
          <AlertCircle className="mt-0.5 shrink-0" />
          <span className="text-body-sm">{formError}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        autoComplete="on"
        noValidate
        className="flex flex-col gap-2"
      >
        <Input
          label="Email"
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="username"
          required
          value={email}
          error={emailError}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />

        <PasswordField
          label="Password"
          id="password"
          name="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          error={passwordError}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          hint={<span className="text-text-muted">8+ characters</span>}
        />

        <PasswordStrengthMeter score={strength.score} label={strength.label} />
        <PasswordRequirements value={password} />

        <TermsCheckbox checked={agreed} onChange={setAgreed} />

        <Button
          type="submit"
          loading={submitting}
          disabled={submitting || googling || !canSubmit}
          className="mt-2 h-11 w-full"
        >
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Local components                                                  */
/* ------------------------------------------------------------------ */

function Divider() {
  return (
    <div className="text-text-muted my-5 flex items-center gap-3">
      <span className="bg-border-default h-px flex-1" />
      <span className="text-mono-sm font-mono tracking-[0.14em] uppercase">
        OR
      </span>
      <span className="bg-border-default h-px flex-1" />
    </div>
  );
}

function PasswordStrengthMeter({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const fillColor =
    score === 0
      ? "bg-text-muted"
      : score === 1
        ? "bg-error"
        : score === 2
          ? "bg-warning"
          : score === 3
            ? "bg-info"
            : score === 4
              ? "bg-success"
              : "bg-accent-primary";

  return (
    <div className="-mt-1 flex items-center gap-2.5" aria-hidden="true">
      <span className="bg-border-default relative h-[3px] flex-1 overflow-hidden">
        <span
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-[160ms]",
            fillColor
          )}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </span>
      <span
        className={cn(
          "text-mono-sm min-w-20 text-right font-mono tracking-[0.08em] uppercase",
          score >= 3 ? "text-text-primary" : "text-text-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="text-body-sm mt-2 mb-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 transition-colors duration-[160ms]",
              passed ? "text-success" : "text-text-muted"
            )}
          >
            <span
              className={cn(
                "grid size-3.5 place-items-center border transition-colors duration-[160ms]",
                passed
                  ? "bg-success border-success text-bg-canvas"
                  : "border-border-strong bg-bg-inset"
              )}
            >
              {passed && <Check className="size-2.5" strokeWidth={3.5} />}
            </span>
            <span className="text-caption">{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="text-text-secondary text-body-sm inline-flex cursor-pointer items-start gap-2.5 leading-normal select-none">
      <input
        type="checkbox"
        name="terms"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-[2px] grid size-4 shrink-0 place-items-center border transition-colors duration-[160ms]",
          checked
            ? "bg-accent-primary border-accent-primary text-accent-on"
            : "bg-bg-inset border-border-strong text-transparent"
        )}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>
        I agree to the{" "}
        <Link
          href="#"
          className="text-text-primary border-border-strong hover:border-border-brand border-b transition-colors duration-[160ms]"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="#"
          className="text-text-primary border-border-strong hover:border-border-brand border-b transition-colors duration-[160ms]"
        >
          Privacy Policy
        </Link>
      </span>
    </label>
  );
}
