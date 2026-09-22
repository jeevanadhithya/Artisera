import axios from 'axios';
import { config } from '../../config';
import { GeminiImageAnalysis, GeminiImageAnalysisSchema } from './types';
import { AIServiceError } from '../../types/errors';

export const GEMINI_IMAGE_ANALYSIS_PROMPT = `Analyze this uploaded artisan product photograph for professional e-commerce preparation.

Identify only information that is actually visible.

Determine, where visually possible:

- Product type
- Product category
- Craft type
- Material
- Visible colors
- Visible patterns
- Background quality
- Lighting quality
- Exposure
- Contrast
- White balance
- Sharpness
- Composition
- Product positioning
- Whether the product is centered
- Whether distracting objects are present
- Whether background cleanup is required
- Whether cropping is required
- Whether resizing is required

Do not invent information.

Do not alter or redesign the product.

The product's:
- shape
- proportions
- actual colors
- patterns
- embroidery
- weaving
- texture
- material
- decorations
- craftsmanship

must remain unchanged.

Generate only photographic enhancement instructions.

Return structured JSON containing:
- product information
- image quality analysis
- enhancement operations

Possible enhancement operations:

background_cleanup
background_removal
brightness_correction
contrast_adjustment
white_balance
mild_sharpening
noise_reduction
crop
center_product
resize
compression

Do not generate an image.
Do not invent missing product details.`;

const DEFAULT_ANALYSIS: GeminiImageAnalysis = {
  product: {
    type: 'Artisan Product',
    category: 'Handicraft',
    craftType: 'Traditional Craftsmanship',
    material: 'Natural Material',
    colors: ['Natural'],
  },
  imageQuality: {
    background: 'Neutral studio backdrop',
    lighting: 'Ambient lighting',
    exposure: 'Balanced',
    sharpness: 'Standard',
    composition: 'Product centered',
  },
  enhancement: {
    backgroundCleanup: true,
    backgroundRemoval: false,
    brightnessCorrection: true,
    contrastAdjustment: true,
    whiteBalance: true,
    sharpening: true,
    noiseReduction: false,
    crop: true,
    centerProduct: true,
    resize: true,
    compression: true,
  },
};

export class GeminiAnalysisProvider {
  private modelName: string;
  private apiKey: string;

  constructor() {
    this.modelName = config.GEMINI_MODEL || 'gemini-flash-lite-latest';
    this.apiKey = config.GEMINI_API_KEY || '';
  }

  public async analyzeImage(
    imageBytes: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<GeminiImageAnalysis> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using safe default image enhancement parameters.');
      return DEFAULT_ANALYSIS;
    }

    const mimeType = contentType.split(';')[0].trim().toLowerCase() || 'image/jpeg';
    const base64Data = imageBytes.toString('base64');

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: GEMINI_IMAGE_ANALYSIS_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            { text: 'Return structured JSON according to the schema.' },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            product: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                category: { type: 'STRING' },
                craftType: { type: 'STRING' },
                material: { type: 'STRING' },
                colors: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['type', 'category', 'craftType', 'material', 'colors'],
            },
            imageQuality: {
              type: 'OBJECT',
              properties: {
                background: { type: 'STRING' },
                lighting: { type: 'STRING' },
                exposure: { type: 'STRING' },
                sharpness: { type: 'STRING' },
                composition: { type: 'STRING' },
              },
              required: ['background', 'lighting', 'exposure', 'sharpness', 'composition'],
            },
            enhancement: {
              type: 'OBJECT',
              properties: {
                backgroundCleanup: { type: 'BOOLEAN' },
                backgroundRemoval: { type: 'BOOLEAN' },
                brightnessCorrection: { type: 'BOOLEAN' },
                contrastAdjustment: { type: 'BOOLEAN' },
                whiteBalance: { type: 'BOOLEAN' },
                sharpening: { type: 'BOOLEAN' },
                noiseReduction: { type: 'BOOLEAN' },
                crop: { type: 'BOOLEAN' },
                centerProduct: { type: 'BOOLEAN' },
                resize: { type: 'BOOLEAN' },
              },
              required: [
                'backgroundCleanup',
                'backgroundRemoval',
                'brightnessCorrection',
                'contrastAdjustment',
                'whiteBalance',
                'sharpening',
                'noiseReduction',
                'crop',
                'centerProduct',
                'resize',
              ],
            },
          },
          required: ['product', 'imageQuality', 'enhancement'],
        },
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      });

      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        console.warn('Gemini 2.5 Flash returned empty analysis, falling back to default settings.');
        return DEFAULT_ANALYSIS;
      }

      return this.parseAndValidateResponse(rawText);
    } catch (error: any) {
      console.warn(`Gemini 2.5 Flash visual analysis failed: ${error?.response?.status || error.message}. Using safe defaults.`);
      return DEFAULT_ANALYSIS;
    }
  }

  private tryRepairJson(jsonStr: string): any {
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
  }

  private parseAndValidateResponse(rawJson: string): GeminiImageAnalysis {
    let parsed: any = null;

    try {
      let cleaned = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch (e) {
      try {
        parsed = this.tryRepairJson(rawJson);
      } catch (repairErr) {
        console.warn('Failed to parse Gemini JSON output, applying default analysis.');
        return DEFAULT_ANALYSIS;
      }
    }

    try {
      const validated = GeminiImageAnalysisSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }

      return {
        product: {
          type: String(parsed?.product?.type || DEFAULT_ANALYSIS.product.type),
          category: String(parsed?.product?.category || DEFAULT_ANALYSIS.product.category),
          craftType: String(parsed?.product?.craftType || DEFAULT_ANALYSIS.product.craftType),
          material: String(parsed?.product?.material || DEFAULT_ANALYSIS.product.material),
          colors: Array.isArray(parsed?.product?.colors) ? parsed.product.colors.map(String) : DEFAULT_ANALYSIS.product.colors,
        },
        imageQuality: {
          background: String(parsed?.imageQuality?.background || DEFAULT_ANALYSIS.imageQuality.background),
          lighting: String(parsed?.imageQuality?.lighting || DEFAULT_ANALYSIS.imageQuality.lighting),
          exposure: String(parsed?.imageQuality?.exposure || DEFAULT_ANALYSIS.imageQuality.exposure),
          sharpness: String(parsed?.imageQuality?.sharpness || DEFAULT_ANALYSIS.imageQuality.sharpness),
          composition: String(parsed?.imageQuality?.composition || DEFAULT_ANALYSIS.imageQuality.composition),
        },
        enhancement: {
          backgroundCleanup: Boolean(parsed?.enhancement?.backgroundCleanup ?? true),
          backgroundRemoval: Boolean(parsed?.enhancement?.backgroundRemoval ?? false),
          brightnessCorrection: Boolean(parsed?.enhancement?.brightnessCorrection ?? true),
          contrastAdjustment: Boolean(parsed?.enhancement?.contrastAdjustment ?? true),
          whiteBalance: Boolean(parsed?.enhancement?.whiteBalance ?? true),
          sharpening: Boolean(parsed?.enhancement?.sharpening ?? true),
          noiseReduction: Boolean(parsed?.enhancement?.noiseReduction ?? false),
          crop: Boolean(parsed?.enhancement?.crop ?? true),
          centerProduct: Boolean(parsed?.enhancement?.centerProduct ?? true),
          resize: Boolean(parsed?.enhancement?.resize ?? true),
          compression: Boolean(parsed?.enhancement?.compression ?? true),
        },
      };
    } catch (sanitizationErr) {
      console.warn('Sanitization fallback applied:', sanitizationErr);
      return DEFAULT_ANALYSIS;
    }
  }
}

