import { uploadProductImage, uploadEnhancedImage } from '../src/services/storage';

async function test() {
  try {
    console.log('Testing image upload to Supabase Storage...');
    // Create a 10x10 dummy JPEG image buffer (magic bytes 0xFF 0xD8)
    const dummyJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x0a, 0x00, 0x0a, 0x01, 0x01,
      0x11, 0x00, 0xff, 0xc9, 0x00, 0x0b, 0x08, 0x00, 0x0a, 0x00, 0x0a, 0x01,
      0x01, 0x11, 0x00, 0xff, 0xd9
    ]);

    const testProductId = 'c6fd0c22-fa29-42cf-b11f-6a0fd422c3b2';
    const publicUrl = await uploadProductImage(testProductId, dummyJpeg, 'photo.jpg', 'image/jpeg');
    console.log('✓ Original image public URL generated:', publicUrl);

    const enhancedUrl = await uploadEnhancedImage(testProductId, dummyJpeg, 'image/jpeg', 'jpg');
    console.log('✓ Enhanced image public URL generated:', enhancedUrl);

    console.log('🎉 Image upload verification passed successfully!');
  } catch (err) {
    console.error('Image upload error:', err);
  }
}

test();
