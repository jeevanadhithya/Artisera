import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { matchArtisansToRequest } from '../services/matching';
import { ForbiddenError } from '../types/errors';

const router = Router();

const success = (data: any) => ({ success: true, data });

// POST /matching/:request_id (trigger matching)
router.post('/:request_id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const requestId = req.params.request_id;

    if (user.role === 'artisan') {
      throw new ForbiddenError('Artisans cannot trigger matching');
    }

    const maxResults = parseInt(req.body.max_results as string || '10', 10);
    const includeBreakdown = req.body.include_score_breakdown !== false;

    // Fetch buyer request
    const buyerRequest = await db.getBuyerRequestById(requestId);

    // Ownership check for buyers
    if (user.role === 'buyer' && buyerRequest.buyer_id !== user.user_id) {
      throw new ForbiddenError('You can only run matching for your own requests');
    }

    // Fetch all artisans (limit 200 for B2B search pool)
    const artisans = await db.getAllArtisans(200, 0);

    // Build artisan_id -> products map
    const artisanProductsMap: Record<string, any[]> = {};
    for (const artisan of artisans) {
      const { items: products } = await db.getProductsByArtisan(artisan.id, 100, 0);
      artisanProductsMap[artisan.id] = products;
    }

    // Run matching algorithm
    const matchingResult = await matchArtisansToRequest(
      buyerRequest,
      artisans,
      artisanProductsMap,
      maxResults,
      includeBreakdown
    );

    // Persist matches asynchronously (don't block response on DB save)
    db.saveMatchingResult(requestId, matchingResult.matches).catch(err => {
      console.warn('Asynchronous save of matching result failed:', err);
    });

    console.log(`Matching completed for request ${requestId}: ${matchingResult.total_matches} matches`);
    res.status(200).json(success(matchingResult));
  } catch (error) {
    next(error);
  }
});

export default router;
