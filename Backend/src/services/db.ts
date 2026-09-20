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

export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  try {
    const client = getPool();
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (error: any) {
    console.error('Database query error:', error, 'SQL:', sql);
    throw new DatabaseError(error?.message || String(error));
  }
};

export const queryOne = async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
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

const isUuid = (val?: string): boolean => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export const createProduct = async (artisanId: string, data: Record<string, any>): Promise<any> => {
  const payload: any = {
    artisan_id: artisanId,
    status: data.status || 'published',
    ai_generated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  // Strip client-generated dummy IDs like 'craft-1789...' so PostgreSQL creates a valid UUID
  if (payload.id && !isUuid(payload.id)) {
    delete payload.id;
  }
  const { sql, values } = buildInsertQuery('products', payload);
  return queryOne(sql, values);
};

export const getProductById = async (productId: string): Promise<any> => {
  if (!isUuid(productId)) {
    throw new NotFoundError('Product', productId);
  }
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
  // Cascading deletion of child records to prevent foreign key constraint violations
  try {
    await query(`DELETE FROM public.product_images WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  try {
    await query(`DELETE FROM public.product_translations WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  try {
    await query(`DELETE FROM public.product_scores WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  try {
    await query(`DELETE FROM public.marketing_assets WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  try {
    await query(`DELETE FROM public.wishlists WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  try {
    await query(`DELETE FROM public.proposals WHERE product_id = $1;`, [productId]);
  } catch (_) {}
  await query(`DELETE FROM public.products WHERE id = $1;`, [productId]);
};

export const getCategories = async (): Promise<string[]> => {
  const rows = await query(
    `SELECT DISTINCT category FROM public.products WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC;`
  );
  return rows.map((r: any) => r.category);
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

// ─── Product Images ───────────────────────────────────────────────────────────

export const createProductImage = async (data: {
  id?: string;
  product_id: string;
  artisan_id: string;
  original_image_url: string;
  enhanced_image_url?: string;
  selected_image_url?: string;
  processing_status?: string;
  analysis_status?: string;
  mime_type?: string;
  file_size?: number;
  enhancement_prompt?: string;
  analysis_result?: any;
}): Promise<any> => {

  const payload = {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    processing_status: 'uploaded',
    analysis_status: 'pending',
    ...data,
  };
  const { sql, values } = buildInsertQuery('product_images', payload);
  return queryOne(sql, values);
};

export const getProductImageById = async (imageId: string): Promise<any | null> => {
  if (!isUuid(imageId)) return null;
  return queryOne(`SELECT * FROM public.product_images WHERE id = $1;`, [imageId]);
};

export const getProductImagesByProductId = async (productId: string): Promise<any[]> => {
  if (!isUuid(productId)) return [];
  return query(
    `SELECT * FROM public.product_images WHERE product_id = $1 ORDER BY created_at DESC;`,
    [productId]
  );
};

export const updateProductImage = async (imageId: string, data: Record<string, any>): Promise<any> => {
  data.updated_at = new Date().toISOString();
  const { sql, values } = buildUpdateQuery('product_images', imageId, data);
  const result = await queryOne(sql, values);
  if (!result) {
    throw new NotFoundError('Product image', imageId);
  }
  return result;
};

export const deleteProductImage = async (imageId: string): Promise<void> => {
  await query(`DELETE FROM public.product_images WHERE id = $1;`, [imageId]);
};

// ─── Product Translations ─────────────────────────────────────────────────────

export const saveProductTranslation = async (
  productId: string,
  languageCode: string,
  data: {
    title?: string;
    short_description?: string;
    description?: string;
    keywords?: string[];
    pricing_explanation?: string;
    price_formatted?: string;
  }
): Promise<any> => {
  const now = new Date().toISOString();
  const sql = `
    INSERT INTO public.product_translations (
      product_id, language_code, title, short_description, description, keywords, pricing_explanation, price_formatted, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (product_id, language_code) 
    DO UPDATE SET 
      title = COALESCE(EXCLUDED.title, public.product_translations.title),
      short_description = COALESCE(EXCLUDED.short_description, public.product_translations.short_description),
      description = COALESCE(EXCLUDED.description, public.product_translations.description),
      keywords = COALESCE(EXCLUDED.keywords, public.product_translations.keywords),
      pricing_explanation = COALESCE(EXCLUDED.pricing_explanation, public.product_translations.pricing_explanation),
      price_formatted = COALESCE(EXCLUDED.price_formatted, public.product_translations.price_formatted),
      updated_at = EXCLUDED.updated_at
    RETURNING *;
  `;
  return queryOne(sql, [
    productId,
    languageCode,
    data.title || null,
    data.short_description || null,
    data.description || null,
    data.keywords || [],
    data.pricing_explanation || null,
    data.price_formatted || null,
    now,
    now,
  ]);
};

export const getProductTranslations = async (productId: string): Promise<any[]> => {
  return query(
    `SELECT * FROM public.product_translations WHERE product_id = $1 ORDER BY language_code ASC;`,
    [productId]
  );
};

export const getProductTranslation = async (productId: string, languageCode: string): Promise<any | null> => {
  return queryOne(
    `SELECT * FROM public.product_translations WHERE product_id = $1 AND language_code = $2;`,
    [productId, languageCode]
  );
};

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const getProfileByUserId = async (userId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.profiles WHERE id = $1;`, [userId]);
};

export const upsertProfile = async (userId: string, data: Record<string, any>): Promise<any> => {
  const now = new Date().toISOString();
  const existing = await getProfileByUserId(userId);
  if (existing) {
    const { sql, values } = buildUpdateQuery('profiles', userId, { ...data, updated_at: now });
    return queryOne(sql, values);
  } else {
    const { sql, values } = buildInsertQuery('profiles', {
      id: userId,
      role: data.role || 'artisan',
      full_name: data.full_name || 'Artisan',
      ...data,
      created_at: now,
      updated_at: now,
    });
    return queryOne(sql, values);
  }
};

// ─── Product Scores ───────────────────────────────────────────────────────────

export const getProductScore = async (productId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.product_scores WHERE product_id = $1;`, [productId]);
};

export const upsertProductScore = async (productId: string, data: Record<string, any>): Promise<any> => {
  const sql = `
    INSERT INTO public.product_scores (
      product_id, overall_score, image_quality_score, catalog_quality_score,
      discoverability_score, pricing_competitiveness_score, market_fit_score,
      breakdown, recommendations, calculated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (product_id)
    DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      image_quality_score = EXCLUDED.image_quality_score,
      catalog_quality_score = EXCLUDED.catalog_quality_score,
      discoverability_score = EXCLUDED.discoverability_score,
      pricing_competitiveness_score = EXCLUDED.pricing_competitiveness_score,
      market_fit_score = EXCLUDED.market_fit_score,
      breakdown = EXCLUDED.breakdown,
      recommendations = EXCLUDED.recommendations,
      calculated_at = EXCLUDED.calculated_at
    RETURNING *;
  `;
  return queryOne(sql, [
    productId,
    data.overall_score || 0,
    data.image_quality_score || 0,
    data.catalog_quality_score || 0,
    data.discoverability_score || 0,
    data.pricing_competitiveness_score || 0,
    data.market_fit_score || 0,
    JSON.stringify(data.breakdown || {}),
    data.recommendations || [],
    new Date().toISOString()
  ]);
};

// ─── AI Generation Jobs ───────────────────────────────────────────────────────

export const createAiJob = async (data: {
  user_id: string;
  product_id?: string;
  job_type: string;
  input_payload?: any;
}): Promise<any> => {
  const { sql, values } = buildInsertQuery('ai_generation_jobs', {
    user_id: data.user_id,
    product_id: data.product_id || null,
    job_type: data.job_type,
    status: 'queued',
    progress_pct: 0,
    input_payload: JSON.stringify(data.input_payload || {}),
    result_data: JSON.stringify({}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};

export const getAiJobById = async (jobId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.ai_generation_jobs WHERE id = $1;`, [jobId]);
};

export const updateAiJobStatus = async (
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
  progressPct = 0,
  resultData?: any,
  errorMessage?: string
): Promise<any> => {
  const updateData: Record<string, any> = {
    status,
    progress_pct: progressPct,
    updated_at: new Date().toISOString(),
  };
  if (resultData !== undefined) {
    updateData.result_data = JSON.stringify(resultData);
  }
  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }
  const { sql, values } = buildUpdateQuery('ai_generation_jobs', jobId, updateData);
  return queryOne(sql, values);
};

// ─── Inquiries & Proposals ───────────────────────────────────────────────────

export const createInquiry = async (data: Record<string, any>): Promise<any> => {
  const { sql, values } = buildInsertQuery('inquiries', {
    ...data,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};

export const getInquiriesByArtisan = async (artisanId: string): Promise<any[]> => {
  return query(
    `SELECT i.*, p.name as product_name, p.primary_image_url as product_image, pr.full_name as buyer_name
     FROM public.inquiries i
     LEFT JOIN public.products p ON p.id = i.product_id
     LEFT JOIN public.profiles pr ON pr.id = i.buyer_id
     WHERE i.artisan_id = $1
     ORDER BY i.created_at DESC;`,
    [artisanId]
  );
};

export const getInquiriesByBuyer = async (buyerId: string): Promise<any[]> => {
  return query(
    `SELECT i.*, p.name as product_name, p.primary_image_url as product_image, a.name as artisan_name
     FROM public.inquiries i
     LEFT JOIN public.products p ON p.id = i.product_id
     LEFT JOIN public.artisans a ON a.id = i.artisan_id
     WHERE i.buyer_id = $1
     ORDER BY i.created_at DESC;`,
    [buyerId]
  );
};

export const getInquiryById = async (inquiryId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.inquiries WHERE id = $1;`, [inquiryId]);
};

export const createProposal = async (data: Record<string, any>): Promise<any> => {
  const { sql, values } = buildInsertQuery('proposals', {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};

export const getProposalsByArtisan = async (artisanId: string): Promise<any[]> => {
  return query(
    `SELECT pr.*, p.name as product_name, p.primary_image_url as product_image
     FROM public.proposals pr
     LEFT JOIN public.products p ON p.id = pr.product_id
     WHERE pr.artisan_id = $1
     ORDER BY pr.created_at DESC;`,
    [artisanId]
  );
};

export const getProposalById = async (proposalId: string): Promise<any | null> => {
  return queryOne(`SELECT * FROM public.proposals WHERE id = $1;`, [proposalId]);
};

export const updateProposal = async (proposalId: string, data: Record<string, any>): Promise<any> => {
  const { sql, values } = buildUpdateQuery('proposals', proposalId, {
    ...data,
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};

// ─── AI Generation Jobs ───────────────────────────────────────────────────────

export const createAiGenerationJob = async (data: Record<string, any>): Promise<any> => {
  const { sql, values } = buildInsertQuery('ai_generation_jobs', {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};

export const getAiGenerationJobs = async (productId: string): Promise<any[]> => {
  return query(
    `SELECT * FROM public.ai_generation_jobs WHERE product_id = $1 ORDER BY created_at DESC;`,
    [productId]
  );
};

export const updateAiJob = async (jobId: string, data: Record<string, any>): Promise<any> => {
  const { sql, values } = buildUpdateQuery('ai_generation_jobs', jobId, {
    ...data,
    updated_at: new Date().toISOString(),
  });
  return queryOne(sql, values);
};


