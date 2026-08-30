import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Search, Star, Loader2, Sparkles } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { Chip } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import { categories as mockCategories } from '@/data/mock';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/explore')({
  component: Explore,
});

function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedCategory) queryParams.append('category', selectedCategory);

      const res = await api.get<any>(`/market/products?${queryParams.toString()}`);
      setProducts(res.items || []);
    } catch (e) {
      console.error('Failed to fetch marketplace products:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const wishlist = await api.get<any[]>('/wishlist');
      setWishlistIds(new Set(wishlist.map(w => w.id)));
    } catch (e) {
      // User might not be logged in or other auth issues, fail silently
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const toggleWishlist = async (productId: string) => {
    try {
      const isStarred = wishlistIds.has(productId);
      if (isStarred) {
        await api.delete(`/wishlist/${productId}`);
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        toast.success('Removed from wishlist');
      } else {
        await api.post('/wishlist', { product_id: productId });
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
        toast.success('Added to wishlist');
      }
    } catch (e) {
      toast.error('You must sign in to wishlist products');
    }
  };

  return (
    <PhoneFrame>
      <div className="space-y-5 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold">Explore Marketplace</h1>
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3 w-3" /> B2B Sync
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-3 border border-transparent focus-within:border-primary/20">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search crafts, materials, regions..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Category Chips */}
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="shrink-0"
          >
            <Chip active={selectedCategory === null}>All</Chip>
          </button>
          {mockCategories.map((c) => (
            <button 
              key={c} 
              onClick={() => setSelectedCategory(c === selectedCategory ? null : c)}
              className="shrink-0"
            >
              <Chip active={c === selectedCategory}>{c}</Chip>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground/80">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => {
              const formattedPrice = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : '--';
              const rating = p.ai_confidence ? (4.0 + p.ai_confidence).toFixed(1) : '4.7';
              const stateLabel = p.artisans?.state || p.region || 'India';
              const isWishlisted = wishlistIds.has(p.id);

              return (
                <article key={p.id} className="app-card overflow-hidden bg-card relative">
                  <button 
                    onClick={() => toggleWishlist(p.id)}
                    className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-background hover:bg-black/60 transition-colors"
                  >
                    <Star className={`h-4.5 w-4.5 ${isWishlisted ? 'fill-yellow-400 text-yellow-400' : 'text-background'}`} />
                  </button>

                  <img
                    src={p.image_url || p.original_image_url || bambooFallback}
                    alt={p.name}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="h-32 w-full object-cover"
                  />
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 truncate text-sm font-bold">{p.name}</h2>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary">
                        <Star className="h-3 w-3 fill-current text-primary" />
                        {rating}
                      </span>
                    </div>
                    <p className="truncate text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
                      {p.category || 'Craft'} • {stateLabel}
                    </p>
                    <p className="text-sm font-extrabold text-primary">{formattedPrice}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
