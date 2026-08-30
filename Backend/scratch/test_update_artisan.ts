import { getSupabase } from '../src/services/supabase';
import * as db from '../src/services/db';

async function test() {
  try {
    const supabase = getSupabase();
    console.log('Fetching existing artisans...');
    const { data: artisans, error } = await supabase.from('artisans').select('*');
    if (error) {
      console.error('Fetch error:', error);
      return;
    }
    console.log('Existing artisans count:', artisans?.length);
    if (artisans && artisans.length > 0) {
      const first = artisans[0];
      console.log('First artisan before update:', first);
      
      const updated = await db.updateArtisan(first.id, {
        phone: '9941237373',
        state: 'Assam',
        district: 'Kamrup',
        craft_type: 'Weaving',
        profile_status: 'verified'
      });
      console.log('Artisan after update:', updated);
    } else {
      console.log('No artisans found in table.');
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
