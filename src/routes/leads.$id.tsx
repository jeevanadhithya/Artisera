import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Crosshair,
  MapPin,
  Send,
  Sparkles,
  Store,
} from "lucide-react";
import { PhoneFrame } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { opportunities } from "@/data/mock";

export const Route = createFileRoute("/leads/$id")({
  loader: ({ params }) => {
    let opportunity = opportunities.find((o) => o.id === params.id);
    if (!opportunity) {
      opportunity = {
        id: params.id,
        buyer: "Premium Retailer Alliance",
        type: "B2B Wholesale Distributor",
        match: 87,
        title: "Bulk sourcing for Handcrafted home decor",
        units: "500 units / month",
        budget: "₹750 - ₹1,050",
        timeline: "30 days",
        summary: "Active wholesale sourcing for premium bamboo organizers and handcrafted home decor items.",
        tags: ["B2B Sourcing", "Active Match"],
      };
    }
    return { opportunity: opportunity as any };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Opportunity unavailable — Artisera" }, { name: "robots", content: "noindex" }],
      };
    }
    const { opportunity } = loaderData;
    const description = `${opportunity.buyer} needs ${opportunity.units} of ${opportunity.title} at ${opportunity.budget}.`;
    return {
      meta: [
        { title: `${opportunity.title} — Buyer Request | Artisera` },
        { name: "description", content: description },
        { property: "og:title", content: `${opportunity.title} — Buyer Request` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: RequestDetail,
});

const specs = [
  "Natural finish with sustainable sourcing",
  "Eco-friendly lacquer coating",
  "Stackable design for efficient shipping",
  "Custom logo engraving on base",
];

function RequestDetail() {
  const { opportunity } = Route.useLoaderData();

  return (
    <PhoneFrame>
      <div className="space-y-4 pb-8">
        <PageHeader
          title="Business Opportunity"
          back="/leads"
          right={
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-ai-soft px-3 py-1.5 text-xs font-bold text-ai">
              <Crosshair className="h-3.5 w-3.5" /> {opportunity.match}% Match
            </span>
          }
        />

        <div className="space-y-4 px-4">
          <div className="app-card flex items-start gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary">
              <Store className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-extrabold leading-tight">
                {opportunity.buyer}
              </h2>
              <p className="text-sm text-muted-foreground">{opportunity.type}</p>
            </div>
            <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
          </div>

          <section className="app-card space-y-3 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-ai">The Requirement</p>
            <h3 className="font-display text-2xl font-extrabold leading-tight">
              {opportunity.title}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[11px] text-muted-foreground">Quantity</p>
                <p className="mt-1 text-lg font-extrabold">{opportunity.units}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[11px] text-muted-foreground">Target Price</p>
                <p className="mt-1 text-lg font-extrabold">{opportunity.budget}</p>
              </div>
            </div>
            <div className="rounded-xl bg-ai-soft p-3">
              <p className="text-[11px] text-muted-foreground">Total Value</p>
              <p className="mt-1 text-2xl font-extrabold text-primary">₹7,00,000</p>
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="flex items-start gap-3 text-sm">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-xs text-muted-foreground">Deadline</span>
                  {opportunity.timeline} from order confirmation
                </span>
              </p>
              <p className="flex items-start gap-3 text-sm">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-xs text-muted-foreground">Delivery Location</span>
                  Warehouse, New Delhi
                </span>
              </p>
            </div>
          </section>

          <section className="app-card space-y-3 p-4">
            <h3 className="font-bold">Detailed Specifications</h3>
            <ul className="space-y-2">
              {specs.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="ai-surface app-card space-y-2 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" /> AI Insights
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Your production capacity aligns with the {opportunity.timeline} timeline.</li>
              <li>The target price is within your typical margin for bulk orders.</li>
            </ul>
          </section>

          <Link to="/proposal" className="btn-cta">
            <Send className="h-4 w-4" /> Respond to Request
          </Link>
          <Link to="/leads" className="btn-outline">
            <Bookmark className="h-4 w-4" /> Save for Later
          </Link>
        </div>
      </div>
    </PhoneFrame>
  );
}
