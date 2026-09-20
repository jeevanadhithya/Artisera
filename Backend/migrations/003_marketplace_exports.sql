-- Marketplace export metadata. Product fields remain canonical in public.products.
-- Optional canonical fields: no adapter-specific columns are added to products.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bullet_points JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_details JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_details JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer_details JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packer_details JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS importer_details JSONB;
CREATE TABLE IF NOT EXISTS public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), marketplace TEXT NOT NULL, template_name TEXT NOT NULL,
  category TEXT, version TEXT NOT NULL, source_url TEXT, source_type TEXT NOT NULL DEFAULT 'official_reference',
  headers JSONB NOT NULL DEFAULT '[]'::jsonb, field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.marketplace_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID, marketplace TEXT NOT NULL, template_version TEXT, format TEXT NOT NULL, file_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated', validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_exports_product ON public.marketplace_exports(product_id, created_at DESC);
