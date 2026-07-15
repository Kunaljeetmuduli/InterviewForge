import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

interface AuthShellProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export function AuthShell({ children, description, title }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.8fr_1.2fr]">
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="InterviewForge home" className="inline-flex rounded-md">
            <BrandMark />
          </Link>
          <div className="mt-12 rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
            <h1 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            {children}
          </div>
        </div>
      </section>
      <aside className="hidden border-l border-border bg-surface-subtle p-12 lg:flex lg:items-center">
        <div className="mx-auto max-w-lg">
          <p className="text-sm font-semibold text-primary">The calm practice studio</p>
          <p className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em]">
            Prepare with evidence. Improve with a clear next step.
          </p>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            InterviewForge keeps your preparation focused on the role you want,
            the answers you give, and the skills you can improve.
          </p>
        </div>
      </aside>
    </main>
  );
}
