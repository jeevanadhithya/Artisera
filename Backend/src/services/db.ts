import { getSupabase } from './supabase';
import { DatabaseError, NotFoundError } from '../types/errors';

interface QueryResult<T> {
  data: T;
  count: number | null;
}

const executeQuery = async <T>(
  table: string,
  promise: PromiseLike<any>,
  errorMessage: string
): Promise<QueryResult<T>> => {
  try {
    const { data, error, count } = await promise;
    if (error) throw error;
    return { data, count };
  } catch (error: any) {
    console.error(`Database error on table '${table}':`, error);
    const errorMsg = error?.message || error?.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    throw new DatabaseError(`${errorMessage}: ${errorMsg}`);
  }
};

// ─── Artisans ─────────────────────────────────────────────────────────────────

export const createArtisan = async (userId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  const payload = {
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  
  const queryResult = await executeQuery<any>(
    'artisans',
    supabase.from('artisans').insert(payload).select().single(),
    'Failed to create artisan'
  );
  return queryResult.data;
};

export const getArtisanById = async (artisanId: string): Promise<any> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any>(
    'artisans',
    supabase.from('artisans').select('*').eq('id', artisanId).maybeSingle(),
    'Failed to fetch artisan'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Artisan', artisanId);
  }
  return queryResult.data;
};

export const getArtisanByUserId = async (userId: string): Promise<any | null> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any>(
    'artisans',
    supabase.from('artisans').select('*').eq('user_id', userId).maybeSingle(),
    'Failed to fetch artisan by user_id'
  );
  return queryResult.data;
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
  };
  console.log(`Auto-created placeholder artisan profile for user ${userId}`);
  return createArtisan(userId, defaultData);
};

export const updateArtisan = async (artisanId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  data.updated_at = new Date().toISOString();
  
  const queryResult = await executeQuery<any>(
    'artisans',
    supabase.from('artisans').update(data).eq('id', artisanId).select().maybeSingle(),
    'Failed to update artisan'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Artisan', artisanId);
  }
  return queryResult.data;
};

export const getAllArtisans = async (limit: number = 50, offset: number = 0): Promise<any[]> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any[]>(
    'artisans',
    supabase.from('artisans').select('*').range(offset, offset + limit - 1),
    'Failed to fetch artisans'
  );
  return queryResult.data || [];
};

// ─── Buyers ───────────────────────────────────────────────────────────────────

export const createBuyer = async (userId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  const payload = {
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  
  const queryResult = await executeQuery<any>(
    'buyers',
    supabase.from('buyers').insert(payload).select().single(),
    'Failed to create buyer profile'
  );
  return queryResult.data;
};

export const getBuyerByUserId = async (userId: string): Promise<any | null> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any>(
    'buyers',
    supabase.from('buyers').select('*').eq('user_id', userId).maybeSingle(),
    'Failed to fetch buyer by user_id'
  );
  return queryResult.data;
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
  };
  console.log(`Auto-created placeholder buyer profile for user ${userId}`);
  return createBuyer(userId, defaultData);
};

export const updateBuyer = async (buyerId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  data.updated_at = new Date().toISOString();
  
  const queryResult = await executeQuery<any>(
    'buyers',
    supabase.from('buyers').update(data).eq('id', buyerId).select().maybeSingle(),
    'Failed to update buyer'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Buyer', buyerId);
  }
  return queryResult.data;
};

export const getAllBuyers = async (limit: number = 50, offset: number = 0): Promise<any[]> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any[]>(
    'buyers',
    supabase.from('buyers').select('*').range(offset, offset + limit - 1),
    'Failed to fetch buyers'
  );
  return queryResult.data || [];
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const createProduct = async (artisanId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  const payload = {
    artisan_id: artisanId,
    status: 'draft',
    ai_generated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  
  const queryResult = await executeQuery<any>(
    'products',
    supabase.from('products').insert(payload).select().single(),
    'Failed to create product'
  );
  return queryResult.data;
};

export const getProductById = async (productId: string): Promise<any> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any>(
    'products',
    supabase.from('products').select('*').eq('id', productId).maybeSingle(),
    'Failed to fetch product'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Product', productId);
  }
  return queryResult.data;
};

export const getProductsByArtisan = async (
  artisanId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any[]>(
    'products',
    supabase.from('products')
      .select('*', { count: 'exact' })
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    'Failed to fetch products for artisan'
  );
  return {
    items: queryResult.data || [],
    total: queryResult.count || 0
  };
};

export const getPublishedProducts = async (
  filters: Record<string, any>,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  const supabase = getSupabase();
  
  let query = supabase.from('products')
    .select('*, artisans(name, state)', { count: 'exact' })
    .eq('status', 'published');

  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`);
  }
  if (filters.craft_type) {
    query = query.ilike('craft_type', `%${filters.craft_type}%`);
  }
  if (filters.min_price !== undefined && filters.min_price !== null) {
    query = query.gte('price', filters.min_price);
  }
  if (filters.max_price !== undefined && filters.max_price !== null) {
    query = query.lte('price', filters.max_price);
  }
  if (filters.search) {
    const searchTerm = filters.search;
    query = query.or(`name.ilike.%${searchTerm}%,description_en.ilike.%${searchTerm}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const queryResult = await executeQuery<any[]>(
    'products',
    query,
    'Failed to fetch marketplace products'
  );

  let items = queryResult.data || [];
  
  if (filters.state) {
    const stateLower = filters.state.toLowerCase();
    items = items.filter(item => (item.artisans as any)?.state?.toLowerCase().includes(stateLower));
  }

  return {
    items,
    total: queryResult.count || 0
  };
};

