-- ══════════════════════════════════════════════════════════════════════════════
-- ARTISERA MULTILINGUAL ARTISAN GUIDE MIGRATION (004)
-- Layer 2: RAG Vector Knowledge Base, Task Guide Sessions & Step Analytics
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Verified Knowledge Documents with Vector Embeddings and Official Metadata
CREATE TABLE IF NOT EXISTS public.guide_knowledge_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn')),
    topic TEXT NOT NULL,
    scheme_or_marketplace TEXT,
    official_source_url TEXT NOT NULL,
    last_verified_date DATE NOT NULL,
    document_version TEXT NOT NULL,
    state_applicability TEXT[],
    content TEXT NOT NULL,
    key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding FLOAT8[] NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guide_docs_lang_topic ON public.guide_knowledge_documents(language, topic);
CREATE INDEX IF NOT EXISTS idx_guide_docs_scheme ON public.guide_knowledge_documents(scheme_or_marketplace);

-- 2. Interactive Task Guide Sessions (Tracks active guided workflows)
CREATE TABLE IF NOT EXISTS public.guide_task_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    flow_type TEXT NOT NULL CHECK (flow_type IN (
        'pm_vishwakarma', 'mudra', 'pehchan', 'product_creation',
        'marketplace_readiness', 'fair_pricing', 'general_guide'
    )),
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'cancelled')) DEFAULT 'in_progress',
    selected_language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guide_sessions_user ON public.guide_task_sessions(user_id, flow_type);

-- 3. Step Analytics (Captures completions for impact and reporting)
CREATE TABLE IF NOT EXISTS public.guide_step_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    flow_type TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT true,
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guide_step_analytics ON public.guide_step_analytics(flow_type, step_number);

-- 4. Artisan Guide Helpfulness Feedback
CREATE TABLE IF NOT EXISTS public.guide_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    message_id TEXT,
    helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Add preferred_language column to artisans and profiles
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
