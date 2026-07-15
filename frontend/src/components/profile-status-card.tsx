"use client";

import { ArrowRight, CheckCircle2, RefreshCw, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { profileApi, type Profile } from "@/lib/api-client";

type ProfileStatus =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ready"; profile: Profile }
  | { state: "error"; message: string };

export function ProfileStatusCard() {
  const [status, setStatus] = useState<ProfileStatus>({ state: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    profileApi
      .get()
      .then((profile) => {
        if (active) {
          setStatus(profile ? { state: "ready", profile } : { state: "missing" });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus({
            state: "error",
            message:
              error instanceof Error
                ? error.message
                : "Your profile status could not be loaded.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [requestVersion]);

  if (status.state === "loading") {
    return (
      <section
        aria-busy="true"
        aria-label="Loading profile status"
        className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8"
      >
        <div className="size-10 rounded-md bg-surface-subtle" />
        <div className="mt-5 h-6 w-40 rounded-sm bg-surface-subtle" />
        <div className="mt-3 h-4 w-full max-w-md rounded-sm bg-surface-subtle" />
        <div className="mt-6 h-11 w-32 rounded-sm bg-surface-subtle" />
      </section>
    );
  }

  if (status.state === "error") {
    return (
      <section className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">
          Profile status unavailable
        </h2>
        <p role="alert" className="mt-2 text-sm leading-6 text-destructive">
          {status.message}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus({ state: "loading" });
            setRequestVersion((version) => version + 1);
          }}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-subtle"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </section>
    );
  }

  if (status.state === "ready") {
    return (
      <section className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-success-soft text-success-foreground">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 text-sm font-semibold text-success-foreground">
          Profile complete
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
          Welcome, {status.profile.full_name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your preparation context is set for {status.profile.target_role} at the{" "}
          {status.profile.experience_level} level.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-subtle"
        >
          Review profile
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
      <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
        <UserRound aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">
        Set up your profile
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Add your name, target role, and experience level so later interview
        sessions can use the context you provide.
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Open profile
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
