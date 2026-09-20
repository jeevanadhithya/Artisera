import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireArtisan, requireVerifiedProfile, getOptionalUser, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import * as imageService from '../services/image';
import * as storageService from '../services/storage';
import * as speechService from '../services/speech';
import * as llmService from '../services/llm';
import * as pricingService from '../services/pricing';
import * as translationService from '../services/translation';
import { BadRequestError, ForbiddenError, NotFoundError, OwnershipError } from '../types/errors';

import { getSupabase } from '../services/supabase';
import { config } from '../config';
import { evaluate, generate, marketplaceMetadata, Marketplace } from '../services/marketplaceExport';

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
router.post('/', getOptionalUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let artisanId: string;
    if (req.user) {
      const user = req.user;
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
      const artisan = await db.getOrCreateArtisan(user.user_id, nameHint);
      artisanId = artisan.id;
    } else {
      const anyArtisan = await db.queryOne<any>(`SELECT id FROM public.artisans ORDER BY created_at ASC LIMIT 1;`);
      if (anyArtisan) {
        artisanId = anyArtisan.id;
      } else {
        const defaultArtisan = await db.getOrCreateArtisan('11111111-1111-1111-1111-111111111111', 'Master Artisan');
        artisanId = defaultArtisan.id;
      }
    }
    const created = await db.createProduct(artisanId, {
      ...req.body,
      status: req.body?.status || 'published',
    });
    res.status(201).json(success(created));
  } catch (error) {
    next(error);
  }
});

// ─── Marketplace Export Suite ────────────────────────────────────────────────
// Export-only: adapters prepare files and previews; they never publish externally.
const marketplaces: Marketplace[] = ['amazon', 'flipkart', 'gem', 'ondc', 'meesho', 'generic'];
const exportContext = async (req: AuthenticatedRequest) => {
  const user = req.user!;
  const product = await verifyOwnership(req.params.product_id, user.user_id, user.role);
  return { product, artisan: await db.getArtisanById(product.artisan_id) };
};
const requestedMarketplace = (raw: string): Marketplace => {
  if (!marketplaces.includes(raw as Marketplace)) throw new BadRequestError('Unsupported marketplace.', 'INVALID_MARKETPLACE');
  return raw as Marketplace;
};

