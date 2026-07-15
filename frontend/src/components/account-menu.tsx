"use client";

import { ChevronDown, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { LogoutButton } from "@/components/logout-button";
import { profileApi, type Profile } from "@/lib/api-client";

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "IF";
}

export function AccountMenu() {
  const { user } = useAuth();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    profileApi
      .get()
      .then((loadedProfile) => {
        if (active) {
          setProfile(loadedProfile);
        }
      })
      .catch(() => {
        // The authenticated email remains a safe navigation fallback.
      });

    return () => {
      active = false;
    };
  }, []);

  const emailName = user?.email?.split("@")[0];
  const displayName = profile?.full_name ?? emailName ?? "Your account";

  return (
    <details
      ref={detailsRef}
      className="group relative border-t border-border pt-3"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-sm px-2 py-2 hover:bg-surface-subtle [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {getInitials(displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            View profile
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-md border border-border bg-surface p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <Link
          href="/profile"
          onClick={() => detailsRef.current?.removeAttribute("open")}
          className="flex min-h-10 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
        >
          <UserRound aria-hidden="true" className="size-4" />
          View profile
        </Link>
        <LogoutButton />
      </div>
    </details>
  );
}
