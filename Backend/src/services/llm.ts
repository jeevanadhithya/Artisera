import axios from 'axios';
import { z } from 'zod';
import { config } from '../config';
import { AIServiceError, ValidationError } from '../types/errors';

export const AICatalogOutputSchema = z.object({
  product_name: z.string(),
  category: z.string(),
  material: z.string(),
  craft_type: z.string(),
  region: z.string(),
  description_en: z.string(),
  description_hi: z.string(),
  keywords: z.array(z.string()),
  confidence: z.number().min(0.0).max(1.0),
});

export type AICatalogOutput = z.infer<typeof AICatalogOutputSchema>;

// System Prompts
const CATALOG_SYSTEM_PROMPT = `You are an AI catalog assistant for traditional artisans.

Understand the provided product image and artisan description.

Extract only information supported by the input.

Generate a professional but truthful product catalog.

CRITICAL RULES:
- All output fields MUST be valid non-null strings or non-empty string arrays. Never return null, undefined, or empty values.
- If material, craft_type, or region is unknown or not explicitly specified, provide a reasonable general description (e.g. "Natural Material", "Traditional Craftsmanship", "India").
- Do not invent pricing, fake certifications, or unsubstantiated historical claims.

Return ONLY valid JSON matching the required schema:
- product_name: clear descriptive product name
- category: product category (e.g. "Home Decor", "Textiles", "Pottery", "Jewelry")
- material: primary material
- craft_type: craft technique used
- region: region of origin
- description_en: 100-200 word English description
- description_hi: 100-200 word Hindi description
- keywords: 5-10 relevant search keywords as a JSON array of strings
- confidence: your confidence score from 0.0 to 1.0

Return ONLY valid JSON. No markdown. No explanation.`;

const BUYER_SUMMARY_PROMPT = `You are a business analyst for traditional artisan products.
Summarize the buyer requirement concisely for matching purposes.
Return only a 2-3 sentence plain text summary.`;

const MARKET_EXPLANATION_PROMPT = `You are a market advisor for traditional artisans.
Explain the market opportunity in simple, encouraging language.
Keep it to 2-3 sentences. Avoid jargon.`;

// ─── Parsing & Validation Helper ─────────────────────────────────────────────
const cleanProse = (val: any, fallback: string): string => {
  if (!val || typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (trimmed.startsWith('{') || trimmed.includes('"product_name":') || trimmed.includes('"category":') || trimmed.includes('"description_en":')) {
    return fallback;
  }
  return trimmed;
};

const sanitizeCatalogOutput = (parsed: any): AICatalogOutput => {
  const keywords = Array.isArray(parsed?.keywords)
    ? parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean)
    : typeof parsed?.keywords === 'string'
    ? parsed.keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
    : ['handcraft', 'artisan', 'handmade', 'craft'];

  const rawName = cleanProse(parsed?.product_name || parsed?.name, 'Handcrafted Artisan Product');
  const rawDescEn = cleanProse(parsed?.description_en || parsed?.description, 'Authentic artisan handcrafted product made with traditional technique and fine natural materials.');
  const rawDescHi = cleanProse(parsed?.description_hi, 'प्रामाणिक हस्तशिल्प उत्पाद जो पारंपरिक कला और प्राकृतिक सामग्रियों से बनाया गया है।');

  return {
    product_name: rawName,
    category: cleanProse(parsed?.category, 'Handicrafts & Decor'),
    material: cleanProse(parsed?.material, 'Natural Material'),
    craft_type: cleanProse(parsed?.craft_type, 'Traditional Artisan Craft'),
    region: cleanProse(parsed?.region, 'India'),
    description_en: rawDescEn,
    description_hi: rawDescHi,
    keywords: keywords.length > 0 ? keywords : ['artisan', 'handicraft'],
    confidence: typeof parsed?.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.90,
  };
};

const tryRepairTruncatedJson = (jsonStr: string): any => {
  let str = jsonStr.trim();
  str = str.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = str.indexOf('{');
  if (firstBrace !== -1) {
    str = str.substring(firstBrace);
  }

  let inString = false;
  let escaped = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  if (inString) {
    str += '"';
  }

  str = str.replace(/:\s*$/, ': null').replace(/,\s*$/, '');

  while (openBrackets > 0) {
    str += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    str += '}';
    openBraces--;
  }

  return JSON.parse(str);
};