export const updateProduct = async (productId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  data.updated_at = new Date().toISOString();
  
  const queryResult = await executeQuery<any>(
    'products',
    supabase.from('products').update(data).eq('id', productId).select().maybeSingle(),
    'Failed to update product'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Product', productId);
  }
  return queryResult.data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  const supabase = getSupabase();
  await executeQuery<void>(
    'products',
    supabase.from('products').delete().eq('id', productId),
    'Failed to delete product'
  );
};

export const getAllProducts = async (
  limit: number = 50,
  offset: number = 0,
  status?: string
): Promise<{ items: any[]; total: number }> => {
  const supabase = getSupabase();
  let query = supabase.from('products').select('*', { count: 'exact' });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  
  const queryResult = await executeQuery<any[]>(
    'products',
    query,
    'Failed to fetch all products'
  );
  
  return {
    items: queryResult.data || [],
    total: queryResult.count || 0
  };
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const getWishlistForUser = async (userId: string): Promise<any[]> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any[]>(
    'wishlists',
    supabase.from('wishlists')
      .select('product_id, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    'Failed to fetch wishlist'
  );
  
  const rows = queryResult.data || [];
  return rows.map((r: any) => r.products).filter(Boolean);
};

export const addWishlistItem = async (userId: string, productId: string): Promise<any> => {
  const supabase = getSupabase();
  
  const check = await executeQuery<any[]>(
    'wishlists',
    supabase.from('wishlists')
      .select('id, product_id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .limit(1),
    'Failed to check wishlist item'
  );
  
  if (check.data && check.data.length > 0) {
    return check.data[0];
  }

  const payload = {
    user_id: userId,
    product_id: productId,
    created_at: new Date().toISOString(),
  };

  const queryResult = await executeQuery<any>(
    'wishlists',
    supabase.from('wishlists').insert(payload).select().single(),
    'Failed to add wishlist item'
  );
  return queryResult.data;
};

export const removeWishlistItem = async (userId: string, productId: string): Promise<void> => {
  const supabase = getSupabase();
  await executeQuery<void>(
    'wishlists',
    supabase.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId),
    'Failed to remove wishlist item'
  );
};

// ─── Buyer Requests ───────────────────────────────────────────────────────────

export const createBuyerRequest = async (buyerId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  const payload = {
    buyer_id: buyerId,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  
  const queryResult = await executeQuery<any>(
    'buyer_requests',
    supabase.from('buyer_requests').insert(payload).select().single(),
    'Failed to create buyer request'
  );
  return queryResult.data;
};

export const getBuyerRequestById = async (requestId: string): Promise<any> => {
  const supabase = getSupabase();
  const queryResult = await executeQuery<any>(
    'buyer_requests',
    supabase.from('buyer_requests').select('*').eq('id', requestId).maybeSingle(),
    'Failed to fetch buyer request'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Buyer request', requestId);
  }
  return queryResult.data;
};

export const getBuyerRequests = async (
  buyerId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: any[]; total: number }> => {
  const supabase = getSupabase();
  let query = supabase.from('buyer_requests').select('*', { count: 'exact' });
  
  if (buyerId) {
    query = query.eq('buyer_id', buyerId);
  }
  
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  
  const queryResult = await executeQuery<any[]>(
    'buyer_requests',
    query,
    'Failed to fetch buyer requests'
  );
  
  return {
    items: queryResult.data || [],
    total: queryResult.count || 0
  };
};

export const getOpportunitiesForArtisanFromDB = async (artisanId: string): Promise<any[]> => {
  const supabase = getSupabase();
  try {
    const { data } = await supabase.from('market_opportunities')
      .select('*')
      .eq('artisan_id', artisanId)
      .order('demand_score', { ascending: false });
    return data || [];
  } catch (e) {
    return [];
  }
};

export const updateBuyerRequest = async (requestId: string, data: Record<string, any>): Promise<any> => {
  const supabase = getSupabase();
  data.updated_at = new Date().toISOString();
  
  const queryResult = await executeQuery<any>(
    'buyer_requests',
    supabase.from('buyer_requests').update(data).eq('id', requestId).select().maybeSingle(),
    'Failed to update buyer request'
  );
  if (!queryResult.data) {
    throw new NotFoundError('Buyer request', requestId);
  }
  return queryResult.data;
};

// ─── matching results ──────────────────────────────────────────────────────────

export const saveMatchingResult = async (requestId: string, matches: any[]): Promise<void> => {
  const supabase = getSupabase();
  const payload = {
    request_id: requestId,
    matches,
    created_at: new Date().toISOString(),
  };
  try {
    await supabase.from('matching_results').insert(payload);
  } catch (error) {
    console.warn('Failed to save matching result, database might not have matching_results table:', error);
  }
};

// ─── Stats and Analytics ───────────────────────────────────────────────────────

export const getPlatformStats = async (): Promise<Record<string, number>> => {
  const supabase = getSupabase();

  const countTable = async (table: string, filters?: Record<string, any>): Promise<number> => {
    try {
      let query = supabase.from(table).select('id', { count: 'exact', head: true }).limit(1);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          query = query.eq(k, v);
        }
      }
      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  };

  const totalArtisans = await countTable('artisans');
  const totalProducts = await countTable('products');
  const publishedProducts = await countTable('products', { status: 'published' });
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
  const supabase = getSupabase();

  const countProducts = async (status?: string): Promise<number> => {
    try {
      let query = supabase.from('products')
        .select('id', { count: 'exact', head: true })
        .eq('artisan_id', artisanId)
        .limit(1);
      if (status) {
        query = query.eq('status', status);
      }
      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  };

  const countOpportunities = async (): Promise<number> => {
    try {
      const { count } = await supabase.from('market_opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('artisan_id', artisanId)
        .limit(1);
      return count || 0;
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
