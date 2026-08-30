import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { BadgeCheck, MapPin, MoreVertical, Pencil, Plus, Sparkles, Upload, Loader2, XCircle, Phone, Globe, Briefcase, Settings } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { Chip } from '@/components/ui-bits';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

export const Route = createFileRoute('/profile')({
  component: Profile,
});

function Profile() {
  const { user, profile, role, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [tab, setTab] = useState<'About' | 'Products' | 'Requests' | 'Story'>('Products');
  
  // Lists
  const [products, setProducts] = useState<any[]>([]);
  const [buyerRequests, setBuyerRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_products: 0,
    published_products: 0,
    pending_products: 0,
    market_opportunities: 0
  });

  const [loadingItems, setLoadingItems] = useState(false);

  // Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formCraftType, setFormCraftType] = useState('');
  
  // Buyer-specific Form States
  const [formOrgName, setFormOrgName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formInfo, setFormInfo] = useState('');

  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login' });
      return;
    }

    if (profile) {
      // Seed form values
      setFormName(profile['name'] || '');
      setFormPhone(profile['phone'] || '');
      setFormState(profile['state'] || '');
      setFormDistrict(profile['district'] || '');
      setFormCraftType(profile['craft_type'] || '');
      
      setFormOrgName(profile['organization_name'] || '');
      setFormCategory(profile['business_category'] || '');
      setFormLocation(profile['location'] || '');
      setFormInfo(profile['buyer_information'] || '');

      // If profile is incomplete, automatically open the edit view
      if (profile['profile_status'] !== 'verified') {
        setIsEditing(true);
      }

      setLoadingItems(true);

      if (role === 'artisan') {
        setTab('Products');
        // Fetch products list
        api.get<any>('/products')
          .then(data => {
            setProducts(data?.items || []);
          })
          .catch(err => console.error('Failed to load products:', err));

        // Fetch dashboard stats
        api.get<any>('/artisans/me/dashboard')
          .then(res => {
            if (res.stats) setStats(res.stats);
          })
          .catch(err => console.error('Failed to load dashboard stats:', err))
          .finally(() => setLoadingItems(false));
      } else if (role === 'buyer') {
        setTab('Requests');
        // Fetch buyer requests
        api.get<any>('/buyers/requests')
          .then(data => {
            setBuyerRequests(data?.items || []);
          })
          .catch(err => console.error('Failed to load B2B requests:', err))
          .finally(() => setLoadingItems(false));
      } else {
        setLoadingItems(false);
      }
    }
  }, [user, profile, role, loading]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const payload: Record<string, any> = {};
      payload['name'] = formName;
      payload['phone'] = formPhone;

      if (role === 'artisan') {
        payload['state'] = formState;
        payload['district'] = formDistrict;
        payload['craft_type'] = formCraftType;
      } else if (role === 'buyer') {
        payload['location'] = formLocation;
        payload['organization_name'] = formOrgName;
        payload['business_category'] = formCategory;
        payload['buyer_information'] = formInfo;
      }

      await api.put<any>('/profile/me', payload);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      toast.error(error.message || 'Failed to save profile details');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate({ to: '/login' });
  };

  // 1. Calculate Profile Completeness Percentage
  const calculateCompleteness = () => {
    if (!profile) return 0;
    let completedFields = 0;
    const totalFields = 5;

    if (role === 'artisan') {
      if (profile['name']) completedFields++;
      if (profile['phone']) completedFields++;
      if (profile['state']) completedFields++;
      if (profile['district']) completedFields++;
      if (profile['craft_type']) completedFields++;
    } else if (role === 'buyer') {
      if (profile['name']) completedFields++;
      if (profile['phone']) completedFields++;
      if (profile['location']) completedFields++;
      if (profile['organization_name']) completedFields++;
      if (profile['business_category']) completedFields++;
    }

    return Math.round((completedFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center p-6 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Loading your profile details...</p>
          <button
            onClick={() => refreshProfile()}
            className="btn-outline text-xs py-2 px-4 font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </PhoneFrame>
    );
  }

  const name = profile['name'] || user.email?.split('@')[0] || 'User';
  const state = profile['state'] || 'Unknown';
  const district = profile['district'] || 'Unknown';
  const craftType = profile['craft_type'] || 'Crafts';
  const isVerified = profile['profile_status'] === 'verified';
  const completenessPercent = calculateCompleteness();

  // 2. Resolve Profile Avatar from Google OAuth user info or dynamic Initials API
  const avatarUrl = profile['profile_image'] || 
                    user.user_metadata?.['avatar_url'] || 
                    user.user_metadata?.['picture'] || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128&bold=true`;

  return (
    <PhoneFrame>
      <div className="space-y-4 px-4 pb-8 pt-4">
        
        {/* Profile Card */}
        <section className="ai-surface app-card space-y-3.5 p-5 text-center relative overflow-hidden">
          {/* Verified Badge Header */}
          <div className="flex justify-center">
            {isVerified ? (
              <span className="badge bg-success/10 text-success text-[10px] font-bold px-3 py-1 rounded-full border border-success/20 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-success fill-success/15" /> Verified Profile
              </span>
            ) : (
              <span className="badge bg-destructive/10 text-destructive text-[10px] font-bold px-3 py-1 rounded-full border border-destructive/20 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-destructive fill-destructive/15 animate-pulse" /> Setup Required
              </span>
            )}
          </div>

          <div className="relative mx-auto w-fit">
            <img
              src={avatarUrl}
              alt={name}
              width={600}
              height={600}
              className="h-24 w-24 rounded-full border-4 border-card object-cover border-primary/20 shadow-sm"
            />
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl font-extrabold">{name}</h1>
            {role === 'artisan' ? (
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {craftType} Artisan, {district}, {state}
              </p>
            ) : (
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> Buyer at {profile['organization_name'] || 'Independent Company'}, {profile['location'] || 'India'}
              </p>
            )}
          </div>

          {/* Completeness Indicator */}
          <div className="space-y-1 px-1 py-1 text-left bg-secondary/35 rounded-xl p-3 border border-border/20">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Profile Setup Progress</span>
              <span className="text-primary">{completenessPercent}%</span>
            </div>
            <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
              <div 
                className="absolute left-0 top-0 h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Breakdown (Artisan only) */}
          {role === 'artisan' && isVerified && (
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl bg-secondary py-3">
              {[
                [products.length.toString(), 'Products'],
                [stats.market_opportunities?.toString() || '0', 'Matches'],
                [stats.pending_products?.toString() || '0', 'Reviewing'],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-lg font-extrabold text-primary">{v}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button 
              onClick={() => setIsEditing(true)}
              className="btn-cta text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
            <button 
              onClick={handleSignOut} 
              className="btn-outline text-xs py-2.5 text-destructive border-destructive/20 hover:bg-destructive/5 font-semibold"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* ─── EDIT PROFILE VIEW ─── */}
        {isEditing && (
          <section className="app-card p-5 border border-primary/30 bg-card space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-display font-extrabold text-lg text-primary">Complete Profile Setup</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Setup Status: {completenessPercent}% Complete</p>
              </div>
              {isVerified && (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                  placeholder="e.g. Meena Devi"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              {role === 'artisan' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State</label>
                      <input
                        type="text"
                        required
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                        placeholder="e.g. Bihar"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">District</label>
                      <input
                        type="text"
                        required
                        value={formDistrict}
                        onChange={(e) => setFormDistrict(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                        placeholder="e.g. Madhubani"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Craft Category</label>
                    <input
                      type="text"
                      required
                      value={formCraftType}
                      onChange={(e) => setFormCraftType(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                      placeholder="e.g. Madhubani Painting, Wooden Carving"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organization Name</label>
                    <input
                      type="text"
                      required
                      value={formOrgName}
                      onChange={(e) => setFormOrgName(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                      placeholder="e.g. Indian Craft Hub Ltd."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business Category</label>
                      <input
                        type="text"
                        required
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                        placeholder="e.g. B2B Wholesaler"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</label>
                      <input
                        type="text"
                        required
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none"
                        placeholder="e.g. New Delhi"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sourcing Description / Requirements</label>
                    <textarea
                      rows={3}
                      value={formInfo}
                      onChange={(e) => setFormInfo(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/50 outline-none resize-none"
                      placeholder="Describe what kind of crafts you source..."
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={updatingProfile}
                className="btn-cta w-full py-3.5 flex justify-center items-center font-bold text-sm mt-2"
              >
                {updatingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save and Verify Profile'}
              </button>
            </form>
          </section>
        )}

        {/* ─── MAIN APP CONTENTS (Verified only) ─── */}
        {isVerified && !isEditing && (() => {
          const publishedProducts = products.filter(p => p.status === 'published');
          const draftProducts = products.filter(p => p.status !== 'published');

          return (
            <div className="space-y-4">
              {/* Tabs Selector */}
              <div className="flex gap-4 border-b border-border overflow-x-auto pb-1">
                {role === 'artisan' ? (
                  <>
                    <button
                      onClick={() => setTab('Products')}
                      className={`-mb-px border-b-2 pb-2 text-xs font-extrabold whitespace-nowrap transition-colors ${tab === 'Products' || (tab as any) === 'Published' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    >
                      🛍 Published ({publishedProducts.length})
                    </button>
                    <button
                      onClick={() => setTab('Drafts' as any)}
                      className={`-mb-px border-b-2 pb-2 text-xs font-extrabold whitespace-nowrap transition-colors ${(tab as any) === 'Drafts' ? 'border-warning text-warning' : 'border-transparent text-muted-foreground'}`}
                    >
                      📝 Drafts ({draftProducts.length})
                    </button>
                    <button
                      onClick={() => setTab('About')}
                      className={`-mb-px border-b-2 pb-2 text-xs font-extrabold whitespace-nowrap transition-colors ${tab === 'About' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    >
                      👤 About
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setTab('Requests')}
                      className={`-mb-px border-b-2 pb-2 text-xs font-extrabold whitespace-nowrap ${tab === 'Requests' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    >
                      B2B Requests ({buyerRequests.length})
                    </button>
                    <button
                      onClick={() => setTab('Story')}
                      className={`-mb-px border-b-2 pb-2 text-xs font-extrabold whitespace-nowrap ${tab === 'Story' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    >
                      Sourcing Info
                    </button>
                  </>
                )}
              </div>

              {/* Tab 1: Published Products */}
              {(tab === 'Products' || (tab as any) === 'Published') && role === 'artisan' && (
                <div className="space-y-4 pt-2">
                  <Link
                    to="/add"
                    className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-card px-4 py-6 text-center shadow-xs hover:border-primary transition-colors"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                      <Plus className="h-6 w-6" />
                    </span>
                    <span className="font-display text-lg font-extrabold text-primary">Add New Product</span>
                    <span className="text-xs text-muted-foreground">
                      Use <Sparkles className="inline h-3.5 w-3.5 text-ai" /> AI Studio to generate listings automatically.
                    </span>
                  </Link>

                  {loadingItems ? (
                    <p className="text-center text-xs font-bold text-muted-foreground py-6">Loading products...</p>
                  ) : publishedProducts.length === 0 ? (
                    <div className="text-center py-8 bg-secondary/30 rounded-2xl p-4 border border-border/40 space-y-2">
                      <p className="text-sm font-bold text-foreground">No Published Products Yet</p>
                      <p className="text-xs text-muted-foreground">Your live products will appear here once published to the marketplace.</p>
                    </div>
                  ) : (
                    publishedProducts.map((p) => {
                      const formattedPrice = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : '--';
                      return (
                        <article key={p.id} className="app-card overflow-hidden border border-border bg-card shadow-xs">
                          <div className="relative">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                loading="lazy"
                                width={800}
                                height={700}
                                className="h-48 w-full object-cover"
                              />
                            ) : (
                              <div className="h-48 w-full bg-secondary flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No photo</span>
                              </div>
                            )}
                            <span className="absolute left-3 top-3 rounded-full bg-success px-2.5 py-1 text-[10px] font-extrabold text-success-foreground uppercase tracking-wide">
                              Live Listing
                            </span>
                          </div>
                          <div className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="min-w-0 truncate font-display text-lg font-extrabold">{p.name || 'Artisan Product'}</h2>
                              <span className="shrink-0 font-extrabold text-primary text-base">{formattedPrice}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {p.category && <Chip>{p.category}</Chip>}
                              {p.material && <Chip>{p.material}</Chip>}
                              {p.craft_type && <Chip>{p.craft_type}</Chip>}
                            </div>
                            <Link to="/review" search={{ productId: p.id }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-bold hover:bg-secondary-foreground/10">
                              <Pencil className="h-3.5 w-3.5" /> View / Edit Product Page
                            </Link>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 2: Draft Products */}
              {(tab as any) === 'Drafts' && role === 'artisan' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold px-1 text-muted-foreground">
                    <span>Draft Listings ({draftProducts.length})</span>
                    <span className="text-ai">In Progress</span>
                  </div>

                  {loadingItems ? (
                    <p className="text-center text-xs font-bold text-muted-foreground py-6">Loading drafts...</p>
                  ) : draftProducts.length === 0 ? (
                    <div className="text-center py-8 bg-secondary/30 rounded-2xl p-4 border border-border/40 space-y-2">
                      <p className="text-sm font-bold text-foreground">No Drafts Pending</p>
                      <p className="text-xs text-muted-foreground">Draft listings being created will appear here for review and publishing.</p>
                    </div>
                  ) : (
                    draftProducts.map((p) => {
                      return (
                        <article key={p.id} className="app-card overflow-hidden border border-warning/30 bg-card shadow-xs">
                          <div className="relative">
                            {p.image_url || p.original_image_url ? (
                              <img
                                src={p.image_url || p.original_image_url}
                                alt={p.name}
                                loading="lazy"
                                width={800}
                                height={700}
                                className="h-44 w-full object-cover"
                              />
                            ) : (
                              <div className="h-44 w-full bg-secondary flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No photo uploaded</span>
                              </div>
                            )}
                            <span className="absolute left-3 top-3 rounded-full bg-warning px-2.5 py-1 text-[10px] font-extrabold text-warning-foreground uppercase tracking-wide">
                              Draft Listing
                            </span>
                          </div>
                          <div className="space-y-3 p-4">
                            <h2 className="font-display text-base font-bold truncate">{p.name || 'Untitled Draft'}</h2>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {p.voice_transcript || 'Description pending. Click below to complete voice description, set price & publish.'}
                            </p>
                            <Link to="/review" search={{ productId: p.id }} className="btn-cta w-full py-3 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-yellow-300" /> Continue & Publish Draft
                            </Link>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab Contents: Artisan About */}
              {tab === 'About' && role === 'artisan' && (
                <p className="app-card p-4 text-sm leading-relaxed text-muted-foreground">
                  {profile['location'] || `${name} has been practicing ${craftType} in ${state} for several years. Her workshop supports local artisans and produces traditional, high-quality handcrafted work.`}
                </p>
              )}

              {/* Tab Contents: Buyer Requests */}
              {tab === 'Requests' && role === 'buyer' && (
                <div className="space-y-4 text-left">
                  <Link
                    to="/explore"
                    className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/45 bg-card px-4 py-8 text-center"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="h-6 w-6" />
                    </span>
                    <span className="font-display text-xl font-bold text-primary">Create B2B Request</span>
                    <span className="text-sm text-muted-foreground">
                      Define bulk order quantities, budgets, and deadlines to match with registered artisans.
                    </span>
                  </Link>

                  {loadingItems ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Loading B2B requests...</p>
                  ) : buyerRequests.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">No sourcing requests created yet.</p>
                  ) : (
                    buyerRequests.map((req: any) => (
                      <article key={req.id} className="app-card p-4 border border-border space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="badge bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20">
                              {req.product_category}
                            </span>
                            <h3 className="font-display font-bold text-base mt-1.5">Bulk order for {req.quantity} units</h3>
                          </div>
                          <span className="badge bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded border border-success/20">
                            {req.status?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{req.description || 'No description provided.'}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/50">
                          <div>Budget: ₹{req.budget_per_unit} / unit</div>
                          <div>Deadline: {req.deadline}</div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}

              {/* Tab Contents: Buyer Story */}
              {tab === 'Story' && role === 'buyer' && (
                <div className="app-card p-4 space-y-3 text-left">
                  <h3 className="font-display font-bold text-sm text-primary">Sourcing Intent</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {profile['buyer_information'] || 'No sourcing details entered. Edit your profile to describe your business requirements and interest.'}
                  </p>
                  <div className="space-y-1 pt-1.5 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {profile['phone']}</div>
                    <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> {profile['business_category']}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </PhoneFrame>
  );
}
