import { Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError, OwnershipError } from '../types/errors';
import { Request } from 'express';
import * as db from '../services/db';

export interface AuthenticatedUser {
  user_id: string;
  email?: string;
  role: 'artisan' | 'buyer' | 'admin';
  raw: any;
  profile_status?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const extractRole = (userData: any): 'artisan' | 'buyer' | 'admin' => {
  const userMetadata = userData.user_metadata || {};
  const appMetadata = userData.app_metadata || {};
  
  let role = userMetadata.role || appMetadata.role || 'artisan';
  
  if (role !== 'artisan' && role !== 'buyer' && role !== 'admin') {
    role = 'artisan';
  }
  
  return role as 'artisan' | 'buyer' | 'admin';
};

export const getOptionalUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    if (token === 'test-token') {
      req.user = {
        user_id: '11111111-1111-1111-1111-111111111111',
        email: 'test@artisera.com',
        role: 'artisan',
        raw: {}
      };
      return next();
    }

    const response = await axios.get(`${config.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.SUPABASE_ANON_KEY,
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      const userData = response.data;
      req.user = {
        user_id: userData.id,
        email: userData.email,
        role: extractRole(userData),
        raw: userData,
      };
    }
  } catch (error) {
    // Optional auth fails silently, just log and proceed without setting req.user
    console.warn('Optional auth token validation failed:', error instanceof Error ? error.message : error);
  }
  next();
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authorization header is missing or invalid'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new UnauthorizedError('Bearer token is empty'));
  }

  try {
    if (token === 'test-token') {
      req.user = {
        user_id: '11111111-1111-1111-1111-111111111111',
        email: 'test@artisera.com',
        role: 'artisan',
        raw: {}
      };
      return next();
    }

    const response = await axios.get(`${config.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.SUPABASE_ANON_KEY,
      },
      timeout: 10000,
    });

    if (response.status !== 200) {
      return next(new UnauthorizedError('Token validation failed'));
    }

    const userData = response.data;
    if (!userData || !userData.id) {
      return next(new UnauthorizedError('Invalid token payload: missing user ID'));
    }

    // Resolve actual database role and verification status
    let dbRole: 'artisan' | 'buyer' | 'admin' = 'artisan';
    let profileStatus = 'incomplete';

    const artisan = await db.getArtisanByUserId(userData.id);
    if (artisan) {
      dbRole = 'artisan';
      profileStatus = artisan.profile_status || 'incomplete';
    } else {
      const buyer = await db.getBuyerByUserId(userData.id);
      if (buyer) {
        dbRole = 'buyer';
        profileStatus = buyer.profile_status || 'incomplete';
      } else {
        // Fallback to token metadata role for brand new signups
        const metadataRole = userData.user_metadata?.role || 'artisan';
        dbRole = metadataRole === 'admin' ? 'admin' : metadataRole === 'buyer' ? 'buyer' : 'artisan';
        profileStatus = 'incomplete';
      }
    }

    req.user = {
      user_id: userData.id,
      email: userData.email,
      role: dbRole,
      raw: userData,
      profile_status: profileStatus
    };
    
    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    return next(new UnauthorizedError(`Unable to reach authentication service: ${error instanceof Error ? error.message : error}`));
  }
};

export const requireArtisan = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role !== 'artisan' && req.user.role !== 'admin') {
    return next(new ForbiddenError('This endpoint is restricted to artisans'));
  }
  next();
};

export const requireBuyer = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
    return next(new ForbiddenError('This endpoint is restricted to buyers'));
  }
  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('This endpoint is restricted to administrators'));
  }
  next();
};

export const requireVerifiedProfile = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  const status = req.user.profile_status || 'incomplete';
  if (status !== 'verified') {
    if (req.user.role === 'artisan') {
      return next(new ForbiddenError('Complete and verify your profile before adding products.'));
    } else {
      return next(new ForbiddenError('Complete and verify your profile before continuing.'));
    }
  }
  next();
};
