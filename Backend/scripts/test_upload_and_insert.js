const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4amdla3ZnYXhyY3Z6aGF0em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjMwMDMsImV4cCI6MjEwMzIzOTAwM30.GrI3IQGRwqggD7Qj3DsJRSsyeoDMHLSzM1loTgaiUFI';

async function testUploadAndSave() {
  const filename = `test_product_${Date.now()}.jpg`;
  const dummyJpg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
    0x00, 0x7B, 0x40, 0xFF, 0xD9
  ]);

  console.log('1. Uploading image to Supabase Storage...');
  const uploadRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'uxjgekvgaxrcvzhatzmt.supabase.co',
      path: `/storage/v1/object/product-images/${filename}`,
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(dummyJpg);
    req.end();
  });

  console.log('Upload status:', uploadRes.status, uploadRes.body);
  const publicUrl = `https://uxjgekvgaxrcvzhatzmt.supabase.co/storage/v1/object/public/product-images/${filename}`;
  console.log('Public URL:', publicUrl);

  console.log('2. Inserting product into Supabase PostgreSQL products table...');
  const insertPayload = JSON.stringify({
    artisan_id: 'a6a72fd0-2727-41a3-a73d-81cd5d9de138',
    name: 'Handcrafted Blue Pottery Decorative Plate',
    description_en: 'Authentic handcrafted blue pottery plate featuring traditional floral motifs and quartz glazed finish.',
    price: 650.00,
    category: 'Pottery',
    craft_type: 'Blue Pottery',
    material: 'Quartz, Glass, Multani Mitti',
    region: 'Jaipur, Rajasthan',
    image_url: publicUrl,
    primary_image_url: publicUrl,
    status: 'published'
  });

  const insertRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'uxjgekvgaxrcvzhatzmt.supabase.co',
      path: '/rest/v1/products',
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(insertPayload);
    req.end();
  });

  console.log('Insert status:', insertRes.status);
  console.log('Created product:', insertRes.body);
}

testUploadAndSave().catch(console.error);
