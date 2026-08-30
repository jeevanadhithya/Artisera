import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { BadRequestError } from '../types/errors';

const router = Router();

const success = (data: any) => ({ success: true, data });

// GET /wishlist
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const items = await db.getWishlistForUser(user.user_id);
    res.status(200).json(success(items));
  } catch (error) {
    next(error);
  }
});

// POST /wishlist
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const productId = req.body.product_id;

    if (!productId) {
      throw new BadRequestError('product_id is required', 'MISSING_PRODUCT_ID');
    }

    const item = await db.addWishlistItem(user.user_id, productId);
    res.status(200).json(success({ product_id: item.product_id, added: true }));
  } catch (error) {
    next(error);
  }
});

// DELETE /wishlist/:product_id
router.delete('/:product_id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const productId = req.params.product_id;

    await db.removeWishlistItem(user.user_id, productId);
    res.status(200).json(success({ product_id: productId, removed: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
