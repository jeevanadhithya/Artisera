import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbPassword = process.env.DB_PASSWORD || '';
const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.uxjgekvgaxrcvzhatzmt.supabase.co:5432/postgres`;

const run = async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // 1. Add profile_status to artisans
    console.log('Checking/adding profile_status to artisans table...');
    await client.query(`
      ALTER TABLE public.artisans 
      ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'incomplete' NOT NULL;
    `);

    // 2. Add cost columns to products
    console.log('Checking/adding cost columns to products table...');
    await client.query(`
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS material_cost NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS production_cost NUMERIC(10, 2) DEFAULT 0;
    `);

    // 3. Create buyers table
    console.log('Checking/creating buyers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.buyers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          organization_name TEXT,
          phone TEXT,
          business_category TEXT,
          location TEXT,
          buyer_information TEXT,
          profile_image TEXT,
          profile_status TEXT DEFAULT 'incomplete'::text NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(user_id)
      );
    `);

    // 4. Enable RLS on buyers
    console.log('Enabling Row Level Security (RLS) on buyers table...');
    await client.query(`ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;`);
    
    // Drop existing policies first
    await client.query(`DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.buyers;`);
    await client.query(`DROP POLICY IF EXISTS "Enable read access for all users" ON public.buyers;`);

    // Create policies
    await client.query(`
      CREATE POLICY "Enable all access for authenticated users" ON public.buyers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `);
    await client.query(`
      CREATE POLICY "Enable read access for all users" ON public.buyers FOR SELECT USING (true);
    `);

    console.log('✅ Database schema updated successfully!');
  } catch (err) {
    console.error('❌ Database update failed:', err);
  } finally {
    await client.end();
  }
};

run();
