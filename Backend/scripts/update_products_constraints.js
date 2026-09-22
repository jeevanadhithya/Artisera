const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database!');

  // 1. Ensure a universal fallback artisan exists in public.artisans
  // First check if a system/master artisan exists
  const existingArtisan = await client.query(`SELECT id FROM public.artisans ORDER BY created_at ASC LIMIT 1;`);
  let defaultArtisanId = existingArtisan.rows.length > 0 ? existingArtisan.rows[0].id : null;

  // 2. Make artisan_id in public.products nullable with default or set null on delete
  await client.query(`
    ALTER TABLE public.products ALTER COLUMN artisan_id DROP NOT NULL;
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_artisan_id_fkey;
    ALTER TABLE public.products ADD CONSTRAINT products_artisan_id_fkey 
      FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE SET NULL;
  `);
  console.log('artisan_id constraint updated to nullable with ON DELETE SET NULL');

  // 3. Make sure all RLS policies on public.products and public.artisans allow anon/public operations
  await client.query(`
    DROP POLICY IF EXISTS "Public can insert products" ON public.products;
    CREATE POLICY "Public can insert products" ON public.products FOR INSERT TO public WITH CHECK (true);

    DROP POLICY IF EXISTS "Public can select products" ON public.products;
    CREATE POLICY "Public can select products" ON public.products FOR SELECT TO public USING (true);

    DROP POLICY IF EXISTS "Public can update products" ON public.products;
    CREATE POLICY "Public can update products" ON public.products FOR UPDATE TO public USING (true);

    DROP POLICY IF EXISTS "Public can delete products" ON public.products;
    CREATE POLICY "Public can delete products" ON public.products FOR DELETE TO public USING (true);
  `);
  console.log('RLS policies updated on public.products!');

  await client.end();
}

run().catch(console.error);
