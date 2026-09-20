-- ══════════════════════════════════════════════════════════════════════════════
-- ARTISERA MASTER DATABASE SCHEMA MIGRATION (002)
-- Smart India Hackathon 2026 | Problem Statement 26090
-- Layer 2: Data + Backend Foundation
-- Safe, idempotent execution: uses IF NOT EXISTS throughout
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Unified User Profiles (Extends auth.users with explicit role separation)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('artisan', 'buyer', 'admin')) DEFAULT 'artisan',
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    -- Artisan specific fields
    craft_type TEXT,
    state TEXT,
    district TEXT,
    village TEXT,
    languages TEXT[] DEFAULT ARRAY['en']::text[],
    years_experience INTEGER DEFAULT 1,
    craft_story TEXT,
    production_capacity_monthly INTEGER DEFAULT 10,
    preferred_buyer_types TEXT[] DEFAULT ARRAY['retail', 'wholesale']::text[],
    profile_completion_pct INTEGER DEFAULT 20,
    -- Buyer specific fields
    company_name TEXT,
    buyer_type TEXT CHECK (buyer_type IS NULL OR buyer_type IN ('retail_consumer', 'boutique', 'interior_designer', 'corporate', 'exporter')),
    gst_number TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Product Scores (Explainable 0-100 rating across 5 key dimensions)
CREATE TABLE IF NOT EXISTS public.product_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
    overall_score NUMERIC(5, 2) NOT NULL,
    image_quality_score NUMERIC(5, 2) NOT NULL,
    catalog_quality_score NUMERIC(5, 2) NOT NULL,
    discoverability_score NUMERIC(5, 2) NOT NULL,
    pricing_competitiveness_score NUMERIC(5, 2) NOT NULL,
    market_fit_score NUMERIC(5, 2) NOT NULL,
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations TEXT[] DEFAULT ARRAY[]::text[],
    calculated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_scores_product_id ON public.product_scores(product_id);

-- 3. AI Generation Jobs (Async tracking for CV, Video, Reels, Catalog)
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN (
      'image_enhancement', 'voice_catalog', 'pricing', 'product_score',
      'image_variation', 'product_video', 'ai_reel'
    )),
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    progress_pct INTEGER DEFAULT 0,
    input_payload JSONB DEFAULT '{}'::jsonb,
    result_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON public.ai_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_product_id ON public.ai_generation_jobs(product_id);

-- 4. Buyer Inquiries & Quotation Requests
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    target_budget_per_unit NUMERIC(10, 2),
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'proposal_sent', 'accepted', 'declined', 'closed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_artisan_id ON public.inquiries(artisan_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_id ON public.inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product_id ON public.inquiries(product_id);

-- 5. B2B Quotations / Proposals
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES public.buyer_requests(id) ON DELETE SET NULL,
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quoted_price_per_unit NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    lead_time_days INTEGER NOT NULL DEFAULT 14,
    terms_and_notes TEXT,
    ai_generated BOOLEAN DEFAULT true,
    artisan_edited BOOLEAN DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'declined')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_artisan_id ON public.proposals(artisan_id);
CREATE INDEX IF NOT EXISTS idx_proposals_buyer_id ON public.proposals(buyer_id);

-- 6. Marketing Assets (Variations, Reels, Videos, GeM Packages)
CREATE TABLE IF NOT EXISTS public.marketing_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
      'variation_studio', 'variation_festive', 'variation_premium',
      'product_video', 'ai_reel', 'gem_package_pdf', 'gem_package_csv'
    )),
    asset_url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_assets_product_id ON public.marketing_assets(product_id);

-- 7. Sync Log (Auditing offline sync reconciliation)
CREATE TABLE IF NOT EXISTS public.sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_operation_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON public.sync_log(user_id);

-- 8. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users manage own; public read for verified profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can manage own profile') THEN
    CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profile view') THEN
    CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;

-- Product Scores: Visible to all if product is published, or to owning artisan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_scores' AND policyname = 'Read product scores') THEN
    CREATE POLICY "Read product scores" ON public.product_scores FOR SELECT USING (
      product_id IN (
        SELECT id FROM public.products 
        WHERE status = 'published' 
           OR artisan_id IN (SELECT id FROM public.artisans WHERE user_id = auth.uid())
      )
    );
  END IF;
END $$;

-- Inquiries: Participants only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inquiries' AND policyname = 'Inquiry participants access') THEN
    CREATE POLICY "Inquiry participants access" ON public.inquiries FOR ALL TO authenticated
    USING (buyer_id = auth.uid() OR artisan_id IN (SELECT id FROM public.artisans WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Proposals: Participants only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposals' AND policyname = 'Proposal participants access') THEN
    CREATE POLICY "Proposal participants access" ON public.proposals FOR ALL TO authenticated
    USING (buyer_id = auth.uid() OR artisan_id IN (SELECT id FROM public.artisans WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Marketing Assets: Public read for published products, artisan management
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketing_assets' AND policyname = 'Read marketing assets') THEN
    CREATE POLICY "Read marketing assets" ON public.marketing_assets FOR SELECT USING (
      product_id IN (
        SELECT id FROM public.products 
        WHERE status = 'published' 
           OR artisan_id IN (SELECT id FROM public.artisans WHERE user_id = auth.uid())
      )
    );
  END IF;
END $$;
