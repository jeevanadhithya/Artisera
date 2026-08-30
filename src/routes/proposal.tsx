import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Package, Sparkles } from "lucide-react";
import { PhoneFrame } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/proposal")({
  head: () => ({
    meta: [
      { title: "Send Proposal — Artisera" },
      {
        name: "description",
        content: "Quote your price, delivery timeline and message to the buyer in one tap.",
      },
      { property: "og:title", content: "Send Proposal — Artisera" },
      {
        property: "og:description",
        content: "Quote price, timeline and message the buyer.",
      },
    ],
  }),
  component: Proposal,
});

function Proposal() {
  const navigate = useNavigate();
  const [sample, setSample] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <PhoneFrame>
      <form
        className="space-y-5 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/proposal-sent" });
        }}
      >
        <PageHeader title="Send Proposal" back="/leads" />

        <div className="space-y-5 px-4">
          <div className="flex items-center gap-3 rounded-xl bg-secondary p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-card">
              <Package className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold leading-tight">
                1,000 Bamboo Organizers
              </h2>
              <p className="text-xs text-muted-foreground">Target: ₹700 / unit</p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-bold">Your Quote</span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-muted-foreground">₹</span>
              <input
                type="number"
                defaultValue={700}
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
              />
              <span className="shrink-0 text-sm text-muted-foreground">/ unit</span>
            </span>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold">Delivery Timeline</span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <input
                type="number"
                defaultValue={45}
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
              />
              <span className="shrink-0 text-sm text-muted-foreground">days</span>
            </span>
          </label>

          <div className="app-card flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">Sample Availability</p>
              <p className="text-sm text-muted-foreground">
                Can provide a physical sample if requested
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sample}
              aria-label="Sample availability"
              onClick={() => setSample((s) => !s)}
              className={
                "relative h-7 w-12 shrink-0 rounded-full transition-colors " +
                (sample ? "bg-primary" : "bg-border")
              }
            >
              <span
                className={
                  "absolute top-1 h-5 w-5 rounded-full bg-card transition-all " +
                  (sample ? "left-6" : "left-1")
                }
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-sm font-bold">Message to Buyer</span>
              <button
                type="button"
                onClick={() =>
                  setMessage(
                    "Namaste! I'm Meena Devi, a third-generation artisan from Assam. My workshop weaves bamboo organizers by hand with sustainably sourced culms, and we can comfortably deliver 1,000 units in 45 days with consistent finish and export-grade packing.",
                  )
                }
                className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ai"
              >
                <Sparkles className="h-4 w-4" /> Help me write a professional response
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and your craft..."
              className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">Attachments</p>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted-foreground">
              <Camera className="h-6 w-6" />
              <span className="text-sm">Add Photos of similar work</span>
            </div>
          </div>

          <button type="submit" className="btn-cta">
            Submit Proposal
          </button>
        </div>
      </form>
    </PhoneFrame>
  );
}
