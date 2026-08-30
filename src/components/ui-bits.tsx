import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  back = "/",
  right,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pb-2 pt-4">
      <Link to={back} aria-label="Back" className="shrink-0 text-foreground">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-extrabold tracking-tight">
        {title}
      </h1>
      {right}
    </div>
  );
}

export function AiBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ai">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "ai";
}) {
  return (
    <div
      className={
        "rounded-xl px-3 py-2.5 " +
        (tone === "ai" ? "bg-ai-soft" : "bg-secondary")
      }
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "mt-0.5 text-lg font-extrabold " +
          (tone === "ai" ? "text-ai" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function Chip({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${active ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary text-secondary-foreground'}`}>
      {children}
    </span>
  );
}
