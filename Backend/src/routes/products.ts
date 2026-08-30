import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireArtisan, requireVerifiedProfile, getOptionalUser, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import * as imageService from '../services/image';
import * as storageService from '../services/storage';
import * as speechService from '../services/speech';
import * as llmService from '../services/llm';
import * as pricingService from '../services/pricing';
import { BadRequestError, ForbiddenError, NotFoundError, OwnershipError } from '../types/errors';

import { getSupabase } from '../services/supabase';
import { config } from '../config';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const success = (data: any) => ({ success: true, data });

// Helper to verify product ownership
const verifyOwnership = async (productId: string, userId: string, userRole: string) => {
  const product = await db.getProductById(productId);
  if (userRole !== 'admin') {
    const artisan = await db.getArtisanByUserId(userId);
    if (!artisan || artisan.id !== product.artisan_id) {
      throw new OwnershipError('product');
    }
  }
  return product;
};

// ─── Create Product (POST /products) ──────────────────────────────────────────
router.post('/', requireAuth, requireArtisan, requireVerifiedProfile, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
    const artisan = await db.getOrCreateArtisan(user.user_id, nameHint);
    const created = await db.createProduct(artisan.id, req.body);
    res.status(201).json(success(created));
  } catch (error) {
    next(error);
  }
});

// ─── List Products (GET /products) ────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = (page - 1) * limit;

    if (user.role === 'buyer') {
      throw new ForbiddenError('Buyers should use GET /api/market/products for browsing');
    }

    if (user.role === 'admin') {
      const { items, total } = await db.getAllProducts(limit, offset);
      return res.status(200).json(success({
        items,
        total,
        page,
        limit,
        has_more: (offset + limit) < total,
      }));
    } else {
      const artisan = await db.getArtisanByUserId(user.user_id);
      if (!artisan) {
        return res.status(200).json(success({
          items: [],
          total: 0,
          page,
          limit,
          has_more: false,
        }));
      }
      const { items, total } = await db.getProductsByArtisan(artisan.id, limit, offset);
      return res.status(200).json(success({
        items,
        total,
        page,
        limit,
        has_more: (offset + limit) < total,
      }));
    }
  } catch (error) {
    next(error);
  }
});

// ─── Get Product (GET /products/:id) ──────────────────────────────────────────
router.get('/:product_id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await db.getProductById(req.params.product_id);

    if (user.role === 'buyer') {
      if (product.status !== 'published') {
        throw new NotFoundError('Product', req.params.product_id);
      }
    } else if (user.role === 'artisan') {
      const artisan = await db.getArtisanByUserId(user.user_id);
      if (!artisan || artisan.id !== product.artisan_id) {
        throw new ForbiddenError('You can only view your own products');
      }
    }

    res.status(200).json(success(product));
  } catch (error) {
    next(error);
  }
});

// ─── Update Product (PUT /products/:id) ───────────────────────────────────────
router.put('/:product_id', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);
    const updated = await db.updateProduct(req.params.product_id, req.body);
    res.status(200).json(success(updated));
  } catch (error) {
    next(error);
  }
});

// ─── Delete Product (DELETE /products/:id) ───────────────────────────────────
router.delete('/:product_id', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);
    await db.deleteProduct(req.params.product_id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ─── Publish Product (POST /products/:id/publish) ────────────────────────────
router.post('/:product_id/publish', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await verifyOwnership(req.params.product_id, user.user_id, user.role);

    if (product.status === 'published') {
      return res.status(200).json(success({ message: 'Product is already published', product }));
    }
    if (product.status === 'archived') {
      throw new BadRequestError('Cannot publish an archived product. Restore it first.', 'INVALID_STATUS_TRANSITION');
    }

    const updated = await db.updateProduct(req.params.product_id, { status: 'published' });
    res.status(200).json(success(updated));
  } catch (error) {
    next(error);
  }
});

