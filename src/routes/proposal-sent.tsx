import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BellRing, Check, Clock, Sparkles } from "lucide-react";
import { PhoneFrame } from "@/components/AppShell";

export const Route = createFileRoute("/proposal-sent")({
  head: () => ({
    meta: [
      { title: "Proposal Sent — Artisera" },
      {
        name: "description",
        content: "Your quote has been delivered to the buyer. Track responses from your leads inbox.",
      },
      { property: "og:title", content: "Proposal Sent — Artisera" },
      { property: "og:description", content: "Your quote has been delivered to the buyer." },
    ],
  }),
  component: ProposalSent,
});

function ProposalSent() {
  return (
    <PhoneFrame chrome={false}>
      <div className="min-h-screen space-y-5 px-4 py-10">
        <div className="relative mx-auto w-fit">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-primary">
            <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
          </span>
          <span className="absolute -right-1 top-0 grid h-8 w-8 place-items-center rounded-full bg-ai text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-primary">Proposal Sent!</h1>
          <p className="mx-auto mt-2 max-w-[20rem] text-sm text-muted-foreground">
            Your quote for 1,000 Bamboo Organizers has been delivered to Bamboo Craft Store.
          </p>
        </div>

        <section className="app-card space-y-3 p-5">
          <h2 className="font-display text-xl font-extrabold">Submission Details</h2>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote</p>
              <p className="mt-1 font-extrabold text-primary">₹700 / unit</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Timeline</p>
              <p className="mt-1 font-extrabold">45 days</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reference ID</p>
            <p className="mt-1 w-fit rounded-md bg-secondary px-2 py-1 font-mono text-sm">
              #ART-94281
            </p>
          </div>
        </section>

        <section className="ai-surface app-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-primary">
            <Sparkles className="h-5 w-5 text-ai" /> AI Next Steps
          </h2>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            The buyer typically reviews proposals within <span className="text-ai">48 hours</span>.
          </p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            We'll notify you as soon as they respond or request more details.
          </p>
        </section>

        <Link to="/leads" className="btn-cta">
          <ArrowLeft className="h-4 w-4" /> Back to Opportunities
        </Link>
        <Link to="/profile" className="btn-outline">
          View Sent Proposal
        </Link>
      </div>
    </PhoneFrame>
  );
}
