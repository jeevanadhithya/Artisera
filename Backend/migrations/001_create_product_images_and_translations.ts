import { getPool } from '../src/services/db';

async function runMigration() {
  const pool = getPool();
  console.log('Running database migration for product_images and product_translations...');

  try {
    // 1. Add primary_image_url and selected_image_url to products if missing
    await pool.query(`
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS primary_image_url TEXT,
      ADD COLUMN IF NOT EXISTS selected_image_url TEXT;
    `);
    console.log('✅ products table columns updated');

    // 2. Create product_images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
        artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
        original_image_url TEXT NOT NULL,
        enhanced_image_url TEXT,
        selected_image_url TEXT,
        processing_status TEXT NOT NULL DEFAULT 'uploaded',
        analysis_status TEXT DEFAULT 'pending',
        enhancement_prompt TEXT,
        mime_type TEXT,
        file_size BIGINT,
        analysis_result JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('✅ product_images table created');

    // 3. Create indexes on product_images
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_images_artisan_id ON public.product_images(artisan_id);
      CREATE INDEX IF NOT EXISTS idx_product_images_status ON public.product_images(processing_status);
    `);
    console.log('✅ product_images indexes created');

    // 4. Create product_translations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.product_translations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
        language_code TEXT NOT NULL,
        title TEXT,
        short_description TEXT,
        description TEXT,
        keywords TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(product_id, language_code)
      );
    `);
    console.log('✅ product_translations table created');

    // 5. Enable RLS and add basic policies
    await pool.query(`
      ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'Enable all access for authenticated users on product_images'
        ) THEN
          CREATE POLICY "Enable all access for authenticated users on product_images" 
          ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'Enable read access for all on product_images'
        ) THEN
          CREATE POLICY "Enable read access for all on product_images" 
          ON public.product_images FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'product_translations' AND policyname = 'Enable all access for authenticated users on product_translations'
        ) THEN
          CREATE POLICY "Enable all access for authenticated users on product_translations" 
          ON public.product_translations FOR ALL TO authenticated USING (true) WITH CHECK (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'product_translations' AND policyname = 'Enable read access for all on product_translations'
        ) THEN
          CREATE POLICY "Enable read access for all on product_translations" 
          ON public.product_translations FOR SELECT USING (true);
        END IF;
      END $$;
    `);
    console.log('✅ RLS policies applied');

    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
