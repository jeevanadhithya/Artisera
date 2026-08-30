import { Pool } from 'pg';
import { config } from '../config';
import { DatabaseError, NotFoundError } from '../types/errors';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = config.DATABASE_URL;
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
};

const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  try {
    const client = getPool();
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (error: any) {
    console.error('Database query error:', error, 'SQL:', sql);
    throw new DatabaseError(error?.message || String(error));
  }
};

const queryOne = async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

// Helpers for dynamic INSERT and UPDATE
const buildInsertQuery = (table: string, data: Record<string, any>) => {
  const keys = Object.keys(data);
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) RETURNING *;`;
  return { sql, values };
};

const buildUpdateQuery = (table: string, id: string, data: Record<string, any>) => {
  const keys = Object.keys(data).filter(k => k !== 'id');
  if (keys.length === 0) {
    return { sql: `SELECT * FROM public."${table}" WHERE id = $1;`, values: [id] };
  }
  const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `UPDATE public."${table}" SET ${setClauses} WHERE id = $1 RETURNING *;`;
  return { sql, values: [id, ...values] };
};

// ─── Artisans ─────────────────────────────────────────────────────────────────

export const createArtisan = async (userId: string, data: Record<string, any>): Promise<any> => {
  const payload = {
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  const { sql, values } = buildInsertQuery('artisans', payload);
  const result = await queryOne(sql, values);
  return result;
};

export const getArtisanById = async (artisanId: string): Promise<any> => {
  const result = await queryOne(`SELECT * FROM public.artisans WHERE id = $1;`, [artisanId]);
  if (!result) {
    throw new NotFoundError('Artisan', artisanId);
  }
  return result;
};

export const getArtisanByUserId = async (userId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.artisans WHERE user_id = $1;`, [userId]);
};

export const getOrCreateArtisan = async (userId: string, nameHint?: string): Promise<any> => {
  const existing = await getArtisanByUserId(userId);
  if (existing) return existing;

  const emailName = (nameHint || '').trim() || 'New Artisan';
  const defaultData = {
    name: emailName,
    language: 'English',
    state: 'Unknown',
    district: 'Unknown',
    craft_type: 'Handicraft',
    profile_status: 'incomplete'
  };
  console.log(`Auto-created placeholder artisan profile for user ${userId}`);
  return createArtisan(userId, defaultData);
};

export const updateArtisan = async (artisanId: string, data: Record<string, any>): Promise<any> => {
  data.updated_at = new Date().toISOString();
  const { sql, values } = buildUpdateQuery('artisans', artisanId, data);
  const result = await queryOne(sql, values);
  if (!result) {
    throw new NotFoundError('Artisan', artisanId);
  }
  return result;
};

export const getAllArtisans = async (limit: number = 50, offset: number = 0): Promise<any[]> => {
  return query(`SELECT * FROM public.artisans ORDER BY created_at DESC LIMIT $1 OFFSET $2;`, [limit, offset]);
};

// ─── Buyers ───────────────────────────────────────────────────────────────────

export const createBuyer = async (userId: string, data: Record<string, any>): Promise<any> => {
  const payload = {
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  const { sql, values } = buildInsertQuery('buyers', payload);
  return queryOne(sql, values);
};

export const getBuyerByUserId = async (userId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.buyers WHERE user_id = $1;`, [userId]);
};

export const getBuyerById = async (buyerId: string): Promise<any> => {
  const result = await queryOne(`SELECT * FROM public.buyers WHERE id = $1;`, [buyerId]);
  if (!result) {
    throw new NotFoundError('Buyer', buyerId);
  }
  return result;
};

export const getOrCreateBuyer = async (userId: string, nameHint?: string): Promise<any> => {
  const existing = await getBuyerByUserId(userId);
  if (existing) return existing;

  const emailName = (nameHint || '').trim() || 'New Buyer';
  const defaultData = {
    name: emailName,
    organization_name: 'Independent Buyer',
    phone: '',
    business_category: 'Wholesale',
    location: 'Unknown',
    buyer_information: '',
    profile_status: 'incomplete'
  };
  console.log(`Auto-created placeholder buyer profile for user ${userId}`);
  return createBuyer(userId, defaultData);
};

export const updateBuyer = async (buyerId: string, data: Record<string, any>): Promise<any> => {
  data.updated_at = new Date().toISOString();
  const { sql, values } = buildUpdateQuery('buyers', buyerId, data);
  const result = await queryOne(sql, values);
  if (!result) {
    throw new NotFoundError('Buyer', buyerId);
  }
  return result;
};

export const getAllBuyers = async (limit: number = 50, offset: number = 0): Promise<any[]> => {
  return query(`SELECT * FROM public.buyers ORDER BY created_at DESC LIMIT $1 OFFSET $2;`, [limit, offset]);
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const createProduct = async (artisanId: string, data: Record<string, any>): Promise<any> => {
  const payload = {
    artisan_id: artisanId,
    status: 'draft',
    ai_generated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  const { sql, values } = buildInsertQuery('products', payload);
  return queryOne(sql, values);
};

export const getProductById = async (productId: string): Promise<any> => {
  const result = await queryOne(`SELECT * FROM public.products WHERE id = $1;`, [productId]);
  if (!result) {
    throw new NotFoundError('Product', productId);
  }
  return result;
};

export const getProductsByArtisan = async (
  artisanId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  const items = await query(
    `SELECT * FROM public.products WHERE artisan_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;`,
    [artisanId, limit, offset]
  );
  const countRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM public.products WHERE artisan_id = $1;`,
    [artisanId]
  );
  return {
    items,
    total: parseInt(countRes?.count || '0', 10)
  };
};

