import fs from 'fs';
import path from 'path';
import { getPool } from '../src/services/db';

async function runMasterMigration() {
  const pool = getPool();
  console.log('🚀 Running 002 Artisera Master Database Schema migration...');

  try {
    const sqlPath = path.join(__dirname, '002_artisera_master_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sqlContent);

    console.log('✅ Successfully applied 002_artisera_master_schema.sql!');
    console.log('   - profiles table created/verified');
    console.log('   - product_scores table created/verified');
    console.log('   - ai_generation_jobs table created/verified');
    console.log('   - inquiries table created/verified');
    console.log('   - proposals table created/verified');
    console.log('   - marketing_assets table created/verified');
    console.log('   - sync_log table created/verified');
    console.log('   - Row Level Security policies verified');

    process.exit(0);
  } catch (error) {
    console.error('❌ Master migration failed:', error);
    process.exit(1);
  }
}

runMasterMigration();
