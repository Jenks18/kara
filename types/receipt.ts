// Receipt Data Structures

export interface KRAQRData {
  merchantPIN: string
  merchantName: string
  dateTime: string
  totalAmount: number
  invoiceNumber: string
  receiptNumber: string
  tillNumber?: string
  confidence: 100 // QR data is always 100% confident
}

export interface OCRExtractedData {
  litres?: number
  fuelType?: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | 'KEROSENE'
  pricePerLitre?: number
  merchantName?: string
  location?: string
  vehicleNumber?: string
  pumpNumber?: string
  attendantName?: string
  confidence: number // 0-100
}

export interface ReceiptProcessingResult {
  id: string
  imageUrl: string
  uploadedAt: Date
  processedAt?: Date
  status: 'uploading' | 'processing' | 'verified' | 'needs_review' | 'failed'
  
  // QR Code Data (High Confidence)
  qrData?: KRAQRData
  
  // OCR Extracted Data (Variable Confidence)
  ocrData?: OCRExtractedData
  
  // Merged Truth (Final Record)
  transaction?: FuelTransaction
  
  // Issues that need user attention
  issues?: ReceiptIssue[]
}

export interface FuelTransaction {
  id: string
  merchant: string
  merchantPIN: string
  location?: string
  date: Date
  time: string
  
  // Financial
  totalAmount: number
  litres: number
  pricePerLitre: number
  
  // Fuel Details
  fuelType: 'PETROL' | 'DIESEL' | 'SUPER' | 'GAS' | 'KEROSENE'
  
  // Vehicle/Trip
  vehicleNumber?: string
  odometer?: number
  pumpNumber?: string
  
  // KRA Compliance
  kraInvoiceNumber: string
  kraReceiptNumber: string
  tillNumber?: string
  
  // Validation
  validated: boolean
  confidence: number
  
  // Receipt Image
  receiptImageUrl: string
}

export interface ReceiptIssue {
  field: 'litres' | 'fuelType' | 'pricePerLitre' | 'vehicle'
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestedValue?: any
}

// Processing Algorithm Config
export const FUEL_PRICE_RANGE = {
  PETROL: { min: 170, max: 230 },
  DIESEL: { min: 160, max: 220 },
  SUPER: { min: 180, max: 240 },
  GAS: { min: 100, max: 150 },
  KEROSENE: { min: 140, max: 180 },
}

// Validation Logic
export function validateFuelPrice(
  total: number,
  litres: number,
  fuelType?: string
): { valid: boolean; calculatedPrice: number; confidence: number } {
  const calculatedPrice = total / litres
  
  if (!fuelType) {
    // General sanity check
    const valid = calculatedPrice >= 100 && calculatedPrice <= 250
    return { valid, calculatedPrice, confidence: valid ? 85 : 30 }
  }
  
  const range = FUEL_PRICE_RANGE[fuelType as keyof typeof FUEL_PRICE_RANGE]
  if (!range) return { valid: false, calculatedPrice, confidence: 0 }
  
  const valid = calculatedPrice >= range.min && calculatedPrice <= range.max
  const confidence = valid ? 99 : 20
  
  return { valid, calculatedPrice, confidence }
}