export const getPublishedProducts = async (
  filters: Record<string, any>,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  let whereClauses = [`p.status = 'published'`];
  let params: any[] = [];
  let paramIdx = 1;

  if (filters.category) {
    whereClauses.push(`p.category ILIKE $${paramIdx++}`);
    params.push(`%${filters.category}%`);
  }
  if (filters.craft_type) {
    whereClauses.push(`p.craft_type ILIKE $${paramIdx++}`);
    params.push(`%${filters.craft_type}%`);
  }
  if (filters.min_price !== undefined && filters.min_price !== null) {
    whereClauses.push(`p.price >= $${paramIdx++}`);
    params.push(filters.min_price);
  }
  if (filters.max_price !== undefined && filters.max_price !== null) {
    whereClauses.push(`p.price <= $${paramIdx++}`);
    params.push(filters.max_price);
  }
  if (filters.search) {
    whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.description_en ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }
  if (filters.state) {
    whereClauses.push(`a.state ILIKE $${paramIdx++}`);
    params.push(`%${filters.state}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT p.*, json_build_object('name', a.name, 'state', a.state) as artisans
    FROM public.products p
    LEFT JOIN public.artisans a ON p.artisan_id = a.id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  const countSql = `
    SELECT COUNT(*)::text as count
    FROM public.products p
    LEFT JOIN public.artisans a ON p.artisan_id = a.id
    ${whereSql};
  `;

  const items = await query(sql, [...params, limit, offset]);
  const countRes = await queryOne<{ count: string }>(countSql, params);

  return {
    items,
    total: parseInt(countRes?.count || '0', 10)
  };
};

export const updateProduct = async (productId: string, data: Record<string, any>): Promise<any> => {
  data.updated_at = new Date().toISOString();
  const { sql, values } = buildUpdateQuery('products', productId, data);
  const result = await queryOne(sql, values);
  if (!result) {
    throw new NotFoundError('Product', productId);
  }
  return result;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await query(`DELETE FROM public.products WHERE id = $1;`, [productId]);
};

export const getAllProducts = async (
  limit: number = 50,
  offset: number = 0,
  status?: string
): Promise<{ items: any[]; total: number }> => {
  let whereSql = '';
  let params: any[] = [];
  if (status) {
    whereSql = 'WHERE status = $1';
    params.push(status);
  }
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const items = await query(
    `SELECT * FROM public.products ${whereSql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
    [...params, limit, offset]
  );
  const countRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM public.products ${whereSql};`,
    params
  );
  return {
    items,
    total: parseInt(countRes?.count || '0', 10)
  };
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const getWishlistForUser = async (userId: string): Promise<any[]> => {
  const sql = `
    SELECT p.*
    FROM public.wishlists w
    JOIN public.products p ON w.product_id = p.id
    WHERE w.user_id = $1
    ORDER BY w.created_at DESC;
  `;
  return query(sql, [userId]);
};

export const addWishlistItem = async (userId: string, productId: string): Promise<any> => {
  const existing = await queryOne(`SELECT * FROM public.wishlists WHERE user_id = $1 AND product_id = $2;`, [userId, productId]);
  if (existing) return existing;

  const payload = {
    user_id: userId,
    product_id: productId,
    created_at: new Date().toISOString(),
  };
  const { sql, values } = buildInsertQuery('wishlists', payload);
  return queryOne(sql, values);
};

export const removeWishlistItem = async (userId: string, productId: string): Promise<void> => {
  await query(`DELETE FROM public.wishlists WHERE user_id = $1 AND product_id = $2;`, [userId, productId]);
};

// ─── Buyer Requests ───────────────────────────────────────────────────────────

export const createBuyerRequest = async (buyerIdOrUserId: string, data: Record<string, any>): Promise<any> => {
  // Ensure we get the buyer record primary key ID if user_id was passed
  let resolvedBuyerId = buyerIdOrUserId;
  const buyerByUserId = await getBuyerByUserId(buyerIdOrUserId);
  if (buyerByUserId) {
    resolvedBuyerId = buyerByUserId.id;
  }

  const payload = {
    buyer_id: resolvedBuyerId,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  const { sql, values } = buildInsertQuery('buyer_requests', payload);
  return queryOne(sql, values);
};

export const getBuyerRequestById = async (requestId: string): Promise<any> => {
  const result = await queryOne(`SELECT * FROM public.buyer_requests WHERE id = $1;`, [requestId]);
  if (!result) {
    throw new NotFoundError('Buyer request', requestId);
  }
  return result;
};

export const getBuyerRequests = async (
  buyerIdOrUserId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  let whereSql = '';
  let params: any[] = [];
  
  if (buyerIdOrUserId) {
    let resolvedBuyerId = buyerIdOrUserId;
    const buyer = await getBuyerByUserId(buyerIdOrUserId);
    if (buyer) resolvedBuyerId = buyer.id;
    
    whereSql = 'WHERE buyer_id = $1';
    params.push(resolvedBuyerId);
  }

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const items = await query(
    `SELECT * FROM public.buyer_requests ${whereSql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
    [...params, limit, offset]
  );
  const countRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM public.buyer_requests ${whereSql};`,
    params
  );
  return {
    items,
    total: parseInt(countRes?.count || '0', 10)
  };
};

export const getOpportunitiesForArtisanFromDB = async (artisanId: string): Promise<any[]> => {
  try {
    return await query(`SELECT * FROM public.market_opportunities WHERE artisan_id = $1 ORDER BY demand_score DESC;`, [artisanId]);
  } catch (e) {
    return [];
  }
};

export const updateBuyerRequest = async (requestId: string, data: Record<string, any>): Promise<any> => {
  data.updated_at = new Date().toISOString();
  const { sql, values } = buildUpdateQuery('buyer_requests', requestId, data);
  const result = await queryOne(sql, values);
  if (!result) {
    throw new NotFoundError('Buyer request', requestId);
  }
  return result;
};

// ─── Matching Results ──────────────────────────────────────────────────────────

export const saveMatchingResult = async (requestId: string, matches: any[]): Promise<void> => {
  try {
    const payload = {
      request_id: requestId,
      matches: JSON.stringify(matches),
      created_at: new Date().toISOString(),
    };
    const { sql, values } = buildInsertQuery('matching_results', payload);
    await query(sql, values);
  } catch (error) {
    console.warn('Failed to save matching result to DB:', error);
  }
};

// ─── Stats and Analytics ───────────────────────────────────────────────────────

export const getPlatformStats = async (): Promise<Record<string, number>> => {
  const countTable = async (table: string, whereClause: string = ''): Promise<number> => {
    try {
      const client = getPool();
      const res = await client.query(`SELECT COUNT(*)::text as count FROM public."${table}" ${whereClause};`);
      return parseInt(res.rows[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  };

  const totalArtisans = await countTable('artisans');
  const totalProducts = await countTable('products');
  const publishedProducts = await countTable('products', "WHERE status = 'published'");
  const buyerRequests = await countTable('buyer_requests');
  const activeOpportunities = await countTable('market_opportunities');

  return {
    total_artisans: totalArtisans,
    total_products: totalProducts,
    published_products: publishedProducts,
    buyer_requests: buyerRequests,
    active_opportunities: activeOpportunities,
    total_inquiries: 0,
  };
};

export const getArtisanDashboardStats = async (artisanId: string): Promise<Record<string, number>> => {
  const countProducts = async (status?: string): Promise<number> => {
    try {
      let sql = `SELECT COUNT(*)::text as count FROM public.products WHERE artisan_id = $1`;
      let params = [artisanId];
      if (status) {
        sql += ` AND status = $2`;
        params.push(status);
      }
      const res = await queryOne<{ count: string }>(sql, params);
      return parseInt(res?.count || '0', 10);
    } catch {
      return 0;
    }
  };

  const countOpportunities = async (): Promise<number> => {
    try {
      const client = getPool();
      const res = await client.query(
        `SELECT COUNT(*)::text as count FROM public.market_opportunities WHERE artisan_id = $1`,
        [artisanId]
      );
      return parseInt(res.rows[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  };

  const total = await countProducts();
  const published = await countProducts('published');
  const pending = await countProducts('review');
  const opportunities = await countOpportunities();

  return {
    total_products: total,
    published_products: published,
    pending_products: pending,
    inquiries: 0,
    orders: 0,
    market_opportunities: opportunities,
  };
};
