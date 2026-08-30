import { getSupabase } from '../src/services/supabase';
import { config } from '../src/config';

async function main() {
  const supabase = getSupabase();
  const buckets = [config.STORAGE_BUCKET_PRODUCTS, config.STORAGE_BUCKET_VOICES];

  console.log('Verifying Supabase Storage buckets...');
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing storage buckets:', listError);
  }

  const existingNames = (existingBuckets || []).map(b => b.name);
  console.log('Existing storage buckets:', existingNames);

  for (const bucketName of buckets) {
    if (!existingNames.includes(bucketName)) {
      console.log(`Creating public storage bucket '${bucketName}'...`);
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: bucketName.includes('voice') 
          ? ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp3', 'audio/m4a', 'audio/ogg']
          : ['image/jpeg', 'image/png', 'image/webp']
      });

      if (error) {
        console.error(`Failed to create bucket '${bucketName}':`, error);
      } else {
        console.log(`✓ Bucket '${bucketName}' created successfully.`);
      }
    } else {
      console.log(`✓ Bucket '${bucketName}' already exists.`);
    }
  }

  console.log('🎉 Storage buckets setup completed.');
}

main();
