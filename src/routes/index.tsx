import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Search, Plus, Heart, Star, TrendingUp, Sparkles, BadgeCheck, LogIn, ArrowRight, Loader2, Info } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { categories as mockCategories } from '@/data/mock';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api-client';
import heroImg from '@/assets/hero-craft.jpg';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Artisera — AI marketplace for artisans' },
      {
        name: 'description',
        content: 'Artisera helps artisans list handcrafted products with AI, price smartly and match with bulk buyers.',
      },
      { property: 'og:title', content: 'Artisera — AI marketplace for artisans' },
      {
        property: 'og:description',
        content: 'List crafts with AI, price smartly, meet bulk buyers.',
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, profile, loading } = useAuth();
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (user) {
      api.get<any>('/market/opportunities/me')
        .then(res => {
          if (res.opportunities && res.opportunities.length > 0) {
            setOpportunity(res.opportunities[0]);
          }
        })
        .catch(err => {
          console.error('Failed to load opportunities:', err);
        });
    }

    // Load actual published products from API
    setLoadingProducts(true);
    api.get<any>('/market/products?limit=4')
      .then(res => {
        setRecentProducts(res.items || []);
      })
      .catch(err => {
        console.error('Failed to load published products:', err);
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }, [user]);

  const name = user ? (profile?.name || user.email?.split('@')[0] || 'Artisan') : null;

  return (
    <PhoneFrame>
      <div className="space-y-6 px-4 pb-8 pt-4">
        
        {/* Header Greeting & Search */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Artisera Logo" className="h-10 w-10 object-contain shrink-0" />
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight">
                {name ? `Hello, ${name}!` : 'Welcome to Artisera'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {name ? 'Manage your crafts and opportunities' : 'Empowering traditional Indian artisans'}
              </p>
            </div>
          </div>
          {!user && !loading && (
            <Link to="/login" className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-3 border border-transparent focus-within:border-primary/20">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            placeholder="Search products, materials, regions..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-2xl">
          <img
            src={heroImg}
            alt="Artisan weaving at a loom"
            width={1024}
            height={640}
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/70 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-3 p-4">
            <h2 className="max-w-[15rem] font-display text-2xl font-extrabold leading-tight">
              Your craft deserves a bigger market.
            </h2>
            <Link to="/add" className="btn-cta w-auto self-start px-5 text-sm py-2">
              <Plus className="h-4 w-4" /> Add Product
            </Link>
          </div>
        </section>

        {/* AI Market Opportunity Card */}
        {user && opportunity ? (
          <section className="ai-surface app-card space-y-3 p-4 border border-primary/20 bg-card">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ai">
              <Sparkles className="h-4 w-4" /> AI Matching Opportunity
            </p>
            <h2 className="font-display text-xl font-bold leading-snug">
              High demand for {opportunity.product}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Demand</p>
                <p className="flex items-center gap-1 font-bold text-destructive text-sm mt-0.5">
                  {opportunity.demand} ({opportunity.demand_score}/100) <TrendingUp className="h-4 w-4" />
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Potential Buyers</p>
                <p className="font-bold text-sm mt-0.5">{opportunity.potential_buyers} ready to buy</p>
              </div>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Suggested Market Price</p>
              <p className="font-bold text-primary text-sm mt-0.5">
                ₹{opportunity.price_range.min} - ₹{opportunity.price_range.max}
              </p>
            </div>
            <Link to="/leads" className="btn-cta text-sm py-2 text-center flex justify-center">
              Explore Matches <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </section>
        ) : !user && (
          <section className="ai-surface app-card space-y-3 p-5 border border-border bg-card/65 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ai">
              <Sparkles className="h-4 w-4 dev-sparkle" /> AI Business Sourcing
            </p>
            <h2 className="font-display text-xl font-bold leading-snug">
              Match with Global Bulk Buyers
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Verify your craft and connect with corporate networks, exporters, and premium boutiques in one click.
            </p>
            <Link to="/signup" className="btn-cta text-sm py-2.5 text-center flex justify-center">
              Join Artisera Network
            </Link>
          </section>
        )}

        {/* Categories Section */}
        <section>
          <ul className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {mockCategories.map((c) => (
              <li key={c} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
                  {c.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground text-center truncate w-full">{c}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Products Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">Recent Published Crafts</h2>
            <Link to="/explore" className="text-sm font-semibold text-primary">
              View All
            </Link>
          </div>
          
          {loadingProducts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-1.5">
              <Info className="h-5 w-5 mx-auto text-muted-foreground/60" />
              <p>No crafts published in the marketplace yet.</p>
              <Link to="/add" className="inline-block text-primary font-bold hover:underline">
                List the first product →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentProducts.map((p) => {
                const priceLabel = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : '--';
                const confidence = p.ai_confidence ? (4.0 + p.ai_confidence).toFixed(1) : '4.8';
                
                return (
                  <article key={p.id} className="app-card overflow-hidden bg-card">
                    <div className="relative">
                      <img
                        src={p.image_url || p.original_image_url || bambooFallback}
                        alt={p.name}
                        loading="lazy"
                        width={800}
                        height={800}
                        className="h-32 w-full object-cover"
                      />
                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-card shadow-sm">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 truncate text-sm font-bold">{p.name}</h3>
                        <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary">
                          <Star className="h-3 w-3 fill-current text-primary" />
                          {confidence}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{p.category || 'Craft'} • {p.region || 'India'}</p>
                      <p className="text-sm font-extrabold text-primary">{priceLabel}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PhoneFrame>
  );
}
