/**
 * RECEIPT TEMPLATE REGISTRY
 * 
 * Manages different receipt formats and parsing strategies.
 * Supports multi-format receipts with store-specific templates.
 */

export interface FieldExtractor {
  ocrPatterns?: RegExp[]; // Patterns to find field in OCR text
  qrKeys?: string[]; // Keys in QR code data
  kraField?: string; // Field name in KRA response
  required?: boolean;
  requiredFor?: string[]; // Categories where this is required
  dataType?: 'text' | 'number' | 'currency' | 'date' | 'time' | 'datetime';
  validation?: 'positive_number' | 'alphanumeric' | 'phone' | 'email' | 'pin' | string;
  transform?: (value: any) => any; // Custom transformation
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  version: number;
  storeId?: string;
  chainName?: string; // Apply to all stores in chain
  receiptType: 'fuel' | 'grocery' | 'restaurant' | 'retail' | 'service' | 'other';
  formatType: 'thermal' | 'a4' | 'digital' | 'kra_compliant';
  parserType: 'qr_primary' | 'ocr_structured' | 'ocr_freeform' | 'ai_vision' | 'hybrid';
  
  // Field extraction rules
  fields: Record<string, FieldExtractor>;
  
  // Validation rules
  validation?: {
    requireKRAVerification?: boolean;
    requireQRCode?: boolean;
    priceRanges?: Record<string, { min: number; max: number }>;
    amountTolerance?: number;
    customValidators?: Array<(data: any) => { valid: boolean; message?: string }>;
  };
  
  // Parser configuration
  parserConfig?: {
    ocrPreprocessing?: 'denoise' | 'deskew' | 'enhance' | 'all';
    ocrEngine?: 'tesseract' | 'gemini' | 'both';
    aiPrompt?: string; // Custom prompt for AI parsing
    confidenceThreshold?: number;
  };
  
  // Performance tracking
  active: boolean;
  successRate?: number;
  avgConfidence?: number;
  totalUses?: number;
}

/**
 * Template Registry - Central store for all receipt templates
 */
export class TemplateRegistry {
  private templates: Map<string, ReceiptTemplate> = new Map();
  
  constructor() {
    this.registerDefaultTemplates();
  }
  
