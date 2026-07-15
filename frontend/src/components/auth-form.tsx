"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!data.session) {
        setNotice("Check your email to confirm your account, then log in.");
        return;
      }

      router.replace("/profile");
      router.refresh();
    } catch {
      setError("Authentication is not configured yet. Check the local environment variables.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground hover:border-slate-300"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground hover:border-slate-300"
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-sm bg-destructive-soft px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-sm bg-success-soft px-3 py-2.5 text-sm text-success-foreground">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? isLogin
            ? "Logging in..."
            : "Creating account..."
          : isLogin
            ? "Log in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "New to InterviewForge?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-semibold text-primary hover:text-primary-hover"
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
