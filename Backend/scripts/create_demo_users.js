const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uxjgekvgaxrcvzhatzmt.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pgClient.connect();
  console.log('Connected to PostgreSQL database!');

  // Check auth.users
  const authUsers = await pgClient.query(`
    SELECT id, email FROM auth.users WHERE email IN ('artisan@artisera.com', 'buyer@artisera.com')
  `);
  console.log('Existing auth users:', authUsers.rows);

  // 1. Setup Master Artisan: artisan@artisera.com / Password123
  let artisanUserId;
  const existingArtisan = authUsers.rows.find(u => u.email === 'artisan@artisera.com');
  if (existingArtisan) {
    artisanUserId = existingArtisan.id;
    console.log('Artisan auth user exists:', artisanUserId);
    const { error } = await supabase.auth.admin.updateUserById(artisanUserId, {
      password: 'Password123',
      email_confirm: true,
      user_metadata: { name: 'Master Artisan', role: 'artisan' }
    });
    if (error) console.error('Update artisan error:', error);
    else console.log('Updated artisan auth user password and confirmed email');
  } else {
    console.log('Creating artisan auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'artisan@artisera.com',
      password: 'Password123',
      email_confirm: true,
      user_metadata: { name: 'Master Artisan', role: 'artisan' }
    });
    if (error) throw error;
    artisanUserId = data.user.id;
    console.log('Created artisan auth user:', artisanUserId);
  }

  // Ensure record in public.artisans
  const artCheck = await pgClient.query(`SELECT id FROM public.artisans WHERE user_id = $1`, [artisanUserId]);
  if (artCheck.rows.length === 0) {
    const ins = await pgClient.query(`
      INSERT INTO public.artisans (user_id, name, phone, craft_type, state, district, location, profile_status, preferred_language, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `, [
      artisanUserId,
      'Master Artisan',
      '+91 98765 43210',
      'Traditional Handicrafts',
      'Rajasthan',
      'Jaipur',
      'Jaipur, Rajasthan',
      'verified',
      'en',
      'Hindi, English'
    ]);
    console.log('Inserted public.artisans record:', ins.rows[0].id);
  } else {
    console.log('public.artisans record exists:', artCheck.rows[0].id);
    await pgClient.query(`UPDATE public.artisans SET name = $1, profile_status = 'verified', language = 'Hindi, English' WHERE id = $2`, ['Master Artisan', artCheck.rows[0].id]);
  }

  // 2. Setup Wholesale Buyer: buyer@artisera.com / Password123
  let buyerUserId;
  const existingBuyer = authUsers.rows.find(u => u.email === 'buyer@artisera.com');
  if (existingBuyer) {
    buyerUserId = existingBuyer.id;
    console.log('Buyer auth user exists:', buyerUserId);
    const { error } = await supabase.auth.admin.updateUserById(buyerUserId, {
      password: 'Password123',
      email_confirm: true,
      user_metadata: { name: 'B2B Wholesale Buyer', role: 'buyer' }
    });
    if (error) console.error('Update buyer error:', error);
    else console.log('Updated buyer auth user password and confirmed email');
  } else {
    console.log('Creating buyer auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'buyer@artisera.com',
      password: 'Password123',
      email_confirm: true,
      user_metadata: { name: 'B2B Wholesale Buyer', role: 'buyer' }
    });
    if (error) throw error;
    buyerUserId = data.user.id;
    console.log('Created buyer auth user:', buyerUserId);
  }

  // Ensure record in public.buyers
  const buyerCheck = await pgClient.query(`SELECT id FROM public.buyers WHERE user_id = $1`, [buyerUserId]);
  if (buyerCheck.rows.length === 0) {
    const ins = await pgClient.query(`
      INSERT INTO public.buyers (user_id, name, organization_name, phone, business_category, location, buyer_information, profile_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `, [
      buyerUserId,
      'B2B Wholesale Buyer',
      'Artisera Global Heritage Procurement',
      '+91 98765 12345',
      'Boutique & Corporate Gifting',
      'New Delhi, India',
      'Verified wholesale buyer sourcing authentic handmade crafts directly from artisan clusters.',
      'verified'
    ]);
    console.log('Inserted public.buyers record:', ins.rows[0].id);
  } else {
    console.log('public.buyers record exists:', buyerCheck.rows[0].id);
    await pgClient.query(`UPDATE public.buyers SET name = $1, organization_name = $2, profile_status = 'verified' WHERE id = $3`, [
      'B2B Wholesale Buyer',
      'Artisera Global Heritage Procurement',
      buyerCheck.rows[0].id
    ]);
  }

  console.log('\n--- 3. Verifying Login via Supabase Auth API ---');
  // Test signing in as artisan
  const { data: artAuth, error: artAuthErr } = await supabase.auth.signInWithPassword({
    email: 'artisan@artisera.com',
    password: 'Password123'
  });
  if (artAuthErr) {
    console.error('Artisan sign in failed:', artAuthErr);
  } else {
    console.log('✅ Artisan Sign In SUCCESS! User ID:', artAuth.user.id, 'Role:', artAuth.user.user_metadata.role);
  }

  // Test signing in as buyer
  const { data: buyAuth, error: buyAuthErr } = await supabase.auth.signInWithPassword({
    email: 'buyer@artisera.com',
    password: 'Password123'
  });
  if (buyAuthErr) {
    console.error('Buyer sign in failed:', buyAuthErr);
  } else {
    console.log('✅ Buyer Sign In SUCCESS! User ID:', buyAuth.user.id, 'Role:', buyAuth.user.user_metadata.role);
  }

  await pgClient.end();
  console.log('All done!');
}

main().catch(console.error);
