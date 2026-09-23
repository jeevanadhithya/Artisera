const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pgClient.connect();
  for (const table of ['artisans', 'buyers', 'users']) {
    const res = await pgClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    console.log(`\nColumns of public.${table}:`, res.rows.map(r => r.column_name));
  }
  await pgClient.end();
}

main().catch(console.error);