const parseAndValidateCatalog = (rawText: string): AICatalogOutput => {
  let text = rawText.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Extract JSON object using regex if present
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(text);
    return AICatalogOutputSchema.parse(parsed);
  } catch (error) {
    try {
      const parsed = JSON.parse(text);
      return sanitizeCatalogOutput(parsed);
    } catch (syntaxErr) {
      try {
        const repaired = tryRepairTruncatedJson(rawText);
        return sanitizeCatalogOutput(repaired);
      } catch (repairErr) {
        console.warn('Applying fallback catalog structure for AI response text:', rawText.substring(0, 100));
        return sanitizeCatalogOutput({
          product_name: 'Handcrafted Artisan Product',
          description_en: rawText.replace(/```json|```|\{|\}/g, '').trim().substring(0, 300) || 'Beautiful handcrafted artisan product created with authentic traditional craftsmanship.',
        });
      }
    }
  }
};

// ─── Qwen Provider (Primary) ─────────────────────────────────────────────────
const generateCatalogQwen = async (
  imageUrl?: string,
  transcript?: string,
  artisanContext?: Record<string, any>
): Promise<AICatalogOutput> => {
  if (!config.VLLM_BASE_URL) {
    throw new AIServiceError('Qwen/vLLM base URL is not configured');
  }

  const content: any[] = [];
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  if (transcript) {
    content.push({ type: 'text', text: `Artisan description: ${transcript}` });
  }
  if (artisanContext) {
    const craft = artisanContext.craft_type || '';
    const region = artisanContext.region || '';
    content.push({
      type: 'text',
      text: `Artisan craft: ${craft}. Region: ${region}.`,
    });
  }
  if (content.length === 0) {
    throw new AIServiceError('No image or transcript provided for catalog generation');
  }

  content.push({ type: 'text', text: 'Generate the product catalog JSON.' });

  const payload = {
    model: 'Qwen/Qwen3-VL-7B-Instruct',
    messages: [
      { role: 'system', content: CATALOG_SYSTEM_PROMPT },
      { role: 'user', content: content },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.VLLM_API_KEY || 'no-key'}`
  };

  try {
    const response = await axios.post(
      `${config.VLLM_BASE_URL}/v1/chat/completions`,
      payload,
      { headers, timeout: 60000 }
    );
    const rawText = response.data?.choices?.[0]?.message?.content || '';
    return parseAndValidateCatalog(rawText);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Qwen API HTTP error: ${error.response?.status} ${error.response?.data}`);
      throw new AIServiceError(`Qwen API returned error ${error.response?.status}`);
    }
    throw new AIServiceError(`Cannot reach Qwen/vLLM service: ${error instanceof Error ? error.message : error}`);
  }
};

