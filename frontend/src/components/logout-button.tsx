"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";

interface LogoutButtonProps {
  compact?: boolean;
}

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { signOut } = useAuth();

  async function logout() {
    setSubmitting(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={submitting}
      aria-label={compact ? "Log out" : undefined}
      className={
        compact
          ? "inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-subtle hover:text-foreground disabled:opacity-60"
          : "inline-flex min-h-10 w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground disabled:opacity-60"
      }
    >
      <LogOut aria-hidden="true" className="size-4" />
      {!compact && (submitting ? "Logging out..." : "Log out")}
    </button>
  );
}
