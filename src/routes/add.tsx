import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { Camera, Mic, Image as ImageIcon, Pencil, X, ShieldAlert, Sparkles, Upload, ArrowRight, CheckCircle, Wand2, Layers } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/add')({
  component: AddProduct,
});

function AddProduct() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Initializing draft...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDraftAndNavigate = async (targetRoute: '/camera' | '/review' | '/pricing', file?: File) => {
    if (!user) {
      toast.error('You must be signed in to create a product');
      navigate({ to: '/login' });
      return;
    }

    if (profile?.profile_status !== 'verified') {
      toast.error('Please complete and verify your profile first.');
      return;
    }

    setLoading(true);
    setLoadingText('Initializing product listing...');
    try {
      const defaultPayload = {
        name: 'Untitled Craft Draft',
        status: 'draft',
      };
      
      const response = await api.post<any>('/products', defaultPayload);
      const productId = response.id;
      
      if (!productId) throw new Error('Product creation did not return an ID');

      if (file) {
        setLoadingText('Uploading and enhancing image...');
        try {
          await api.uploadImage(productId, file);
        } catch (imgErr) {
          console.warn('Initial image upload failed, proceeding to camera route:', imgErr);
        }
      }

      navigate({ 
        to: targetRoute,
        search: { productId }
      });
    } catch (error: any) {
      console.error('Failed to create product draft:', error);
      toast.error(error.message || 'Failed to initialize product listing');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      createDraftAndNavigate('/camera', file);
    }
  };

  if (authLoading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  // Check Profile setup and verification status
  if (profile?.profile_status !== 'verified') {
    return (
      <PhoneFrame chrome={false}>
        <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-card text-center space-y-6">
          <div className="h-16 w-16 bg-destructive/10 border border-destructive/20 text-destructive rounded-full flex items-center justify-center animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-extrabold text-foreground">Verification Required</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Complete your artisan profile and identity verification before publishing handcrafted products.
            </p>
          </div>

          <div className="w-full pt-4">
            <Link
              to="/profile"
              className="btn-cta w-full py-4 text-center flex justify-center items-center font-bold text-sm"
            >
              Complete Profile Verification
            </Link>
          </div>

          <Link
            to="/"
            className="text-xs font-bold text-muted-foreground hover:underline pt-2 block"
          >
            Cancel and Return Home
          </Link>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="relative flex min-h-[calc(100vh-8rem)] flex-col justify-between p-4 pb-6 space-y-5">
        {/* Top Navigation Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-ai uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Artisera AI Studio
            </div>
            <h1 className="font-display text-2xl font-black text-foreground mt-0.5">Add New Craft</h1>
          </div>
          <button
            onClick={() => navigate({ to: '/' })}
            className="grid h-10 w-10 place-items-center rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center space-y-2 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-xs font-bold text-primary">{loadingText}</p>
          </div>
        )}

        {/* Main Option Cards */}
        <div className="space-y-3.5">
          {/* Option 1: AI Camera Studio */}
          <button
            onClick={() => createDraftAndNavigate('/camera')}
            disabled={loading}
            className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 text-left shadow-sm hover:border-primary/60 hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-extrabold text-primary uppercase tracking-wide">
                <Wand2 className="h-3 w-3" /> Auto Enhance
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h2 className="font-display text-lg font-extrabold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                📸 Take Craft Photo <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Capture live photo. AI will automatically brighten lighting, adjust contrast, center your product, and clean clutter.
              </p>
            </div>
          </button>

          {/* Option 2: Sarvam AI Voice Description */}
          <button
            onClick={() => createDraftAndNavigate('/review')}
            disabled={loading}
            className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-ai/30 bg-gradient-to-br from-ai/15 via-card to-card p-5 text-left shadow-sm hover:border-ai/60 hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-xl bg-ai text-ai-foreground flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Mic className="h-6 w-6 animate-pulse" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-ai/20 px-3 py-1 text-[11px] font-extrabold text-ai uppercase tracking-wide">
                ✨ Sarvam Voice AI
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h2 className="font-display text-lg font-extrabold text-foreground group-hover:text-ai transition-colors flex items-center gap-2">
                🎙 Describe with Voice <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Speak in Hindi, English, Tamil, Telugu, Bengali, or your local language. AI transcribes and constructs full marketplace metadata.
              </p>
            </div>
          </button>

          {/* Secondary Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/50 p-4 text-center hover:bg-secondary transition-colors"
            >
              <Upload className="h-5 w-5 text-primary" />
              <div>
                <span className="text-xs font-bold block text-foreground">🖼 Upload Image</span>
                <span className="text-[10px] text-muted-foreground">From Gallery</span>
              </div>
            </button>

            <button
              onClick={() => createDraftAndNavigate('/review')}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/50 p-4 text-center hover:bg-secondary transition-colors"
            >
              <Pencil className="h-5 w-5 text-ai" />
              <div>
                <span className="text-xs font-bold block text-foreground">✏️ Manual Form</span>
                <span className="text-[10px] text-muted-foreground">Type Details</span>
              </div>
            </button>
          </div>
        </div>

        {/* Craft Categories Quick Reference */}
        <div className="rounded-2xl bg-secondary/40 p-4 border border-border/50 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Popular Craft Categories
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">AI Powered</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Bamboo & Cane', 'Terracotta Pottery', 'Handloom Textiles', 'Brasswork', 'Wood Carving', 'Leathercraft'].map((cat) => (
              <span key={cat} className="rounded-lg bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground border border-border/40">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Photography Tip */}
        <div className="flex items-center gap-3 rounded-2xl bg-card p-3 border border-border text-xs text-muted-foreground">
          <CheckCircle className="h-5 w-5 shrink-0 text-success" />
          <p className="leading-snug">
            <strong className="text-foreground">Pro Tip:</strong> Take photo in natural daylight for 98%+ AI description accuracy.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`} />;
}
