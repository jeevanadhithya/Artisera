-- Artisera Database Schema

-- 1. Artisans Table
CREATE TABLE IF NOT EXISTS public.artisans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    location TEXT,
    craft_type TEXT NOT NULL,
    cluster_id TEXT,
    profile_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    material TEXT,
    craft_type TEXT,
    region TEXT,
    price NUMERIC(10, 2),
    minimum_price NUMERIC(10, 2),
    maximum_price NUMERIC(10, 2),
    description_en TEXT,
    description_hi TEXT,
    keywords TEXT[],
    status TEXT DEFAULT 'draft'::text NOT NULL,
    image_url TEXT,
    original_image_url TEXT,
    enhanced_image_url TEXT,
    voice_transcript TEXT,
    voice_language TEXT,
    ai_generated BOOLEAN DEFAULT false NOT NULL,
    ai_confidence NUMERIC(4, 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Buyer Requests Table
CREATE TABLE IF NOT EXISTS public.buyer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_category TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    budget_per_unit NUMERIC(10, 2) NOT NULL,
    location TEXT NOT NULL,
    deadline DATE NOT NULL,
    status TEXT DEFAULT 'open'::text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 4. Set up Row Level Security (RLS) - Basic Policy
-- Note: In a production app you'd want stricter policies, but these allow the API to function.
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (service role bypasses RLS automatically)
CREATE POLICY "Enable all access for authenticated users" ON public.artisans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.buyer_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous reads for public marketplace
CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "Enable read access for all users" ON public.artisans FOR SELECT USING (true);

-- 5. Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.wishlists FOR ALL TO authenticated USING (true) WITH CHECK (true);