const generateTextQwen = async (prompt: string, system?: string): Promise<string> => {
  if (!config.VLLM_BASE_URL) {
    throw new AIServiceError('Qwen/vLLM base URL is not configured');
  }

  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = {
    model: 'Qwen/Qwen3-VL-7B-Instruct',
    messages,
    temperature: 0.4,
    max_tokens: 512,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.VLLM_API_KEY || 'no-key'}`
  };

  try {
    const response = await axios.post(
      `${config.VLLM_BASE_URL}/v1/chat/completions`,
      payload,
      { headers, timeout: 30000 }
    );
    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    throw new AIServiceError(`Qwen text generation failed: ${error instanceof Error ? error.message : error}`);
  }
};

import { getSupabase } from './supabase';

// ─── Gemini Provider (Fallback) ───────────────────────────────────────────────
const fetchImageBase64 = async (url: string): Promise<{ data: string; mimeType: string }> => {
  const bucket = config.STORAGE_BUCKET_PRODUCTS;
  const bucketIdx = url.indexOf(bucket);
  if (bucketIdx !== -1) {
    const storagePath = url.substring(bucketIdx + bucket.length + 1);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      if (!error && data) {
        const buf = Buffer.from(await data.arrayBuffer());
        return { data: buf.toString('base64'), mimeType: data.type || 'image/jpeg' };
      }
    } catch (e) {
      console.warn('Supabase storage SDK base64 fetch failed, falling back to axios HTTP:', e);
    }
  }

  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  const rawMimeType = response.headers['content-type'];
  const mimeType = typeof rawMimeType === 'string' ? rawMimeType.split(';')[0] : 'image/jpeg';
  const data = Buffer.from(response.data).toString('base64');
  return { data, mimeType };
};

const generateCatalogGemini = async (
  imageUrl?: string,
  transcript?: string,
  artisanContext?: Record<string, any>
): Promise<AICatalogOutput> => {
  if (!config.GEMINI_API_KEY) {
    throw new AIServiceError('Gemini API key is not configured');
  }

  const parts: any[] = [{ text: CATALOG_SYSTEM_PROMPT }];

  if (imageUrl) {
    try {
      const { data, mimeType } = await fetchImageBase64(imageUrl);
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: data,
        },
      });
    } catch (e) {
      console.warn('Failed to fetch image for Gemini inline data, sending URL text instead:', e);
      parts.push({ text: `Product image URL: ${imageUrl}` });
    }
  }

  if (transcript) {
    parts.push({ text: `Artisan description: ${transcript}` });
  }

  if (artisanContext) {
    parts.push({
      text: `Craft: ${artisanContext.craft_type || ''}. Region: ${artisanContext.region || ''}.`,
    });
  }

  parts.push({ text: 'Generate the product catalog JSON now.' });

  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING' },
          category: { type: 'STRING' },
          material: { type: 'STRING' },
          craft_type: { type: 'STRING' },
          region: { type: 'STRING' },
          description_en: { type: 'STRING' },
          description_hi: { type: 'STRING' },
          keywords: { type: 'ARRAY', items: { type: 'STRING' } },
          confidence: { type: 'NUMBER' },
        },
        required: [
          'product_name',
          'category',
          'material',
          'craft_type',
          'region',
          'description_en',
          'description_hi',
          'keywords',
          'confidence',
        ],
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });
    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAndValidateCatalog(rawText);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Gemini API error: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
      throw new AIServiceError(`Gemini API returned error ${error.response?.status}`);
    }
    throw new AIServiceError(`Gemini catalog generation failed: ${error instanceof Error ? error.message : error}`);
  }
};

const generateTextGemini = async (prompt: string, system?: string): Promise<string> => {
  if (!config.GEMINI_API_KEY) {
    throw new AIServiceError('Gemini API key is not configured');
  }

  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error) {
    throw new AIServiceError(`Gemini text generation failed: ${error instanceof Error ? error.message : error}`);
  }
};

// ─── Orchestrator Public Functions ────────────────────────────────────────────
export const generateCatalog = async (
  imageUrl?: string,
  transcript?: string,
  artisanContext?: Record<string, any>
): Promise<AICatalogOutput> => {
  const isQwenPreferred = config.LLM_PROVIDER === 'qwen';
  
  if (isQwenPreferred && config.VLLM_BASE_URL) {
    try {
      console.log('Generating catalog via Qwen...');
      return await generateCatalogQwen(imageUrl, transcript, artisanContext);
    } catch (e) {
      console.warn('Qwen catalog generation failed, falling back to Gemini:', e);
      if (config.GEMINI_API_KEY) {
        return await generateCatalogGemini(imageUrl, transcript, artisanContext);
      }
      throw e;
    }
  }

  if (config.GEMINI_API_KEY) {
    console.log('Generating catalog via Gemini...');
    return await generateCatalogGemini(imageUrl, transcript, artisanContext);
  }

  throw new AIServiceError('No AI provider configured for catalog generation. Please set VLLM_BASE_URL or GEMINI_API_KEY.');
};

export const generateBuyerSummary = async (requirementText: string): Promise<string> => {
  const isQwenPreferred = config.LLM_PROVIDER === 'qwen';

  if (isQwenPreferred && config.VLLM_BASE_URL) {
    try {
      return await generateTextQwen(requirementText, BUYER_SUMMARY_PROMPT);
    } catch (e) {
      console.warn('Qwen text generation failed, trying Gemini fallback:', e);
      if (config.GEMINI_API_KEY) {
        return await generateTextGemini(requirementText, BUYER_SUMMARY_PROMPT);
      }
      throw e;
    }
  }

  if (config.GEMINI_API_KEY) {
    return await generateTextGemini(requirementText, BUYER_SUMMARY_PROMPT);
  }

  throw new AIServiceError('No AI provider configured for text generation.');
};

export const generateMarketExplanation = async (opportunityData: Record<string, any>): Promise<string> => {
  const prompt = `Product: ${opportunityData.product}, Demand: ${opportunityData.demand}, Demand Score: ${opportunityData.demand_score}, Price Range: ${opportunityData.price_range}.`;
  const isQwenPreferred = config.LLM_PROVIDER === 'qwen';

  if (isQwenPreferred && config.VLLM_BASE_URL) {
    try {
      return await generateTextQwen(prompt, MARKET_EXPLANATION_PROMPT);
    } catch (e) {
      console.warn('Qwen text generation failed, trying Gemini fallback:', e);
      if (config.GEMINI_API_KEY) {
        return await generateTextGemini(prompt, MARKET_EXPLANATION_PROMPT);
      }
      throw e;
    }
  }

  if (config.GEMINI_API_KEY) {
    return await generateTextGemini(prompt, MARKET_EXPLANATION_PROMPT);
  }

  throw new AIServiceError('No AI provider configured for text generation.');
};
