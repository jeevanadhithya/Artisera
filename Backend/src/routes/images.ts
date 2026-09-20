import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireArtisan, AuthenticatedRequest } from '../middleware/auth';
import { imageEnhancementService } from '../services/image';
import * as db from '../services/db';
import { BadRequestError, NotFoundError, OwnershipError } from '../types/errors';

const router = Router();
const success = (data: any) => ({ success: true, data });

/**
 * POST /api/images/:imageId/enhance
 * Runs Gemini 2.5 Flash visual intelligence + Free Sharp image processor
 */
router.post('/:imageId/enhance', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const imageId = req.params.imageId;

    const { background_style, add_shadow, aspect_ratio } = req.body || {};

    const result = await imageEnhancementService.enhanceImageById(imageId, user.user_id, user.role, {
      backgroundStyle: background_style,
      addShadow: add_shadow,
      aspectRatio: aspect_ratio,
    });

    res.status(200).json(success({
      imageId: result.imageId,
      originalImageUrl: result.originalImageUrl,
      enhancedImageUrl: result.enhancedImageUrl,
      backgroundStyle: result.backgroundStyle,
      aspectRatio: result.aspectRatio,
      shadowApplied: result.shadowApplied,
      status: result.status,
      analysis: result.analysis,
      message: 'Image enhanced successfully with AI visual intelligence studio.',
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/images/:imageId/select
 * Artisan selects which photo to use for product listing ('enhanced' | 'original')
 */
router.post('/:imageId/select', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const imageId = req.params.imageId;
    const selection = req.body.selection === 'original' ? 'original' : 'enhanced';

    const updatedImage = await imageEnhancementService.selectImage(imageId, selection, user.user_id, user.role);

    res.status(200).json(success({
      imageId: updatedImage.id,
      selectedImageUrl: updatedImage.selected_image_url,
      selection,
      message: `Selected ${selection} photo for product listing.`,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:imageId
 * Retrieves single image details and status
 */
router.get('/:imageId', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const imageId = req.params.imageId;
    const imageRecord = await db.getProductImageById(imageId);
    if (!imageRecord) {
      throw new NotFoundError('Product image', imageId);
    }
    res.status(200).json(success(imageRecord));
  } catch (error) {
    next(error);
  }
});

export default router;
