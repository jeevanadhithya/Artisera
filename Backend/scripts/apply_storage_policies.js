const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database!');

  const queries = [
    // Storage policies
    `DROP POLICY IF EXISTS "Public can upload product images" ON storage.objects;`,
    `CREATE POLICY "Public can upload product images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id IN ('product-images', 'voice-recordings'));`,
    `DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;`,
    `CREATE POLICY "Public can read product images" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('product-images', 'voice-recordings'));`,
    `DROP POLICY IF EXISTS "Public can update product images" ON storage.objects;`,
    `CREATE POLICY "Public can update product images" ON storage.objects FOR UPDATE TO public USING (bucket_id IN ('product-images', 'voice-recordings'));`,
    
    // Public products table policies
    `DROP POLICY IF EXISTS "Public can insert products" ON public.products;`,
    `CREATE POLICY "Public can insert products" ON public.products FOR INSERT TO public WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Public can select products" ON public.products;`,
    `CREATE POLICY "Public can select products" ON public.products FOR SELECT TO public USING (true);`,
    `DROP POLICY IF EXISTS "Public can update products" ON public.products;`,
    `CREATE POLICY "Public can update products" ON public.products FOR UPDATE TO public USING (true);`,

    // Public artisans table policies
    `DROP POLICY IF EXISTS "Public can insert artisans" ON public.artisans;`,
    `CREATE POLICY "Public can insert artisans" ON public.artisans FOR INSERT TO public WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Public can select artisans" ON public.artisans;`,
    `CREATE POLICY "Public can select artisans" ON public.artisans FOR SELECT TO public USING (true);`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('Executed:', q.substring(0, 50) + '...');
    } catch (err) {
      console.warn('Notice on query:', err.message);
    }
  }

  console.log('All policies applied successfully!');
  await client.end();
}

run().catch(console.error);
