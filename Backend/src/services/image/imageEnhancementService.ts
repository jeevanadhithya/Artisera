import { GeminiAnalysisProvider } from './geminiAnalysisProvider';
import { FreeImageProcessingProvider } from './freeImageProcessingProvider';
import { GeminiImageAnalysis, EnhancementResult } from './types';
import * as storageService from '../storage';
import * as db from '../db';
import { BadRequestError, NotFoundError, StorageError, ValidationError } from '../../types/errors';

export interface CustomEnhancementOptions {
  backgroundStyle?: 'warm_ivory' | 'pure_white' | 'earth_neutral' | 'transparent';
  addShadow?: boolean;
  aspectRatio?: '1:1' | '4:5' | '16:9' | 'original';
}

export class ImageEnhancementService {
  private analysisProvider: GeminiAnalysisProvider;
  private processingProvider: FreeImageProcessingProvider;

  constructor(
    analysisProvider = new GeminiAnalysisProvider(),
    processingProvider = new FreeImageProcessingProvider()
  ) {
    this.analysisProvider = analysisProvider;
    this.processingProvider = processingProvider;
  }

  /**
   * Enhances an existing product image record by ID with customizable studio options
   */
  public async enhanceImageById(
    imageId: string,
    userId: string,
    userRole: string,
    options?: CustomEnhancementOptions
  ): Promise<EnhancementResult> {
    const imageRecord = await db.getProductImageById(imageId);
    if (!imageRecord) {
      throw new NotFoundError('Product image record', imageId);
    }

    // Verify ownership
    if (userRole !== 'admin') {
      const artisan = await db.getArtisanByUserId(userId);
      if (!artisan || artisan.id !== imageRecord.artisan_id) {
        throw new BadRequestError('You do not have permission to enhance this image.', 'FORBIDDEN_OWNERSHIP');
      }
    }

    // Update status to analyzing
    await db.updateProductImage(imageId, {
      processing_status: 'analyzing',
      analysis_status: 'analyzing',
    });

    let originalBytes: Buffer;
    let originalContentType: string;

    try {
      const fetched = await storageService.fetchImageBufferFromUrlOrStorage(imageRecord.original_image_url);
      originalBytes = fetched.content;
      originalContentType = fetched.contentType || imageRecord.mime_type || 'image/jpeg';
    } catch (downloadErr: any) {
      await db.updateProductImage(imageId, {
        processing_status: 'failed',
        analysis_status: 'failed',
      });
      throw new StorageError(`Failed to retrieve original image: ${downloadErr?.message || downloadErr}`);
    }

    // 1. Run Gemini 2.5 Flash Visual Intelligence Analysis
    let analysis: GeminiImageAnalysis;
    try {
      analysis = await this.analysisProvider.analyzeImage(originalBytes, originalContentType);
      await db.updateProductImage(imageId, {
        analysis_result: analysis,
        analysis_status: 'completed',
        processing_status: 'enhancing',
      });
    } catch (analysisErr) {
      console.warn('Gemini 2.5 Flash analysis error, continuing with fallback settings:', analysisErr);
      analysis = {
        product: { type: 'Artisan Product', category: 'Handicraft', craftType: 'Craft', material: 'Natural', colors: [] },
        imageQuality: { background: 'Neutral', lighting: 'Even', exposure: 'Normal', sharpness: 'Standard', composition: 'Centered' },
        enhancement: {
          backgroundCleanup: true,
          backgroundRemoval: options?.backgroundStyle === 'transparent',
          brightnessCorrection: true,
          contrastAdjustment: true,
          whiteBalance: true,
          sharpening: true,
          noiseReduction: false,
          crop: true,
          centerProduct: true,
          resize: true,
        },
      };
    }

    // 2. Perform Studio Transformation (Python Worker or Built-in Sharp)
    let processedResult;
    try {
      processedResult = await this.processingProvider.processImage({
        imageBytes: originalBytes,
        contentType: originalContentType,
        operations: analysis.enhancement,
        backgroundStyle: options?.backgroundStyle || 'pure_white',
        addShadow: options?.addShadow !== undefined ? options.addShadow : true,
        aspectRatio: options?.aspectRatio || '1:1',
      });
    } catch (procErr: any) {
      console.error(`Enhancement pixel transformation failed for image ${imageId}:`, procErr);
      await db.updateProductImage(imageId, {
        processing_status: 'failed',
      });
      throw new Error(`Image enhancement failed: ${procErr?.message || procErr}`);
    }

    // 3. Strict Validation of Enhanced Output
    const validation = await this.processingProvider.validateImage(processedResult.content);
    if (!validation.valid || processedResult.content.length === 0) {
      await db.updateProductImage(imageId, {
        processing_status: 'failed',
      });
      throw new ValidationError(`Enhanced image failed quality validation: ${validation.error}`);
    }

    // 4. Upload Enhanced Image to Supabase Storage
    let enhancedUrl: string;
    try {
      enhancedUrl = await storageService.uploadEnhancedProductImage({
        artisanId: imageRecord.artisan_id,
        productId: imageRecord.product_id,
        imageId: imageRecord.id,
        fileContent: processedResult.content,
        contentType: processedResult.contentType,
        extension: processedResult.extension,
      });
    } catch (uploadErr: any) {
      await db.updateProductImage(imageId, {
        processing_status: 'failed',
      });
      throw new StorageError(`Failed to save enhanced image to storage: ${uploadErr?.message || uploadErr}`);
    }

    // Safeguard: Never allow enhanced_image_url to equal original_image_url
    if (enhancedUrl === imageRecord.original_image_url) {
      await db.updateProductImage(imageId, {
        processing_status: 'failed',
      });
      throw new Error('Enhanced image storage resulted in collision with original image URL.');
    }

    // 5. Update Database Records
    const updatedRecord = await db.updateProductImage(imageId, {
      enhanced_image_url: enhancedUrl,
      processing_status: 'completed',
      analysis_status: 'completed',
      file_size: processedResult.fileSize,
      mime_type: processedResult.contentType,
    });

    // Also update product's enhanced_image_url
    await db.updateProduct(imageRecord.product_id, {
      enhanced_image_url: enhancedUrl,
    });

    // Record in ai_generation_jobs table
    try {
      await db.createAiGenerationJob({
        product_id: imageRecord.product_id,
        artisan_id: imageRecord.artisan_id,
        job_type: 'image_enhancement',
        status: 'completed',
        input_payload: {
          image_id: imageId,
          options,
        },
        output_payload: {
          enhanced_image_url: enhancedUrl,
          width: processedResult.width,
          height: processedResult.height,
          background_style: processedResult.backgroundStyle,
          aspect_ratio: processedResult.aspectRatio,
          shadow_applied: processedResult.shadowApplied,
        },
      });
    } catch (jobErr) {
      console.warn('Could not record ai_generation_job:', jobErr);
    }

    return {
      imageId: imageRecord.id,
      originalImageUrl: imageRecord.original_image_url,
      enhancedImageUrl: enhancedUrl,
      selectedImageUrl: updatedRecord.selected_image_url,
      status: 'completed',
      analysis,
      mimeType: processedResult.contentType,
      fileSize: processedResult.fileSize,
      backgroundStyle: processedResult.backgroundStyle,
      aspectRatio: processedResult.aspectRatio,
      shadowApplied: processedResult.shadowApplied,
    };
  }

