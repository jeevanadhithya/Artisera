const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, column_default, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products'
    ORDER BY ordinal_position;
  `);
  for (const r of res.rows) {
    if (r.is_nullable === 'NO') {
      console.log(`NOT NULL: ${r.column_name} default=${r.column_default}`);
    }
  }
  await client.end();
}

run().catch(console.error);