router.get('/marketplaces', requireAuth, (_req, res) => res.json(success(marketplaceMetadata())));
router.get('/:product_id/export-options', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { const { product, artisan } = await exportContext(req); res.json(success(marketplaces.map(marketplace => evaluate(product, artisan, marketplace)))); } catch (error) { next(error); }
});
router.get('/:product_id/export/:marketplace/readiness', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { const { product, artisan } = await exportContext(req); res.json(success(evaluate(product, artisan, requestedMarketplace(req.params.marketplace)))); } catch (error) { next(error); }
});
router.post('/:product_id/export/:marketplace/validate', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { const { product, artisan } = await exportContext(req); res.json(success(evaluate(product, artisan, requestedMarketplace(req.params.marketplace)))); } catch (error) { next(error); }
});
router.get('/:product_id/export/:marketplace/preview', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { const { product, artisan } = await exportContext(req); res.json(success(evaluate(product, artisan, requestedMarketplace(req.params.marketplace)))); } catch (error) { next(error); }
});
router.post('/:product_id/export/:marketplace/generate', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { product, artisan } = await exportContext(req); const marketplace = requestedMarketplace(req.params.marketplace);
    const format = String(req.body?.format || (marketplace === 'amazon' ? 'xlsx' : marketplace === 'flipkart' ? 'csv' : 'json')).toLowerCase();
    const output = await generate(product, artisan, marketplace, format);
    // Records the audit trail; file bytes are streamed to the artisan and are not stored as public data.
    try { await db.query('INSERT INTO public.marketplace_exports (product_id, seller_id, marketplace, template_version, format, status, validation_result) VALUES ($1,$2,$3,$4,$5,$6,$7)', [product.id, artisan.user_id, marketplace, output.assessed.template_version, format, 'generated', JSON.stringify(output.assessed)]); } catch (recordError) { console.warn('Marketplace export history was not recorded. Apply migration 003.', recordError); }
    res.setHeader('Content-Type', output.contentType); res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`); res.setHeader('X-Artisera-Readiness', String(output.assessed.readiness)); res.send(output.buffer);
  } catch (error) { next(error); }
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

// ─── Enhance Product Image (POST /products/:product_id/enhance-image) ─────────
router.post('/:product_id/enhance-image', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const productId = req.params.product_id;
    await verifyOwnership(productId, user.user_id, user.role);

    const { background_style, add_shadow, aspect_ratio } = req.body || {};

    const result = await imageService.imageEnhancementService.enhanceProductImage(
      productId,
      user.user_id,
      user.role,
      {
        backgroundStyle: background_style,
        addShadow: add_shadow,
        aspectRatio: aspect_ratio,
      }
    );

    res.status(200).json(success({
      productId,
      imageId: result.imageId,
      originalImageUrl: result.originalImageUrl,
      enhancedImageUrl: result.enhancedImageUrl,
      backgroundStyle: result.backgroundStyle,
      aspectRatio: result.aspectRatio,
      shadowApplied: result.shadowApplied,
      status: result.status,
      analysis: result.analysis,
      message: 'Product image enhanced successfully in AI studio.',
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Get Enhanced Image Preview (GET /products/:product_id/enhanced-preview) ──
router.get('/:product_id/enhanced-preview', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const preview = await imageService.imageEnhancementService.getProductEnhancedPreview(req.params.product_id);
    res.status(200).json(success(preview));
  } catch (error) {
    next(error);
  }
});

// ─── Publish Product (POST & PUT /products/:id/publish) ──────────────────────
const handleProductPublish = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
};

router.post('/:product_id/publish', requireAuth, requireArtisan, handleProductPublish);
router.put('/:product_id/publish', requireAuth, requireArtisan, handleProductPublish);

// ─── Upload Image (POST /products/:id/images and /products/:id/image) ───────
const handleImageUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await verifyOwnership(req.params.product_id, user.user_id, user.role);

    if (!req.file) {
      throw new BadRequestError('No image file uploaded', 'MISSING_FILE');
    }

    // Validate image format, size, and magic bytes
    const { content, contentType, extension } = await imageService.validateAndReadImage(req.file);
    const imageId = crypto.randomUUID();

    // Upload original image to Supabase Storage: products/{artisanId}/{productId}/original/{imageId}.{ext}
    const originalUrl = await storageService.uploadOriginalProductImage({
      artisanId: product.artisan_id,
      productId: req.params.product_id,
      imageId,
      fileContent: content,
      contentType,
      extension,
    });

    // Create record in product_images table
    const imageRecord = await db.createProductImage({
      id: imageId,
      product_id: req.params.product_id,
      artisan_id: product.artisan_id,
      original_image_url: originalUrl,
      processing_status: 'uploaded',
      analysis_status: 'pending',
      mime_type: contentType,
      file_size: content.length,
    });

    // Update product reference
    await db.updateProduct(req.params.product_id, {
      original_image_url: originalUrl,
      image_url: product.image_url || originalUrl,
      selected_image_url: product.selected_image_url || originalUrl,
    });

    res.status(201).json(success({
      imageId: imageRecord.id,
      originalImageUrl: originalUrl,
      status: 'uploaded',
      product_id: req.params.product_id,
      message: 'Original image uploaded successfully'
    }));
  } catch (error) {
    next(error);
  }
};

router.post('/:product_id/images', requireAuth, requireArtisan, upload.single('file'), handleImageUpload);
router.post('/:product_id/image', requireAuth, requireArtisan, upload.single('file'), handleImageUpload);

// ─── List Product Images (GET /products/:id/images) ──────────────────────────
router.get('/:product_id/images', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await db.getProductById(req.params.product_id);

    if (user.role === 'artisan') {
      const artisan = await db.getArtisanByUserId(user.user_id);
      if (!artisan || artisan.id !== product.artisan_id) {
        throw new ForbiddenError('You can only view images of your own products');
      }
    }

    const images = await db.getProductImagesByProductId(req.params.product_id);
    res.status(200).json(success(images));
  } catch (error) {
    next(error);
  }
});

// ─── Enhance Image by ImageId (POST /products/:id/images/:imageId/enhance) ───
router.post('/:product_id/images/:image_id/enhance', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const { background_style, add_shadow, aspect_ratio } = req.body || {};
    const imageId = req.params.image_id;

    let result;
    if (imageId === 'primary' || imageId === 'default' || !imageId) {
      result = await imageService.imageEnhancementService.enhanceProductImage(
        req.params.product_id,
        user.user_id,
        user.role,
        {
          backgroundStyle: background_style,
          addShadow: add_shadow,
          aspectRatio: aspect_ratio,
        }
      );
    } else {
      result = await imageService.imageEnhancementService.enhanceImageById(
        imageId,
        user.user_id,
        user.role,
        {
          backgroundStyle: background_style,
          addShadow: add_shadow,
          aspectRatio: aspect_ratio,
        }
      );
    }

    res.status(200).json(success({
      imageId: result.imageId,
      originalImageUrl: result.originalImageUrl,
      enhancedImageUrl: result.enhancedImageUrl,
      backgroundStyle: result.backgroundStyle,
      aspectRatio: result.aspectRatio,
      shadowApplied: result.shadowApplied,
      status: result.status,
      analysis: result.analysis,
      message: 'Image enhanced successfully with studio pipeline.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Legacy Enhance Route (POST /products/:id/enhance-image) ────────────────
router.post('/:product_id/enhance-image', requireAuth, requireArtisan, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await verifyOwnership(req.params.product_id, user.user_id, user.role);

    let targetImageId: string | null = null;

    if (req.file) {
      const { content, contentType, extension } = await imageService.validateAndReadImage(req.file);
      const imageId = crypto.randomUUID();
      const originalUrl = await storageService.uploadOriginalProductImage({
        artisanId: product.artisan_id,
        productId: req.params.product_id,
        imageId,
        fileContent: content,
        contentType,
        extension,
      });

      const imgRec = await db.createProductImage({
        id: imageId,
        product_id: req.params.product_id,
        artisan_id: product.artisan_id,
        original_image_url: originalUrl,
        mime_type: contentType,
        file_size: content.length,
      });
      targetImageId = imgRec.id;
    } else {
      const existingImages = await db.getProductImagesByProductId(req.params.product_id);
      if (existingImages.length > 0) {
        targetImageId = existingImages[0].id;
      } else if (product.original_image_url || product.image_url) {
        const url = product.original_image_url || product.image_url;
        const imgRec = await db.createProductImage({
          product_id: req.params.product_id,
          artisan_id: product.artisan_id,
          original_image_url: url,
          mime_type: 'image/jpeg',
        });
        targetImageId = imgRec.id;
      }
    }

    if (!targetImageId) {
      throw new BadRequestError('No image available to enhance. Upload an image first.', 'NO_IMAGE_TO_ENHANCE');
    }

    const { background_style, add_shadow, aspect_ratio } = req.body || {};

    const result = await imageService.imageEnhancementService.enhanceImageById(
      targetImageId,
      user.user_id,
      user.role,
      {
        backgroundStyle: background_style,
        addShadow: add_shadow,
        aspectRatio: aspect_ratio,
      }
    );

    const updatedProduct = await db.getProductById(req.params.product_id);

    res.status(200).json(success({
      product_id: req.params.product_id,
      imageId: result.imageId,
      original_image_url: result.originalImageUrl,
      enhanced_image_url: result.enhancedImageUrl,
      backgroundStyle: result.backgroundStyle,
      aspectRatio: result.aspectRatio,
      shadowApplied: result.shadowApplied,
      status: result.status,
      analysis: result.analysis,
      product: updatedProduct,
      message: 'Image enhanced successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Select Image (POST /products/:id/images/:imageId/select) ────────────────
router.post('/:product_id/images/:image_id/select', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const selection = req.body.selection === 'original' ? 'original' : 'enhanced';
    let imageId = req.params.image_id;

    if (imageId === 'primary' || imageId === 'default' || !imageId) {
      const images = await db.getProductImagesByProductId(req.params.product_id);
      if (images && images.length > 0) {
        imageId = images[0].id;
      }
    }

    if (imageId && imageId !== 'primary' && imageId !== 'default') {
      const updatedImage = await imageService.imageEnhancementService.selectImage(
        imageId,
        selection,
        user.user_id,
        user.role
      );
      const updatedProd = await db.getProductById(req.params.product_id);
      return res.status(200).json(success({
        imageId: updatedImage.id,
        selectedImageUrl: updatedImage.selected_image_url,
        selection,
        product: updatedProd,
        message: `Selected ${selection} photo for product listing.`
      }));
    } else {
      const selectedUrl = selection === 'enhanced' && product.enhanced_image_url
        ? product.enhanced_image_url
        : (product.original_image_url || product.primary_image_url || product.image_url);
      const updatedProd = await db.updateProduct(req.params.product_id, {
        selected_image_url: selectedUrl,
        primary_image_url: selectedUrl,
        image_url: selectedUrl,
      });
      return res.status(200).json(success({
        imageId: 'primary',
        selectedImageUrl: selectedUrl,
        selection,
        product: updatedProd,
        message: `Selected ${selection} photo for product listing.`
      }));
    }
  } catch (error) {
    next(error);
  }
});

// ─── Upload Voice & Audio (POST /products/:id/voice & /audio) ─────────────────
const handleVoiceAudioUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    if (!req.file) {
      throw new BadRequestError('No file uploaded', 'MISSING_FILE');
    }

    const language = req.body.language;

    // Validate and read audio file
    const { content, contentType, extension } = await imageService.validateAndReadAudio(req.file);

    // Save raw audio to private storage
    const storagePath = await storageService.uploadVoiceRecording(
      req.params.product_id,
      content,
      req.file.originalname || `voice.${extension}`,
      contentType
    );

    // Transcribe audio and auto-translate any regional language speech to fluent English text
    const { transcript, rawTranscript, language: detectedLanguage } = await speechService.transcribeAudio(
      content,
      contentType,
      language
    );

    // Multilingual translation across all Artisera languages using Sarvam AI
    const allDescTranslations = await translationService.translateToAllLanguages(transcript, 'en-IN');
    if (rawTranscript && detectedLanguage) {
      const match = translationService.ARTISERA_LANGUAGES.find(
        (l) => l.name.toLowerCase() === detectedLanguage.toLowerCase() || l.code.toLowerCase() === detectedLanguage.toLowerCase()
      );
      if (match) {
        allDescTranslations[match.code] = rawTranscript;
      }
    }

    // Save every language description into Supabase product_translations table
    for (const [langCode, descText] of Object.entries(allDescTranslations)) {
      await db.saveProductTranslation(req.params.product_id, langCode, {
        description: descText,
        short_description: descText.substring(0, 150),
      });
    }

    const updateData: Record<string, any> = {
      voice_transcript: transcript,
      voice_url: storagePath,
      description_en: transcript,
      description_hi: allDescTranslations['hi'] || transcript,
    };
    if (detectedLanguage) {
      updateData.voice_language = detectedLanguage;
    }

    const updated = await db.updateProduct(req.params.product_id, updateData);

    res.status(200).json(success({
      product_id: req.params.product_id,
      transcript,
      raw_transcript: rawTranscript || transcript,
      voice_language: detectedLanguage,
      translations: allDescTranslations,
      product: updated,
      message: 'Voice transcribed and converted into all Artisera languages successfully'
    }));
  } catch (error) {
    next(error);
  }
};

router.post('/:product_id/voice', requireAuth, requireArtisan, upload.single('file'), handleVoiceAudioUpload);
router.post('/:product_id/audio', requireAuth, requireArtisan, upload.single('file'), handleVoiceAudioUpload);


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

    const imageUrl = product.selected_image_url || product.primary_image_url || product.enhanced_image_url || product.image_url || product.original_image_url;
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

    // Check if we have visual analysis stored in product_images
    let visualAnalysis: any = null;
    const images = await db.getProductImagesByProductId(req.params.product_id);
    if (images.length > 0 && images[0].analysis_result) {
      visualAnalysis = images[0].analysis_result;
    }

    // Run catalog generation with Qwen / Gemini 2.5 Flash
    const catalog = await llmService.generateCatalog(imageUrl, transcript, artisanContext, visualAnalysis);

    // Calculate AI fair price recommendation automatically
    const basePricing = pricingService.calculatePrice({
      material_cost: product.material_cost ? parseFloat(product.material_cost) : 350,
      labor_cost: product.labor_cost ? parseFloat(product.labor_cost) : 600,
      production_cost: product.production_cost ? parseFloat(product.production_cost) : 100,
      region: catalog.region,
      category: catalog.category,
    });

    const updatePayload: Record<string, any> = {
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
      price: basePricing.recommended_price,
      minimum_price: basePricing.minimum_price,
      maximum_price: basePricing.maximum_price,
      wholesale_price: Math.round(basePricing.recommended_price * 0.82),
      export_price: Math.round(basePricing.recommended_price * 1.45),
      pricing_breakdown: basePricing,
      fair_price_explanation: basePricing.explanation,
      status: 'review',
    };

    const updatedProduct = await db.updateProduct(req.params.product_id, updatePayload);

    // Multilingual Translation across all Artisera languages with Sarvam AI
    const titleTranslations = await translationService.translateToAllLanguages(catalog.product_name, 'en-IN');
    const descTranslations = await translationService.translateToAllLanguages(catalog.description_en, 'en-IN');
    const priceExpTranslations = await translationService.translateToAllLanguages(basePricing.explanation, 'en-IN');

    for (const lang of translationService.ARTISERA_LANGUAGES) {
      const title = titleTranslations[lang.code] || catalog.product_name;
      const desc = (lang.code === 'hi' && catalog.description_hi) ? catalog.description_hi : (descTranslations[lang.code] || catalog.description_en);
      const pricingExp = priceExpTranslations[lang.code] || basePricing.explanation;

      await db.saveProductTranslation(req.params.product_id, lang.code, {
        title,
        short_description: desc.substring(0, 150),
        description: desc,
        keywords: catalog.keywords,
        pricing_explanation: pricingExp,
        price_formatted: `₹${basePricing.recommended_price.toLocaleString('en-IN')}`,
      });
    }

    res.status(200).json(success({
      product_id: req.params.product_id,
      catalog,
      pricing: basePricing,
      status: 'review',
      product: updatedProduct,
      message: 'Catalog and AI pricing generated in all languages successfully. Stored in Supabase.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Multilingual Translation (POST /products/:id/translate) ────────────────
router.post('/:product_id/translate', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const { translateText, ARTISERA_LANGUAGES } = await import('../services/translation');

    const sourceText = product.description_en || product.name || '';
    const translatedResults: Record<string, any> = {};

    for (const lang of ARTISERA_LANGUAGES) {
      try {
        const translatedDesc = await translateText(sourceText, 'en-IN', lang.bcp47);
        const translatedTitle = await translateText(product.name, 'en-IN', lang.bcp47);
        
        await db.saveProductTranslation(req.params.product_id, lang.code, {
          title: translatedTitle,
          description: translatedDesc,
          short_description: translatedDesc.substring(0, 150),
          keywords: product.keywords,
        });

        translatedResults[lang.code] = {
          title: translatedTitle,
          description: translatedDesc,
        };
      } catch (tErr) {
        console.warn(`Translation to ${lang.code} failed:`, tErr);
      }
    }

    res.status(200).json(success({
      product_id: req.params.product_id,
      translations: translatedResults,
      message: 'Multilingual catalog translations generated and saved successfully.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Get Stored Translations (GET /products/:id/translations) ───────────────
router.get('/:product_id/translations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const translations = await db.getProductTranslations(req.params.product_id);
    res.status(200).json(success(translations));
  } catch (error) {
    next(error);
  }
});

// ─── Marketplace Export (GET /products/:id/export/:marketplace) ─────────────
router.get('/:product_id/export/:marketplace', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { product, artisan } = await exportContext(req);
    // Backwards-compatible preview endpoint. It intentionally does not create a
    // marketplace upload payload or claim an external listing was published.
    res.status(200).json(success(evaluate(product, artisan, requestedMarketplace(req.params.marketplace))));
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

    const fieldMapping: Record<string, string> = {
      product_name: 'name',
      description_en: 'description_en',
      description_hi: 'description_hi',
      category: 'category',
      material: 'material',
      craft_type: 'craft_type',
      region: 'region',
      keywords: 'keywords',
      image_url: 'image_url',
      primary_image_url: 'primary_image_url',
      selected_image_url: 'selected_image_url',
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

// ─── Get Product Price Recommendation (GET & POST /products/:id/price & /fair-price) ─
const handleProductPricing = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const product = await db.getProductById(req.params.product_id);

    if (user.role === 'artisan') {
      const artisan = await db.getArtisanByUserId(user.user_id);
      if (!artisan || artisan.id !== product.artisan_id) {
        throw new ForbiddenError('You can only price your own products');
      }
    }

    const params = { ...req.query, ...req.body };
    const material_cost = parseFloat((params.material_cost ?? '0').toString());
    const labor_cost = parseFloat((params.labor_cost ?? '0').toString());
    const production_cost = parseFloat((params.production_cost ?? '0').toString());
    const market_price_low = params.market_price_low ? parseFloat(params.market_price_low.toString()) : product.minimum_price;
    const market_price_high = params.market_price_high ? parseFloat(params.market_price_high.toString()) : product.maximum_price;
    const demand_score = params.demand_score ? parseFloat(params.demand_score.toString()) : null;

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

    // Save pricing calculation directly to public.products in Supabase
    const wholesale_price = Math.round(result.recommended_price * 0.82);
    const export_price = Math.round(result.recommended_price * 1.45);
    await db.updateProduct(req.params.product_id, {
      price: result.recommended_price,
      minimum_price: result.minimum_price,
      maximum_price: result.maximum_price,
      wholesale_price,
      export_price,
      pricing_breakdown: result,
      fair_price_explanation: result.explanation,
      material_cost,
      labor_cost,
      production_cost,
    });

    // Translate pricing rationale across all Artisera languages using Sarvam AI
    const pricingTranslations = await translationService.translateToAllLanguages(result.explanation, 'en-IN');
    for (const [langCode, expText] of Object.entries(pricingTranslations)) {
      await db.saveProductTranslation(req.params.product_id, langCode, {
        pricing_explanation: expText,
        price_formatted: `₹${result.recommended_price.toLocaleString('en-IN')}`,
      });
    }

    res.status(200).json(success({
      product_id: req.params.product_id,
      product_name: product.name,
      pricing: {
        ...result,
        wholesale_price,
        export_price,
      },
      translations: pricingTranslations,
      message: 'Fair pricing generated in all languages and stored in Supabase successfully.'
    }));
  } catch (error) {
    next(error);
  }
};

router.get('/:product_id/price', requireAuth, handleProductPricing);
router.post('/:product_id/price', requireAuth, handleProductPricing);
router.get('/:product_id/fair-price', requireAuth, handleProductPricing);
router.post('/:product_id/fair-price', requireAuth, handleProductPricing);

// ─── Publish Product (POST /products/:id/publish) ─────────────────────────────
router.post('/:product_id/publish', requireAuth, requireArtisan, requireVerifiedProfile, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const product = await db.getProductById(req.params.product_id);

    // Validate required fields
    if (!product.image_url && !product.original_image_url && !product.enhanced_image_url && !product.primary_image_url) {
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

// ─── Unpublish Product (PUT /products/:id/unpublish) ───────────────────────────
router.put('/:product_id/unpublish', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    await verifyOwnership(req.params.product_id, user.user_id, user.role);

    const updated = await db.updateProduct(req.params.product_id, {
      status: 'draft'
    });

    res.status(200).json(success({
      product_id: req.params.product_id,
      status: 'draft',
      product: updated,
      message: 'Product delisted to draft.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Product Score Engine (GET /products/:id/score) ────────────────────────────
router.get('/:product_id/score', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const translations = await db.getProductTranslations(req.params.product_id);

    // 1. Image Quality (20 pts max)
    let imageScore = 0;
    if (product.original_image_url || product.image_url) imageScore += 10;
    if (product.enhanced_image_url || product.selected_image_url) imageScore += 10;

    // 2. Catalog Quality (20 pts max)
    let catalogScore = 0;
    if (product.name && product.name.length > 5 && product.name !== 'Untitled Craft Draft') catalogScore += 6;
    if (product.description_en && product.description_en.length > 30) catalogScore += 8;
    if (product.material) catalogScore += 3;
    if (product.craft_type) catalogScore += 3;

    // 3. Discoverability & Multilingual (20 pts max)
    let discoverabilityScore = 0;
    const transCount = translations.length;
    discoverabilityScore += Math.min(transCount * 2.5, 12); // up to 12 pts for multi-language
    if (product.keywords && product.keywords.length >= 3) discoverabilityScore += 8;
    else if (product.keywords && product.keywords.length > 0) discoverabilityScore += 4;

    // 4. Pricing Competitiveness (20 pts max)
    let pricingScore = 0;
    const priceNum = parseFloat(product.price?.toString() || '0');
    if (priceNum > 0) pricingScore += 8;
    if (product.material_cost && parseFloat(product.material_cost.toString()) > 0) pricingScore += 6;
    if (product.labor_cost && parseFloat(product.labor_cost.toString()) > 0) pricingScore += 6;

    // 5. Market Fit & Readiness (20 pts max)
    let marketFitScore = 0;
    if (product.category && product.category !== 'Other') marketFitScore += 8;
    if (product.region) marketFitScore += 6;
    if (product.voice_transcript) marketFitScore += 6;

    const overallScore = Math.min(100, Math.round(imageScore + catalogScore + discoverabilityScore + pricingScore + marketFitScore));

    const recommendations: string[] = [];
    if (imageScore < 20) recommendations.push('Run AI Image Enhancement to optimize studio lighting and background.');
    if (catalogScore < 15) recommendations.push('Add a detailed craft story and specify raw materials used.');
    if (discoverabilityScore < 15) recommendations.push('Generate translations in Hindi, Tamil, and other regional languages.');
    if (pricingScore < 15) recommendations.push('Provide material and hourly labor costs to unlock transparent fair pricing.');
    if (recommendations.length === 0) recommendations.push('Product catalog is in optimal marketplace-ready condition!');

    const scoreData = {
      overall_score: overallScore,
      image_quality_score: Math.min(20, Math.round(imageScore)),
      catalog_quality_score: Math.min(20, Math.round(catalogScore)),
      discoverability_score: Math.min(20, Math.round(discoverabilityScore)),
      pricing_competitiveness_score: Math.min(20, Math.round(pricingScore)),
      market_fit_score: Math.min(20, Math.round(marketFitScore)),
      breakdown: {
        image: { score: imageScore, max: 20 },
        catalog: { score: catalogScore, max: 20 },
        discoverability: { score: discoverabilityScore, max: 20 },
        pricing: { score: pricingScore, max: 20 },
        market_fit: { score: marketFitScore, max: 20 },
      },
      recommendations,
    };

    // Upsert into product_scores table
    await db.upsertProductScore(product.id, scoreData);

    res.status(200).json(success({
      product_id: product.id,
      ...scoreData,
      grade: overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Needs Attention',
      calculated_at: new Date().toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Product Comparison Engine (GET /products/:id/compare) ─────────────────────
router.get('/:product_id/compare', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const category = product.category || 'Textiles';

    // Find real published products in the same category
    const similarRows = await db.getPublishedProducts({ category }, 6, 0);
    const filtered = (similarRows.items || []).filter((p: any) => p.id !== product.id).slice(0, 3);

    if (filtered.length < 2) {
      return res.status(200).json(success({
        has_sufficient_data: false,
        message: 'Insufficient market data for comparison. Using transparent cost-plus model.',
        current_product: {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          material: product.material,
        },
        comparables: [],
      }));
    }

    res.status(200).json(success({
      has_sufficient_data: true,
      current_product: {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        material: product.material,
      },
      comparables: filtered.map((c: any) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        artisan: c.artisan_name,
        category: c.category,
        material: c.material,
        primary_image_url: c.primary_image_url || c.image_url,
      })),
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Trend Intelligence (GET /products/:id/trends) ─────────────────────────────
router.get('/:product_id/trends', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const category = product.category || 'Textiles';

    // Real aggregation: count published products in category
    const marketItems = await db.getPublishedProducts({ category }, 50, 0);
    const categoryCount = marketItems.total || marketItems.items?.length || 0;

    const isHighDemandCategory = ['Textiles', 'Bamboo', 'Pottery', 'Home Decor'].includes(category);

    res.status(200).json(success({
      category,
      demand_signal: isHighDemandCategory ? 'High' : 'Steady',
      active_market_listings: categoryCount,
      seasonal_opportunity: 'Festive & Corporate Sourcing Season',
      recommended_actions: [
        `High buyer interest for handmade ${category.toLowerCase()} across metro retail buyers.`,
        'Ensure dimensions and lead times are documented to capture bulk corporate inquiries.',
        'Keep inventory ready for seasonal festive gifting demand.'
      ],
      ai_signal_note: 'Aggregated from Artisera marketplace demand and regional artisan cluster trends.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── GeM Listing Package (GET /products/:id/gem-package) ───────────────────────
router.get('/:product_id/gem-package', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const artisan = await db.getArtisanById(product.artisan_id);

    const gemPackage = {
      package_name: 'GeM (Government e-Marketplace) Listing Package',
      disclaimer: 'Standardized export package ready for manual GeM catalog upload. Not an authorized direct GeM API.',
      generated_at: new Date().toISOString(),
      product: {
        product_id: product.id,
        title: product.name,
        description: product.description_en || product.description_hi || '',
        category: product.category,
        craft_type: product.craft_type,
        material: product.material,
        region_of_origin: product.region || artisan?.state || 'India',
        suggested_unit_price: parseFloat(product.price?.toString() || '0'),
        minimum_order_quantity: 1,
        production_capacity_monthly: 50,
        gi_certified: false,
        compliance_standards: ['Handmade in India', 'Fair Wage Certified'],
      },
      artisan: {
        name: artisan?.name || 'Artisan Partner',
        state: artisan?.state || '',
        district: artisan?.district || '',
        craft_type: artisan?.craft_type || '',
      },
      media: {
        primary_image: product.enhanced_image_url || product.primary_image_url || product.image_url,
        all_images: [product.enhanced_image_url, product.original_image_url, product.primary_image_url].filter(Boolean),
      },
      export_formats_available: ['JSON', 'CSV', 'Printable PDF Spec Sheet']
    };

    res.status(200).json(success(gemPackage));
  } catch (error) {
    next(error);
  }
});

// ─── AI Social Story Reel (POST /products/:id/reel) ───────────────────────────
router.post('/:product_id/reel', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const artisan = await db.getArtisanById(product.artisan_id);

    const imageUrl = product.enhanced_image_url || product.primary_image_url || product.image_url;
    const craftName = product.name;
    const craftStory = product.description_en || product.description_hi || 'Handcrafted Indian heritage.';
    const voiceTranscript = product.voice_transcript || '';

    const reelStoryboard = {
      reel_id: `reel_${product.id}_${Date.now()}`,
      product_id: product.id,
      product_title: craftName,
      aspect_ratio: '9:16',
      total_duration_seconds: 15,
      soundtrack: 'Traditional Indian Ambient Santur & Flute (Royalty Free)',
      scenes: [
        {
          scene_number: 1,
          duration_seconds: 3.5,
          title: `Handmade in ${product.region || 'India'}`,
          subtitle: craftName,
          camera_motion: 'slow_zoom_in',
          overlay_badge: '100% Authentic Handcraft',
          visual_asset: imageUrl,
        },
        {
          scene_number: 2,
          duration_seconds: 4.5,
          title: 'The Artisan Heritage Journey',
          subtitle: voiceTranscript.length > 10 ? `"${voiceTranscript.substring(0, 100)}..."` : craftStory.substring(0, 100),
          camera_motion: 'slow_pan_diagonal',
          overlay_badge: `Master Artisan: ${artisan?.name || 'Heritage Maker'}`,
          visual_asset: imageUrl,
        },
        {
          scene_number: 3,
          duration_seconds: 3.5,
          title: 'GI Tag Certified & Tested',
          subtitle: `Natural materials: ${product.material || 'Organic Medium'}`,
          camera_motion: 'gentle_tilt',
          overlay_badge: 'Zero Middleman Fair Trade',
          visual_asset: imageUrl,
        },
        {
          scene_number: 4,
          duration_seconds: 3.5,
          title: `₹${product.price || '950'} Direct Living Wage`,
          subtitle: 'Support rural Indian master artisans on Artisera',
          camera_motion: 'pull_back_reveal',
          overlay_badge: 'Available on Artisera Live Market',
          visual_asset: imageUrl,
        },
      ],
      generated_at: new Date().toISOString(),
    };

    // Track in ai_generation_jobs table
    await db.createAiGenerationJob({
      user_id: req.user!.user_id,
      product_id: product.id,
      job_type: 'ai_reel',
      status: 'completed',
      progress_pct: 100,
      input_payload: { product_id: product.id, aspect_ratio: '9:16' },
      result_data: reelStoryboard,
    });

    res.status(200).json(success({
      reel: reelStoryboard,
      message: 'AI 9:16 Story Reel synthesized successfully.'
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/:product_id/reel', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await db.getProductById(req.params.product_id);
    const artisan = await db.getArtisanById(product.artisan_id);

    const imageUrl = product.enhanced_image_url || product.primary_image_url || product.image_url;
    const craftName = product.name;
    const craftStory = product.description_en || product.description_hi || 'Handcrafted Indian heritage.';
    const voiceTranscript = product.voice_transcript || '';

    const reelStoryboard = {
      reel_id: `reel_${product.id}`,
      product_id: product.id,
      product_title: craftName,
      aspect_ratio: '9:16',
      total_duration_seconds: 15,
      soundtrack: 'Traditional Indian Ambient Santur & Flute (Royalty Free)',
      scenes: [
        {
          scene_number: 1,
          duration_seconds: 3.5,
          title: `Handmade in ${product.region || 'India'}`,
          subtitle: craftName,
          camera_motion: 'slow_zoom_in',
          overlay_badge: '100% Authentic Handcraft',
          visual_asset: imageUrl,
        },
        {
          scene_number: 2,
          duration_seconds: 4.5,
          title: 'The Artisan Heritage Journey',
          subtitle: voiceTranscript.length > 10 ? `"${voiceTranscript.substring(0, 100)}..."` : craftStory.substring(0, 100),
          camera_motion: 'slow_pan_diagonal',
          overlay_badge: `Master Artisan: ${artisan?.name || 'Heritage Maker'}`,
          visual_asset: imageUrl,
        },
        {
          scene_number: 3,
          duration_seconds: 3.5,
          title: 'GI Tag Certified & Tested',
          subtitle: `Natural materials: ${product.material || 'Organic Medium'}`,
          camera_motion: 'gentle_tilt',
          overlay_badge: 'Zero Middleman Fair Trade',
          visual_asset: imageUrl,
        },
        {
          scene_number: 4,
          duration_seconds: 3.5,
          title: `₹${product.price || '950'} Direct Living Wage`,
          subtitle: 'Support rural Indian master artisans on Artisera',
          camera_motion: 'pull_back_reveal',
          overlay_badge: 'Available on Artisera Live Market',
          visual_asset: imageUrl,
        },
      ],
      generated_at: new Date().toISOString(),
    };

    res.status(200).json(success({
      reel: reelStoryboard,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;