  /**
   * Enhances a product's primary image directly by product ID
   */
  public async enhanceProductImage(
    productId: string,
    userId: string,
    userRole: string,
    options?: CustomEnhancementOptions
  ): Promise<EnhancementResult> {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    let imageRecords = await db.getProductImagesByProductId(productId);
    let targetImage = imageRecords && imageRecords.length > 0 ? imageRecords[0] : null;

    // If no product_images record exists but product has a primary image, create one
    if (!targetImage && (product.primary_image_url || product.image_url)) {
      const sourceUrl = product.primary_image_url || product.image_url;
      targetImage = await db.createProductImage({
        product_id: productId,
        artisan_id: product.artisan_id,
        original_image_url: sourceUrl,
        processing_status: 'pending',
      });
    }

    if (!targetImage) {
      throw new BadRequestError('Product does not have an original image to enhance.');
    }

    const result = await this.enhanceImageById(targetImage.id, userId, userRole, options);

    // Update product record with enhanced image
    await db.updateProduct(productId, {
      enhanced_image_url: result.enhancedImageUrl,
    });

    return result;
  }

  /**
   * Retrieves comparison details for before/after preview
   */
  public async getProductEnhancedPreview(productId: string): Promise<any> {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    const images = await db.getProductImagesByProductId(productId);
    const primaryImage = images && images.length > 0 ? images[0] : null;

    return {
      productId: product.id,
      productName: product.name,
      originalImageUrl: primaryImage?.original_image_url || product.primary_image_url || product.image_url,
      enhancedImageUrl: primaryImage?.enhanced_image_url || product.enhanced_image_url,
      selectedImageUrl: primaryImage?.selected_image_url || product.selected_image_url || product.image_url,
      status: primaryImage?.processing_status || (product.enhanced_image_url ? 'completed' : 'pending'),
      analysis: primaryImage?.analysis_result,
    };
  }

  /**
   * Sets the user's selected image choice ('enhanced' | 'original')
   */
  public async selectImage(imageId: string, selection: 'enhanced' | 'original', userId: string, userRole: string): Promise<any> {
    const imageRecord = await db.getProductImageById(imageId);
    if (!imageRecord) {
      throw new NotFoundError('Product image record', imageId);
    }

    if (userRole !== 'admin') {
      const artisan = await db.getArtisanByUserId(userId);
      if (!artisan || artisan.id !== imageRecord.artisan_id) {
        throw new BadRequestError('You do not have permission to update this image.', 'FORBIDDEN_OWNERSHIP');
      }
    }

    const selectedUrl = selection === 'enhanced' && imageRecord.enhanced_image_url
      ? imageRecord.enhanced_image_url
      : imageRecord.original_image_url;

    // Update product_images table
    const updatedImage = await db.updateProductImage(imageId, {
      selected_image_url: selectedUrl,
    });

    // Update products table: primary_image_url, selected_image_url, and image_url
    await db.updateProduct(imageRecord.product_id, {
      primary_image_url: selectedUrl,
      selected_image_url: selectedUrl,
      image_url: selectedUrl,
    });

    return updatedImage;
  }
}

export const imageEnhancementService = new ImageEnhancementService();
