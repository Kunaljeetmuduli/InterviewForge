import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";

const navigation = [
  { label: "Product", href: "#product-preview" },
  { label: "Principles", href: "#principles" },
  { label: "Foundation", href: "#foundation" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/90 bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <a href="#top" aria-label="InterviewForge home" className="rounded-md">
          <BrandMark />
        </a>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 sm:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-sm px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface-subtle hover:text-foreground sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center rounded-sm bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