  /**
   * Register a new template
   */
  register(template: ReceiptTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Get template by ID
   */
  get(id: string): ReceiptTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * Get all templates for a store
   */
  getByStore(storeId: string): ReceiptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.storeId === storeId && t.active
    );
  }
  
  /**
   * Get all templates for a chain
   */
  getByChain(chainName: string): ReceiptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.chainName?.toLowerCase() === chainName.toLowerCase() && t.active
    );
  }
  
  /**
   * Get templates by receipt type
   */
  getByType(receiptType: string): ReceiptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.receiptType === receiptType && t.active
    );
  }
  
  /**
   * Get all active templates
   */
  getAll(): ReceiptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.active);
  }
  
  /**
   * Update template performance metrics
   */
  updateMetrics(templateId: string, metrics: {
    successRate?: number;
    avgConfidence?: number;
    totalUses?: number;
  }): void {
    const template = this.templates.get(templateId);
    if (template) {
      Object.assign(template, metrics);
    }
  }
  
  /**
   * Register default templates for common Kenyan stores
   */
  private registerDefaultTemplates(): void {
    // ========================================
    // FUEL STATION TEMPLATES
    // ========================================
    
    // Total Kenya - Fuel Receipt
    this.register({
      id: 'total-kenya-fuel-v1',
      name: 'Total Kenya Fuel Receipt',
      version: 1,
      chainName: 'Total',
      receiptType: 'fuel',
      formatType: 'thermal',
      parserType: 'hybrid',
      active: true,
      
      fields: {
        invoiceNumber: {
          ocrPatterns: [
            /Invoice\s*No[.:]?\s*([A-Z0-9]+)/i,
            /INV[#:]?\s*([A-Z0-9]+)/i,
          ],
          qrKeys: ['invoice', 'inv_no', 'invoiceNumber'],
          kraField: 'Control Unit Invoice Number',
          required: true,
          dataType: 'text',
          validation: 'alphanumeric',
        },
        
        totalAmount: {
          ocrPatterns: [
            /TOTAL[:\s]*KES?\s*([0-9,]+\.?[0-9]*)/i,
            /Amount[:\s]*([0-9,]+\.?[0-9]*)/i,
          ],
          qrKeys: ['amount', 'total', 'totalAmount'],
          kraField: 'Total Invoice Amount',
          required: true,
          dataType: 'currency',
          validation: 'positive_number',
          transform: (v) => parseFloat(String(v).replace(/,/g, '')),
        },
        
        litres: {
          ocrPatterns: [
            /([0-9]+\.?[0-9]*)\s*[Ll](?:itres?|trs?)/,
            /Volume[:\s]*([0-9.]+)/i,
            /QTY[:\s]*([0-9.]+)/i,
          ],
          qrKeys: ['qty', 'litres', 'volume', 'quantity'],
          requiredFor: ['fuel'],
          dataType: 'number',
          validation: 'positive_number',
          transform: (v) => parseFloat(v),
        },
        
        fuelType: {
          ocrPatterns: [
            /(?:Product|Fuel)[:\s]*(DIESEL|PETROL|SUPER|PMS|AGO)/i,
            /(DIESEL|PETROL|SUPER|PMS|AGO)\s*[0-9]/i,
          ],
          qrKeys: ['product', 'fuel_type', 'fuelType'],
          requiredFor: ['fuel'],
          dataType: 'text',
          transform: (v) => {
            const map: Record<string, string> = {
              'PMS': 'PETROL',
              'AGO': 'DIESEL',
              'DPK': 'KEROSENE',
            };
            return map[v?.toUpperCase()] || v?.toUpperCase();
          },
        },
        
        pricePerLitre: {
          ocrPatterns: [
            /(?:Price|Rate)[:\s]*([0-9]+\.?[0-9]*)/i,
            /([0-9]+\.?[0-9]*)\s*\/\s*[Ll]/,
          ],
          qrKeys: ['price_per_litre', 'rate', 'unitPrice'],
          dataType: 'currency',
          validation: 'positive_number',
        },
        
        pumpNumber: {
          ocrPatterns: [
            /Pump[:\s#]*([0-9A-Z]+)/i,
            /Nozzle[:\s#]*([0-9A-Z]+)/i,
          ],
          qrKeys: ['pump', 'pump_number', 'nozzle'],
          dataType: 'text',
        },
        
        vehicleNumber: {
          ocrPatterns: [
            /(?:Reg|Vehicle|Car)[:\s#]*([A-Z]{3}\s*[0-9]{3}[A-Z]?)/i,
            /([A-Z]{3}\s*[0-9]{3}[A-Z]?)/,
          ],
          qrKeys: ['vehicle', 'registration', 'plate'],
          dataType: 'text',
        },
        
        attendant: {
          ocrPatterns: [
            /Attendant[:\s]*([A-Za-z\s]+)/i,
            /Served\s*by[:\s]*([A-Za-z\s]+)/i,
          ],
          dataType: 'text',
        },
      },
      
      validation: {
        requireKRAVerification: true,
        requireQRCode: true,
        priceRanges: {
          'PETROL': { min: 170, max: 230 },
          'DIESEL': { min: 160, max: 220 },
          'SUPER': { min: 180, max: 240 },
        },
        amountTolerance: 0.01,
        customValidators: [
          (data) => {
            if (data.litres && data.totalAmount && data.pricePerLitre) {
              const calculated = data.litres * data.pricePerLitre;
              const diff = Math.abs(calculated - data.totalAmount);
              if (diff > 1) {
                return {
                  valid: false,
                  message: `Price calculation mismatch: ${data.litres} × ${data.pricePerLitre} ≠ ${data.totalAmount}`,
                };
              }
            }
            return { valid: true };
          },
        ],
      },
      
      parserConfig: {
        ocrPreprocessing: 'all',
        ocrEngine: 'both',
        confidenceThreshold: 70,
      },
    });
    
    // Shell Kenya - Fuel Receipt
    this.register({
      id: 'shell-kenya-fuel-v1',
      name: 'Shell Kenya Fuel Receipt',
      version: 1,
      chainName: 'Shell',
      receiptType: 'fuel',
      formatType: 'thermal',
      parserType: 'hybrid',
      active: true,
      
      fields: {
        // Similar to Total but with Shell-specific patterns
        invoiceNumber: {
          ocrPatterns: [
            /Receipt[:\s#]*([A-Z0-9]+)/i,
            /Trans[:\s#]*([A-Z0-9]+)/i,
          ],
          qrKeys: ['receipt', 'transaction', 'trans_id'],
          required: true,
        },
        
        totalAmount: {
          ocrPatterns: [
            /TOTAL[:\s]*([0-9,]+\.?[0-9]*)/i,
          ],
          qrKeys: ['amount', 'total'],
          required: true,
          dataType: 'currency',
          transform: (v) => parseFloat(String(v).replace(/,/g, '')),
        },
        
        litres: {
          ocrPatterns: [
            /([0-9]+\.?[0-9]*)\s*LTR/i,
            /Volume[:\s]*([0-9.]+)/i,
          ],
          requiredFor: ['fuel'],
          dataType: 'number',
        },
        
        fuelType: {
          ocrPatterns: [
            /(V-Power|FuelSave|Diesel)/i,
          ],
          transform: (v) => {
            const map: Record<string, string> = {
              'V-POWER': 'SUPER',
              'FUELSAVE': 'PETROL',
              'DIESEL': 'DIESEL',
            };
            return map[v?.toUpperCase()] || v?.toUpperCase();
          },
        },
      },
      
      validation: {
        requireKRAVerification: true,
        priceRanges: {
          'PETROL': { min: 170, max: 230 },
          'DIESEL': { min: 160, max: 220 },
          'SUPER': { min: 180, max: 240 },
        },
      },
    });
    
    // ========================================
    // GROCERY STORE TEMPLATES
    // ========================================
    
    // Carrefour Receipt
    this.register({
      id: 'carrefour-kenya-v1',
      name: 'Carrefour Kenya Receipt',
      version: 1,
      chainName: 'Carrefour',
      receiptType: 'grocery',
      formatType: 'thermal',
      parserType: 'ocr_structured',
      active: true,
      
      fields: {
        invoiceNumber: {
          ocrPatterns: [
            /Receipt[:\s#]*([A-Z0-9]+)/i,
          ],
          required: true,
        },
        
        totalAmount: {
          ocrPatterns: [
            /TOTAL[:\s]*KES?\s*([0-9,]+\.?[0-9]*)/i,
          ],
          required: true,
          dataType: 'currency',
          transform: (v) => parseFloat(String(v).replace(/,/g, '')),
        },
        
        tillNumber: {
          ocrPatterns: [
            /Till[:\s#]*([0-9]+)/i,
            /Cashier[:\s#]*([0-9]+)/i,
          ],
        },
        
        items: {
          // Will need special parsing for line items
          dataType: 'text',
        },
      },
      
      validation: {
        requireKRAVerification: false,
      },
      
      parserConfig: {
        ocrEngine: 'tesseract',
        ocrPreprocessing: 'enhance',
        aiPrompt: 'Extract itemized grocery list with quantities and prices',
      },
    });
    
    // ========================================
    // GENERIC TEMPLATES (Fallback)
    // ========================================
    
    // Generic KRA-compliant receipt
    this.register({
      id: 'generic-kra-v1',
      name: 'Generic KRA Receipt',
      version: 1,
      receiptType: 'other',
      formatType: 'kra_compliant',
      parserType: 'qr_primary',
      active: true,
      
      fields: {
        invoiceNumber: {
          qrKeys: ['invoice', 'inv_no'],
          kraField: 'Control Unit Invoice Number',
          required: true,
        },
        
        totalAmount: {
          qrKeys: ['amount', 'total'],
          kraField: 'Total Invoice Amount',
          required: true,
          dataType: 'currency',
        },
        
        merchantName: {
          qrKeys: ['merchant', 'business_name'],
          kraField: 'Supplier Name',
          required: true,
        },
      },
      
      validation: {
        requireKRAVerification: true,
        requireQRCode: true,
      },
    });
    
    // Generic OCR-based receipt (no QR)
    this.register({
      id: 'generic-ocr-v1',
      name: 'Generic OCR Receipt',
      version: 1,
      receiptType: 'other',
      formatType: 'thermal',
      parserType: 'ai_vision',
      active: true,
      
      fields: {
        merchantName: {
          ocrPatterns: [
            /^([A-Z][A-Za-z\s&]+)/m, // First line usually merchant
          ],
        },
        
        totalAmount: {
          ocrPatterns: [
            /TOTAL[:\s]*([0-9,]+\.?[0-9]*)/i,
            /Amount[:\s]*([0-9,]+\.?[0-9]*)/i,
          ],
          required: true,
          dataType: 'currency',
        },
      },
      
      validation: {
        requireKRAVerification: false,
      },
      
      parserConfig: {
        ocrEngine: 'gemini',
        aiPrompt: 'Extract all relevant transaction details from this receipt',
        confidenceThreshold: 50,
      },
    });
  }
}

// Singleton instance
export const templateRegistry = new TemplateRegistry();
