export interface MarketplaceExportPayload {
  marketplace: 'amazon' | 'flipkart' | 'gem';
  sku: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  countryOfOrigin: string;
  hsnCode?: string;
  price: {
    mrp: number;
    listingPrice: number;
    currency: string;
  };
  attributes: Record<string, any>;
  images: {
    mainImage: string;
    allImages: string[];
  };
  compliance: {
    handmadeCertified: boolean;
    artisanCluster?: string;
    geoTag?: string;
  };
  rawListingFormat: Record<string, any>;
}

export class MarketplaceExportService {
  /**
   * Generates marketplace export payload for specified platform
   */
  public static exportProduct(product: any, marketplace: 'amazon' | 'flipkart' | 'gem'): MarketplaceExportPayload {
    const mainImage = product.selected_image_url || product.primary_image_url || product.enhanced_image_url || product.image_url || product.original_image_url || '';
    const allImages = [mainImage, product.enhanced_image_url, product.original_image_url].filter(Boolean) as string[];
    const uniqueImages = Array.from(new Set(allImages));

    const price = parseFloat(product.price?.toString() || '0');
    const mrp = Math.round(price * 1.35); // 35% markup standard for retail MRP
    const sku = `ART-${(product.craft_type || 'CRAFT').toUpperCase().replace(/[^A-Z0-9]/g, '')}-${product.id.substring(0, 8).toUpperCase()}`;

    switch (marketplace) {
      case 'amazon':
        return this.formatAmazon(product, sku, mrp, price, mainImage, uniqueImages);
      case 'flipkart':
        return this.formatFlipkart(product, sku, mrp, price, mainImage, uniqueImages);
      case 'gem':
        return this.formatGeM(product, sku, mrp, price, mainImage, uniqueImages);
      default:
        return this.formatAmazon(product, sku, mrp, price, mainImage, uniqueImages);
    }
  }

  private static formatAmazon(product: any, sku: string, mrp: number, price: number, mainImage: string, images: string[]): MarketplaceExportPayload {
    const title = `${product.name} - Authentic Handcrafted ${product.craft_type || 'Artisan Craft'} (${product.material || 'Natural Material'})`;
    return {
      marketplace: 'amazon',
      sku,
      title,
      description: product.description_en || 'Authentic traditional handmade product by master artisans.',
      category: product.category || 'Home & Kitchen / Handicrafts',
      brand: 'Artisera Handcrafted',
      countryOfOrigin: 'India',
      hsnCode: '97019900', // General handicraft / decorative art HSN
      price: {
        mrp,
        listingPrice: price,
        currency: 'INR',
      },
      attributes: {
        item_type_keyword: product.craft_type || 'handicrafts',
        material_type: product.material || 'Natural Fiber/Terracotta/Wood',
        color_name: product.keywords?.[0] || 'Natural Craft Colors',
        is_handmade: 'True',
        origin_region: product.region || 'India',
      },
      images: {
        mainImage,
        allImages: images,
      },
      compliance: {
        handmadeCertified: true,
        geoTag: product.region,
      },
      rawListingFormat: {
        feed_product_type: 'HomeHandicraft',
        item_sku: sku,
        item_name: title,
        standard_price: price,
        list_price: mrp,
        main_image_url: mainImage,
        bullet_point1: `100% Genuine Handcrafted item made in ${product.region || 'India'}.`,
        bullet_point2: `Crafted with traditional ${product.craft_type || 'artisan'} craftsmanship.`,
        bullet_point3: `Premium quality ${product.material || 'natural material'}.`,
        bullet_point4: 'Supports rural artisans and indigenous craft heritage.',
        generic_keywords: (product.keywords || []).join(' '),
      },
    };
  }

  private static formatFlipkart(product: any, sku: string, mrp: number, price: number, mainImage: string, images: string[]): MarketplaceExportPayload {
    const title = `${product.name} (${product.material || 'Handmade'})`;
    return {
      marketplace: 'flipkart',
      sku,
      title,
      description: product.description_en || 'Handcrafted artisan product.',
      category: 'Home Decor & Handcrafted Crafts',
      brand: 'Artisera Samarth',
      countryOfOrigin: 'India',
      price: {
        mrp,
        listingPrice: price,
        currency: 'INR',
      },
      attributes: {
        flipkart_samarth_initiative: 'Yes',
        craft_cluster: product.region || 'India',
        artisan_made: 'Yes',
        primary_material: product.material || 'Craft Materials',
      },
      images: {
        mainImage,
        allImages: images,
      },
      compliance: {
        handmadeCertified: true,
        artisanCluster: product.region,
      },
      rawListingFormat: {
        product_id_type: 'FSN',
        seller_sku: sku,
        listing_status: 'ACTIVE',
        mrp: mrp,
        selling_price: price,
        title: title,
        main_image: mainImage,
        flipkart_samarth_tag: true,
      },
    };
  }

  private static formatGeM(product: any, sku: string, mrp: number, price: number, mainImage: string, images: string[]): MarketplaceExportPayload {
    const title = `Tribal & Traditional Handicraft - ${product.name}`;
    return {
      marketplace: 'gem',
      sku,
      title,
      description: product.description_en || 'Government registered authentic artisan craft product.',
      category: 'Handicrafts, Artware & Traditional Artifacts',
      brand: 'Vocal for Local / Artisera',
      countryOfOrigin: 'India',
      hsnCode: '97019900',
      price: {
        mrp,
        listingPrice: price,
        currency: 'INR',
      },
      attributes: {
        gem_category_code: 'HANDICRAFT_GEN_01',
        make_in_india_compliance: '100% Local Content',
        artisan_cluster_registry: product.region || 'Registered Craft Cluster',
        mstc_handloom_handicraft: 'Handicraft',
      },
      images: {
        mainImage,
        allImages: images,
      },
      compliance: {
        handmadeCertified: true,
        geoTag: product.region,
      },
      rawListingFormat: {
        gem_item_id: sku,
        catalogue_name: title,
        offer_price: price,
        unit_of_measure: 'PIECE',
        make_in_india_pct: 100,
        primary_image_url: mainImage,
        secondary_images: images.slice(1),
        declaration_of_local_content: true,
      },
    };
  }
}
