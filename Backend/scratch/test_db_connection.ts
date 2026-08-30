import { getPool, getPlatformStats } from '../src/services/db';

async function testConnection() {
  console.log('Testing Database Connection using DATABASE_URL via pg.Pool...');
  try {
    const pool = getPool();
    const nowRes = await pool.query('SELECT NOW() as current_time;');
    console.log('✅ PostgreSQL connected! Current DB Time:', nowRes.rows[0].current_time);

    const stats = await getPlatformStats();
    console.log('✅ Platform Stats fetched successfully:', stats);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
    process.exit(1);
  }
}

testConnection();