// ─── Upload Image (POST /products/:id/image) ─────────────────────────────────
router.post('/:product_id/image', requireAuth, requireArtisan, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    if (!req.file) {
      throw new BadRequestError('No file uploaded', 'MISSING_FILE');
    }

    // Validate and read file
    const { content, contentType, extension } = await imageService.validateAndReadImage(req.file);

    // Upload to Supabase Storage
    const imageUrl = await storageService.uploadProductImage(
      req.params.product_id,
      content,
      req.file.originalname || `product.${extension}`,
      contentType
    );

    // Update in database
    const updated = await db.updateProduct(req.params.product_id, { image_url: imageUrl, original_image_url: imageUrl });

    res.status(200).json(success({
      product_id: req.params.product_id,
      image_url: imageUrl,
      product: updated,
      message: 'Image uploaded successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Enhance Image (POST /products/:id/enhance-image) ────────────────────────
router.post('/:product_id/enhance-image', requireAuth, requireArtisan, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);
    const product = await db.getProductById(req.params.product_id);

    let originalUrl = '';
    let imageBytes: Buffer = Buffer.alloc(0);
    let contentType = '';

    if (req.file) {
      const { content, contentType: cType, extension } = await imageService.validateAndReadImage(req.file);
      originalUrl = await storageService.uploadProductImage(
        req.params.product_id,
        content,
        req.file.originalname || `product.${extension}`,
        cType
      );
      imageBytes = content;
      contentType = cType;
    } else {
      originalUrl = product.original_image_url || product.image_url;
      if (!originalUrl) {
        throw new BadRequestError('No image to enhance. Upload an image first.', 'NO_IMAGE_TO_ENHANCE');
      }

      // First attempt downloading directly from Supabase Storage SDK if originalUrl points to storage bucket
      let fetchedDirectly = false;
      const bucket = config.STORAGE_BUCKET_PRODUCTS;
      const bucketIdx = originalUrl.indexOf(bucket);
      if (bucketIdx !== -1) {
        const storagePath = originalUrl.substring(bucketIdx + bucket.length + 1);
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase.storage.from(bucket).download(storagePath);
          if (!error && data) {
            imageBytes = Buffer.from(await data.arrayBuffer());
            contentType = data.type || 'image/jpeg';
            fetchedDirectly = true;
          }
        } catch (sErr) {
          console.warn('Supabase storage SDK download attempt failed, falling back to HTTP fetch:', sErr);
        }
      }

      if (!fetchedDirectly) {
        const fetched = await imageService.fetchImageBytes(originalUrl);
        imageBytes = fetched.content;
        contentType = fetched.contentType;
      }
    }

    // Run sharp enhancement
    const { content: enhancedBytes, contentType: enhancedType, extension: ext } = 
      await imageService.enhanceImageBytes(imageBytes, contentType);

    // Upload enhanced image
    const enhancedUrl = await storageService.uploadEnhancedImage(
      req.params.product_id,
      enhancedBytes,
      enhancedType,
      ext
    );

    // Save database records
    const updated = await db.updateProduct(req.params.product_id, {
      original_image_url: originalUrl,
      enhanced_image_url: enhancedUrl,
      image_url: enhancedUrl
    });

    res.status(200).json(success({
      product_id: req.params.product_id,
      original_image_url: originalUrl,
      enhanced_image_url: enhancedUrl,
      status: 'enhanced',
      product: updated,
      message: 'Image enhanced successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Upload Voice (POST /products/:id/voice) ──────────────────────────────────
router.post('/:product_id/voice', requireAuth, requireArtisan, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    if (!req.file) {
      throw new BadRequestError('No file uploaded', 'MISSING_FILE');
    }

    const language = req.body.language; // optional language hint

    // Validate and read audio file
    const { content, contentType, extension } = await imageService.validateAndReadAudio(req.file);

    // Save raw audio to private storage
    const storagePath = await storageService.uploadVoiceRecording(
      req.params.product_id,
      content,
      req.file.originalname || `voice.${extension}`,
      contentType
    );

    // Transcribe audio using speech service
    const { transcript, language: detectedLanguage } = await speechService.transcribeAudio(
      content,
      contentType,
      language
    );

    const updateData: Record<string, any> = { voice_transcript: transcript };
    if (detectedLanguage) {
      updateData.voice_language = detectedLanguage;
    }

    const updated = await db.updateProduct(req.params.product_id, updateData);

    res.status(200).json(success({
      product_id: req.params.product_id,
      transcript,
      voice_language: detectedLanguage,
      product: updated,
      message: 'Voice transcribed and saved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Generate Catalog (POST /products/:id/generate-catalog) ─────────────────
router.post('/:product_id/generate-catalog', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await db.getProductById(req.params.product_id);
    const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
    const artisan = await db.getOrCreateArtisan(user.user_id, nameHint);

    if (user.role !== 'admin' && artisan.id !== product.artisan_id) {
      throw new OwnershipError('product');
    }

    const imageUrl = product.image_url;
    const transcript = product.voice_transcript;

    if (!imageUrl && !transcript) {
      throw new BadRequestError(
        'Cannot generate catalog: product has no image and no voice transcript. Upload at least one before generating.',
        'INSUFFICIENT_PRODUCT_DATA'
      );
    }

    const artisanContext = {
      craft_type: artisan.craft_type,
      region: artisan.state,
      district: artisan.district,
    };

    // Run catalog generation via LLM
    const catalog = await llmService.generateCatalog(imageUrl, transcript, artisanContext);

    // Save results to product
    const updatePayload = {
      name: catalog.product_name,
      category: catalog.category,
      material: catalog.material,
      craft_type: catalog.craft_type,
      region: catalog.region,
      description_en: catalog.description_en,
      description_hi: catalog.description_hi,
      keywords: catalog.keywords,
      ai_generated: true,
      ai_confidence: catalog.confidence,
      status: 'review', // Moves to review status
    };

    const updatedProduct = await db.updateProduct(req.params.product_id, updatePayload);

    res.status(200).json(success({
      product_id: req.params.product_id,
      catalog,
      status: 'review',
      product: updatedProduct,
      message: 'Catalog generated successfully. Please review the details and publish.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Update Catalog (PUT /products/:id/catalog) ──────────────────────────────
router.put('/:product_id/catalog', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) {
      const product = await db.getProductById(req.params.product_id);
      return res.status(200).json(success(product));
    }

    // Map frontend fields to database fields if necessary
    const fieldMapping: Record<string, string> = {
      product_name: 'name',
      description_en: 'description_en',
      description_hi: 'description_hi',
      category: 'category',
      material: 'material',
      craft_type: 'craft_type',
      region: 'region',
      keywords: 'keywords',
    };

    const dbUpdate: Record<string, any> = {};
    for (const [k, v] of Object.entries(updateData)) {
      const dbKey = fieldMapping[k] || k;
      dbUpdate[dbKey] = v;
    }

    const updated = await db.updateProduct(req.params.product_id, dbUpdate);
    res.status(200).json(success(updated));
  } catch (error) {
    next(error);
  }
});

// ─── Get Product Price Recommendation (GET /products/:id/price) ──────────────
router.get('/:product_id/price', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await db.getProductById(req.params.product_id);

    if (user.role === 'artisan') {
      const artisan = await db.getArtisanByUserId(user.user_id);
      if (!artisan || artisan.id !== product.artisan_id) {
        throw new ForbiddenError('You can only price your own products');
      }
    }

    const material_cost = parseFloat(req.query.material_cost as string || '0');
    const labor_cost = parseFloat(req.query.labor_cost as string || '0');
    const production_cost = parseFloat(req.query.production_cost as string || '0');
    const market_price_low = req.query.market_price_low ? parseFloat(req.query.market_price_low as string) : product.minimum_price;
    const market_price_high = req.query.market_price_high ? parseFloat(req.query.market_price_high as string) : product.maximum_price;
    const demand_score = req.query.demand_score ? parseFloat(req.query.demand_score as string) : null;

    const result = pricingService.calculatePrice({
      material_cost,
      labor_cost,
      production_cost,
      market_price_low,
      market_price_high,
      demand_score,
      region: product.region,
      category: product.category,
    });

    res.status(200).json(success({
      product_id: req.params.product_id,
      product_name: product.name,
      pricing: result,
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Publish Product (POST /products/:id/publish) ─────────────────────────────
router.post('/:product_id/publish', requireAuth, requireArtisan, requireVerifiedProfile, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const product = await db.getProductById(req.params.product_id);

    // Validate required fields
    if (!product.image_url && !product.original_image_url && !product.enhanced_image_url) {
      throw new BadRequestError('Cannot publish product: photo is missing.', 'MISSING_PHOTO');
    }
    if (!product.name || product.name === 'Untitled Craft Draft') {
      throw new BadRequestError('Cannot publish product: catalog name is missing or incomplete.', 'MISSING_CATALOG_NAME');
    }
    if (!product.price || parseFloat(product.price.toString()) <= 0) {
      throw new BadRequestError('Cannot publish product: price is missing or invalid.', 'MISSING_PRICE');
    }

    const updated = await db.updateProduct(req.params.product_id, {
      status: 'published'
    });

    res.status(200).json(success({
      product_id: req.params.product_id,
      status: 'published',
      product: updated,
      message: 'Your product is now live on Artisera.'
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
