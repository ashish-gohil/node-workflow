"use client";

import { type FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";

import { OAuthGoogleButton } from "@/components/auth/oauth-google-button";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

/* `useSearchParams` triggers Next.js's CSR bailout during prerender unless
 * it lives inside a Suspense boundary. The page export is the boundary; the
 * actual form lives in a child component. */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [googling, setGoogling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    if (!email.trim()) {
      next.email = "Required";
    } else if (email.includes("@") && !isValidEmail(email)) {
      // Allow plain usernames; only validate when an @ is present.
      next.email = "Enter a valid email address";
    }
    if (!password) {next.password = "Required";}
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) {return;}
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setFormError("Invalid email or password. Please try again.");
        return;
      }
      router.push(result.url ?? callbackUrl);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setGoogling(true);
    // Full redirect — NextAuth handles the OAuth round-trip.
    await signIn("google", { callbackUrl });
  }

  return (
    <>
      <p className="text-text-muted text-h6 mb-5 flex items-center gap-2 tracking-wider uppercase">
        <span className="bg-accent-primary inline-block size-1.5" />
        Sign in
      </p>

      <h1 className="text-h1 text-text-primary mb-2.5 font-semibold">
        Welcome back
      </h1>

      <p className="text-text-secondary text-body-md mb-8">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-text-primary border-border-strong hover:border-border-brand border-b font-medium transition-colors duration-[160ms]"
        >
          Create one.
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
          label="Email or username"
          id="email"
          name="email"
          type="text"
          placeholder="you@company.com"
          autoComplete="username"
          required
          value={email}
          error={fieldErrors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {setFieldErrors((p) => ({ ...p, email: undefined }));}
          }}
        />

        <PasswordField
          label="Password"
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          error={fieldErrors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {setFieldErrors((p) => ({ ...p, password: undefined }));}
          }}
          hint={
            <Link
              href="#"
              className="text-text-muted hover:text-text-primary transition-colors duration-[160ms]"
            >
              Forgot password?
            </Link>
          }
        />

        <RememberCheckbox checked={remember} onChange={setRemember} />

        <Button
          type="submit"
          loading={submitting}
          disabled={submitting || googling}
          className="mt-2 h-11 w-full"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                     */
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

function RememberCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="text-text-secondary text-body-sm inline-flex cursor-pointer items-center gap-2.5 select-none">
      <input
        type="checkbox"
        name="remember"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-4 shrink-0 place-items-center border transition-colors duration-[160ms]",
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
      <span>Keep me signed in</span>
    </label>
  );
}
