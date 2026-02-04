/**
 * AI POST-PROCESSING & CATEGORIZATION
 * 
 * Takes raw receipt data and intelligently organizes, categorizes,
 * and enhances it using AI. This runs AFTER initial extraction.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ReceiptTemplate } from './template-registry';

export interface AIEnhancedData {
  // Categorization
  category: string; // fuel, grocery, restaurant, retail, service
  subcategory?: string; // diesel_fuel, groceries_fresh, fast_food
  tags: string[]; // ['fuel', 'diesel', 'business_expense']
  
  // Extracted entities
  items?: Array<{
    name: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice: number;
    category?: string;
  }>;
  
  // Enhanced fields
  merchantType?: string; // gas_station, supermarket, restaurant
  paymentType?: string; // cash, card, mobile_money
  tripPurpose?: string; // business, personal, commute
  
  // Smart insights
  insights: string[]; // ["Fuel price above average", "Weekend purchase"]
  anomalies: string[]; // ["Unusual purchase location", "High amount"]
  
  // Confidence
  confidence: number; // 0-100
  enhancedFields: string[]; // List of fields that were enhanced
}

export interface CategoryRule {
  name: string;
  keywords: string[];
  merchantPatterns: RegExp[];
  priceRangeMin?: number;
  priceRangeMax?: number;
}

/**
 * AI-powered receipt enhancement
 */
