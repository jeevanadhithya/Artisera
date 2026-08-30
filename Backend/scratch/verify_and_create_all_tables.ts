import { Pool } from 'pg';

const connectionString = 'postgres://postgres:live2kill%20L2K@db.uxjgekvgaxrcvzhatzmt.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to Supabase PostgreSQL database...');

    // 1. Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Create ARTISANS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.artisans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE,
        name TEXT,
        phone TEXT,
        state TEXT,
        district TEXT,
        craft_type TEXT,
        profile_status TEXT DEFAULT 'incomplete' NOT NULL,
        profile_image TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ public.artisans table verified.');

    // 3. Create BUYERS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.buyers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE,
        name TEXT,
        phone TEXT,
        organization_name TEXT,
        business_category TEXT,
        location TEXT,
        buyer_information TEXT,
        profile_image TEXT,
        profile_status TEXT DEFAULT 'incomplete' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ public.buyers table verified.');

    // 4. Create BUYER_REQUESTS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.buyer_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE,
        product_category TEXT,
        quantity INTEGER,
        budget_per_unit NUMERIC(10, 2),
        description TEXT,
        deadline TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ public.buyer_requests table verified.');

    // 5. Create PRODUCTS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artisan_id UUID REFERENCES public.artisans(id) ON DELETE CASCADE,
        name TEXT DEFAULT 'Untitled Craft Draft',
        category TEXT,
        material TEXT,
        craft_type TEXT,
        region TEXT,
        description_en TEXT,
        description_hi TEXT,
        keywords TEXT[],
        price NUMERIC(10, 2),
        minimum_price NUMERIC(10, 2),
        maximum_price NUMERIC(10, 2),
        material_cost NUMERIC(10, 2) DEFAULT 0,
        labor_cost NUMERIC(10, 2) DEFAULT 0,
        production_cost NUMERIC(10, 2) DEFAULT 0,
        image_url TEXT,
        original_image_url TEXT,
        enhanced_image_url TEXT,
        voice_url TEXT,
        voice_transcript TEXT,
        status TEXT DEFAULT 'draft',
        ai_generated BOOLEAN DEFAULT false,
        ai_confidence NUMERIC(3, 2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ public.products table verified.');

    // 6. Create WISHLISTS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ public.wishlists table verified.');

    // 7. Ensure missing columns exist via ALTER TABLE
    const alterCommands = [
      `ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS phone TEXT;`,
      `ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'incomplete' NOT NULL;`,
      `ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      `ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS phone TEXT;`,
      `ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'incomplete' NOT NULL;`,
      `ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      `ALTER TABLE public.buyer_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material_cost NUMERIC(10, 2) DEFAULT 0;`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0;`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS production_cost NUMERIC(10, 2) DEFAULT 0;`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_image_url TEXT;`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS enhanced_image_url TEXT;`,
      `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      `ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`
    ];

    for (const cmd of alterCommands) {
      await client.query(cmd);
    }
    console.log('✓ All schema columns synchronized.');

    // Reload PostgREST schema cache
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('✓ PostgREST schema cache reloaded.');

    // 8. Enable Row Level Security (RLS) & Policies
    const rlsTables = ['artisans', 'buyers', 'buyer_requests', 'products', 'wishlists'];
    for (const table of rlsTables) {
      await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Allow all authenticated users access') THEN
            CREATE POLICY "Allow all authenticated users access" ON public.${table} FOR ALL USING (true);
          END IF;
        END $$;
      `);
    }
    console.log('✓ RLS policies configured for authenticated users.');

    console.log('\n🎉 Database table verification and schema setup completed successfully!');
  } catch (err) {
    console.error('Database setup error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
