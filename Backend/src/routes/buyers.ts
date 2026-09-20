import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireBuyer, requireVerifiedProfile, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { ForbiddenError } from '../types/errors';

const router = Router();

const success = (data: any) => ({ success: true, data });

// POST /buyers/requests (create buyer request)
router.post('/requests', requireAuth, requireBuyer, requireVerifiedProfile, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const requestData = req.body;
    
    // Format date field properly if sent
    if (requestData.deadline) {
      requestData.deadline = new Date(requestData.deadline).toISOString().split('T')[0];
    }

    const buyer = await db.getOrCreateBuyer(user.user_id);
    const created = await db.createBuyerRequest(buyer.id, requestData);
    console.log(`Buyer request created: ${created.id} by buyer ${buyer.id}`);
    res.status(201).json(success(created));
  } catch (error) {
    next(error);
  }
});

// GET /buyers/requests (list buyer requests)
router.get('/requests', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = (page - 1) * limit;

    if (user.role === 'artisan') {
      throw new ForbiddenError('Artisans cannot browse buyer requests directly. Check your market opportunities.');
    }

    let items: any[] = [];
    let total = 0;

    if (user.role === 'admin') {
      const result = await db.getBuyerRequests(null, limit, offset);
      items = result.items;
      total = result.total;
    } else {
      const result = await db.getBuyerRequests(user.user_id, limit, offset);
      items = result.items;
      total = result.total;
    }

    res.status(200).json(success({
      items,
      total,
      page,
      limit,
      has_more: (offset + limit) < total,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /buyers/requests/:id (get single request)
router.get('/requests/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    if (user.role === 'artisan') {
      throw new ForbiddenError('Artisans cannot view buyer requests directly');
    }

    const request = await db.getBuyerRequestById(req.params.id);

    if (user.role === 'buyer' && request.buyer_id !== user.user_id) {
      throw new ForbiddenError('You can only view your own requests');
    }

    res.status(200).json(success(request));
  } catch (error) {
    next(error);
  }
});

// PUT /buyers/requests/:id (update request)
router.put('/requests/:id', requireAuth, requireBuyer, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const request = await db.getBuyerRequestById(req.params.id);

    if (user.role === 'buyer' && request.buyer_id !== user.user_id) {
      throw new ForbiddenError('You can only update your own requests');
    }

    const updateData = req.body;
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline).toISOString().split('T')[0];
    }

    const updated = await db.updateBuyerRequest(req.params.id, updateData);
    console.log(`Buyer request ${req.params.id} updated by ${user.user_id}`);
    res.status(200).json(success(updated));
  } catch (error) {
    next(error);
  }
});

export default router;