export class AIReceiptEnhancer {
  private genAI: GoogleGenerativeAI;
  private categoryRules: CategoryRule[];
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.categoryRules = this.buildCategoryRules();
  }
  
  /**
   * Enhance receipt data with AI analysis
   */
  async enhance(data: {
    rawOcrText?: string;
    qrData?: any;
    kraData?: any;
    parsedData?: any;
    template?: ReceiptTemplate;
    imageBuffer?: Buffer;
  }): Promise<AIEnhancedData> {
    // Phase 1: Rule-based categorization (fast, no API cost)
    const ruleBasedCategory = this.categorizeByRules(data);
    
    // Phase 2: AI-powered enhancement (if needed)
    if (ruleBasedCategory.confidence < 70 || data.imageBuffer) {
      const aiCategory = await this.categorizeWithAI(data);
      
      // Merge results, preferring AI for low-confidence rule-based
      return this.mergeCategories(ruleBasedCategory, aiCategory);
    }
    
    return ruleBasedCategory;
  }
  
  /**
   * Rule-based categorization (fast, no API calls)
   */
  private categorizeByRules(data: any): AIEnhancedData {
    const result: AIEnhancedData = {
      category: 'Fuel',
      tags: [],
      insights: [],
      anomalies: [],
      confidence: 50,
      enhancedFields: [],
    };
    
    const text = [
      data.rawOcrText || '',
      data.kraData?.merchantName || '',
      data.qrData?.merchantName || '',
      data.parsedData?.merchantName || '',
    ].join(' ').toLowerCase();
    
    // Check against category rules
    for (const rule of this.categoryRules) {
      let matches = 0;
      
      // Keyword matching
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      
      // Pattern matching
      for (const pattern of rule.merchantPatterns) {
        if (pattern.test(text)) {
          matches += 2; // Patterns are stronger signals
        }
      }
      
      // If strong match, assign category
      if (matches >= 2) {
        result.category = rule.name;
        result.confidence = Math.min(85, 50 + matches * 10);
        result.tags.push(rule.name);
        break;
      }
    }
    
    // Fuel-specific enhancements
    if (result.category === 'fuel' || text.includes('litre') || text.includes('pump')) {
      result.category = 'fuel';
      result.subcategory = this.detectFuelType(text);
      result.merchantType = 'gas_station';
      result.tags.push('fuel', result.subcategory || 'unknown');
      result.confidence = Math.max(result.confidence, 75);
      
      // Fuel-specific insights
      if (data.parsedData?.litres) {
        const pricePerLitre = data.parsedData.totalAmount / data.parsedData.litres;
        if (pricePerLitre > 200) {
          result.insights.push('High fuel price per litre');
        } else if (pricePerLitre < 160) {
          result.insights.push('Low fuel price per litre');
        }
        
        if (data.parsedData.litres > 50) {
          result.insights.push('Large fuel purchase');
          result.tags.push('bulk_purchase');
        }
      }
    }
    
    // Grocery-specific enhancements
    if (result.category === 'grocery') {
      result.merchantType = 'supermarket';
      result.tags.push('grocery', 'shopping');
      
      // Detect time-based insights
      const date = new Date(data.parsedData?.transactionDate || Date.now());
      if (date.getDay() === 0 || date.getDay() === 6) {
        result.insights.push('Weekend shopping');
      }
    }
    
    // Amount-based anomalies
    if (data.parsedData?.totalAmount) {
      const amount = data.parsedData.totalAmount;
      
      if (amount > 10000) {
        result.anomalies.push('High transaction amount (>10K KES)');
      }
      
      if (amount < 10) {
        result.anomalies.push('Very small transaction (<10 KES)');
      }
    }
    
    return result;
  }
  
  /**
   * AI-powered categorization and extraction
   */
  private async categorizeWithAI(data: any): Promise<AIEnhancedData> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Build context for AI
    const context = {
      ocrText: data.rawOcrText,
      merchantName: data.kraData?.merchantName || data.qrData?.merchantName,
      totalAmount: data.parsedData?.totalAmount || data.kraData?.totalAmount,
      date: data.parsedData?.transactionDate,
      category: data.template?.receiptType,
    };
    
    const prompt = `You are analyzing a Kenyan receipt to categorize and extract insights.

RECEIPT DATA:
${JSON.stringify(context, null, 2)}

RAW OCR TEXT:
${context.ocrText || 'Not available'}

TASK: Analyze this receipt and return a JSON object with:
1. Primary category: fuel, grocery, restaurant, retail, service, or other
2. Subcategory (be specific, e.g., "diesel_fuel", "groceries_fresh", "fast_food")
3. Tags (array of relevant tags)
4. Merchant type (e.g., "gas_station", "supermarket", "restaurant")
5. Payment type if detectable (cash, card, mpesa, etc.)
6. Itemized list (if receipt shows multiple items)
7. Insights (array of interesting observations)
8. Anomalies (anything unusual)
9. Confidence score (0-100)

Return ONLY valid JSON, no markdown:
{
  "category": "fuel",
  "subcategory": "diesel_fuel",
  "tags": ["fuel", "diesel", "business_expense"],
  "merchantType": "gas_station",
  "paymentType": "mpesa",
  "items": [
    {"name": "Diesel", "quantity": 37.62, "unitPrice": 176.50, "totalPrice": 6640.23, "category": "fuel"}
  ],
  "insights": ["Fuel price within normal range", "Large tank fill"],
  "anomalies": [],
  "confidence": 85
}`;
    
    try {
      // If we have image, use vision
      if (data.imageBuffer) {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: data.imageBuffer.toString('base64'),
            },
          },
        ]);
        
        const responseText = result.response.text();
        return this.parseAIResponse(responseText);
      } else {
        // Text-only
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return this.parseAIResponse(responseText);
      }
    } catch (error) {
      console.error('AI categorization failed:', error);
      
      // Fallback
      return {
        category: 'Fuel',
        tags: [],
        insights: [],
        anomalies: ['AI processing failed'],
        confidence: 30,
        enhancedFields: [],
      };
    }
  }
  
  /**
   * Parse AI response to AIEnhancedData
   */
  private parseAIResponse(responseText: string): AIEnhancedData {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        category: parsed.category || 'other',
        subcategory: parsed.subcategory,
        tags: parsed.tags || [],
        items: parsed.items,
        merchantType: parsed.merchantType,
        paymentType: parsed.paymentType,
        tripPurpose: parsed.tripPurpose,
        insights: parsed.insights || [],
        anomalies: parsed.anomalies || [],
        confidence: parsed.confidence || 60,
        enhancedFields: Object.keys(parsed),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        category: 'Fuel',
        tags: [],
        insights: [],
        anomalies: ['AI response parsing failed'],
        confidence: 30,
        enhancedFields: [],
      };
    }
  }
  
  /**
   * Merge rule-based and AI categorization
   */
  private mergeCategories(
    ruleBased: AIEnhancedData,
    ai: AIEnhancedData
  ): AIEnhancedData {
    // Prefer higher confidence result for category
    const category = ai.confidence > ruleBased.confidence ? ai.category : ruleBased.category;
    
    return {
      category,
      subcategory: ai.subcategory || ruleBased.subcategory,
      tags: Array.from(new Set([...ruleBased.tags, ...ai.tags])),
      items: ai.items,
      merchantType: ai.merchantType || ruleBased.merchantType,
      paymentType: ai.paymentType || ruleBased.paymentType,
      tripPurpose: ai.tripPurpose || ruleBased.tripPurpose,
      insights: Array.from(new Set([...ruleBased.insights, ...ai.insights])),
      anomalies: Array.from(new Set([...ruleBased.anomalies, ...ai.anomalies])),
      confidence: Math.max(ai.confidence, ruleBased.confidence),
      enhancedFields: Array.from(new Set([...ruleBased.enhancedFields, ...ai.enhancedFields])),
    };
  }
  
  /**
   * Detect fuel type from text
   */
  private detectFuelType(text: string): string | undefined {
    if (text.includes('diesel') || text.includes('ago')) return 'diesel_fuel';
    if (text.includes('petrol') || text.includes('pms')) return 'petrol_fuel';
    if (text.includes('super')) return 'super_fuel';
    if (text.includes('kerosene') || text.includes('dpk')) return 'kerosene';
    if (text.includes('gas') || text.includes('lpg')) return 'gas';
    return undefined;
  }
  
  /**
   * Build category rules
   */
  private buildCategoryRules(): CategoryRule[] {
    return [
      {
        name: 'fuel',
        keywords: ['fuel', 'petrol', 'diesel', 'litre', 'pump', 'nozzle', 'ago', 'pms'],
        merchantPatterns: [
          /total/i,
          /shell/i,
          /rubis/i,
          /engen/i,
          /vivo/i,
          /oil/i,
        ],
      },
      {
        name: 'grocery',
        keywords: ['supermarket', 'grocery', 'carrefour', 'naivas', 'quickmart', 'chandarana'],
        merchantPatterns: [
          /carrefour/i,
          /naivas/i,
          /quickmart/i,
          /tuskys/i,
        ],
      },
      {
        name: 'restaurant',
        keywords: ['restaurant', 'cafe', 'hotel', 'food', 'coffee', 'meal'],
        merchantPatterns: [
          /restaurant/i,
          /hotel/i,
          /cafe/i,
          /pizza/i,
          /chicken/i,
        ],
      },
      {
        name: 'retail',
        keywords: ['shop', 'store', 'boutique', 'mall'],
        merchantPatterns: [
          /boutique/i,
          /store/i,
          /mall/i,
        ],
      },
      {
        name: 'service',
        keywords: ['service', 'repair', 'maintenance', 'wash'],
        merchantPatterns: [
          /service/i,
          /repair/i,
          /car\s*wash/i,
        ],
      },
    ];
  }
}

// Export singleton
export const aiReceiptEnhancer = new AIReceiptEnhancer();
