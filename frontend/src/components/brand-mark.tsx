import { ShieldCheck } from "lucide-react";

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </span>
      {!compact && (
        <span className="text-[1.05rem] font-semibold tracking-[-0.025em] text-foreground">
          InterviewForge
        </span>
      )}
    </span>
  );
}
