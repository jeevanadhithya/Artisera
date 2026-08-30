import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowRight, Eye, Send, SlidersHorizontal, Store, BadgeCheck, Crosshair, Loader2 } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { Chip } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export const Route = createFileRoute('/leads/')({
  component: Leads,
});

const BUYER_NAMES = [
  'FabIndia Overseas',
  'Tribes India',
  'Central Cottage Industries Emporium',
  'Crafts Council of India',
  'EcoLiving Retail Co.',
  'Heritage Crafts India',
  'Svatantra Crafts Alliance',
  'Dastkari Bazaar International'
];

const BUYER_TYPES = [
  'Premium Retail Chain',
  'Government Sourcing Enterprise',
  'B2B Wholesale Distributor',
  'Non-Profit Craft Federation',
  'Eco-Friendly Home Boutique',
  'Exporter Consortium'
];

function Leads() {
  const { user, profile, loading: authLoading } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get<any>('/market/opportunities/me')
        .then(res => {
          // Add decorative mock details (buyers, types, timelines) to live demand scores
          const mapped = (res.opportunities || []).map((opp: any, idx: number) => {
            const buyerName = BUYER_NAMES[idx % BUYER_NAMES.length];
            const buyerType = BUYER_TYPES[idx % BUYER_TYPES.length];
            return {
              id: opp.id,
              buyer: buyerName,
              type: buyerType,
              match: opp.demand_score || 85,
              title: `Bulk sourcing for ${opp.product}`,
              summary: opp.reason || 'Strong market matching signal detected from urban retail platforms.',
              units: `${opp.suggested_quantity} units / month`,
              budget: `₹${Number(opp.price_range.min).toLocaleString('en-IN')} - ₹${Number(opp.price_range.max).toLocaleString('en-IN')}`,
              timeline: 'Next 30 days (Flexible)',
              tags: [res.craft_type || 'Handicraft', opp.demand ? `${opp.demand} demand` : 'Active Match'],
            };
          });
          setOpportunities(mapped);
        })
        .catch(err => {
          console.error('Failed to load opportunities:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  if (!user) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center p-6 text-center space-y-4">
          <Crosshair className="h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="font-display text-xl font-bold">Sign In Required</h2>
          <p className="text-sm text-muted-foreground">Sign in to view AI-curated B2B buyer leads matching your craft profile.</p>
          <Link to="/login" className="btn-cta">Sign In</Link>
        </div>
      </PhoneFrame>
    );
  }

  if (opportunities.length === 0) {
    return (
      <PhoneFrame>
        <div className="space-y-4 px-4 pb-8 pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ai">B2B Matching</p>
          <h1 className="font-display text-3xl font-extrabold leading-tight">Business Opportunities</h1>
          <p className="text-sm text-muted-foreground text-center py-20 bg-secondary/20 rounded-2xl">
            No matching buyer opportunities found for your craft type yet. Upload products to populate matches!
          </p>
        </div>
      </PhoneFrame>
    );
  }

  const [featured, ...rest] = opportunities;

  return (
    <PhoneFrame>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ai">B2B Matching</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          Business Opportunities
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-curated buyer requirements matched to your production capabilities.
        </p>
        
        <button className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>

        {/* Featured Opportunity */}
        <article className="app-card space-y-4 p-4 border border-primary/20 bg-card">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary">
              <Store className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-1.5 font-display text-lg font-extrabold">
                <span className="min-w-0 truncate">{featured.buyer}</span>
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
              </h2>
              <p className="text-xs text-muted-foreground">{featured.type}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-primary/40 text-xs font-extrabold text-primary bg-primary/5">
              {featured.match}%
            </span>
          </div>

          <h3 className="font-display text-xl font-extrabold leading-tight">
            {featured.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{featured.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Requirement</p>
              <p className="mt-0.5 text-base font-extrabold">{featured.units}</p>
            </div>
            <div className="rounded-xl bg-ai-soft p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Budget</p>
              <p className="mt-0.5 text-base font-extrabold text-ai">{featured.budget}</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Timeline</p>
            <p className="mt-0.5 text-sm font-bold">{featured.timeline}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {featured.tags.map((t: string) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <Link to="/proposal" className="btn-cta flex justify-center py-2.5">
              <Send className="h-4 w-4" /> Respond
            </Link>
          </div>
        </article>

        {/* Other Opportunities */}
        {rest.map((o) => (
          <div
            key={o.id}
            className="app-card block space-y-3 p-4 border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ai-soft text-ai">
                <Store className="h-5 w-5" />
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1 text-xs font-bold text-ai">
                <Crosshair className="h-3.5 w-3.5" /> {o.match}% Match
              </span>
            </div>
            <h2 className="font-display text-lg font-extrabold">{o.buyer}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{o.summary}</p>
            
            <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
              <span className="text-muted-foreground font-semibold">Volume</span>
              <span className="font-bold">{o.units}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground font-semibold">Budget</span>
              <span className="font-bold text-ai">{o.budget}</span>
            </div>
            
            <Link to="/proposal" className="btn-outline w-full py-2.5 text-center flex justify-center text-xs">
              <Send className="h-3.5 w-3.5" /> Respond to requirement
            </Link>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}
