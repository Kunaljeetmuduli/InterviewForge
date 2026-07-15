import { LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
] as const;

export function AppNavigation() {
  return (
    <aside className="border-b border-border bg-surface md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex min-h-16 items-center justify-between px-5 md:min-h-full md:flex-col md:items-stretch md:px-4 md:py-5">
        <div>
          <Link href="/dashboard" aria-label="InterviewForge dashboard" className="inline-flex rounded-md px-1">
            <BrandMark />
          </Link>
          <nav aria-label="Workspace navigation" className="mt-7 hidden space-y-1 md:block">
            {navigation.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:block">
          <AccountMenu />
        </div>
        <nav aria-label="Mobile workspace navigation" className="flex items-center gap-1 md:hidden">
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
            >
              <Icon aria-hidden="true" className="size-5" />
            </Link>
          ))}
          <Link
            href="/profile"
            aria-label="Profile"
            className="inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
          >
            <UserRound aria-hidden="true" className="size-5" />
          </Link>
          <LogoutButton compact />
        </nav>
      </div>
    </aside>
  );
}
