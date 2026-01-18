import { BrowserQRCodeReader } from '@zxing/library';

export interface QRCodeData {
  rawText: string;
  url: string | null;
  // Parsed KRA QR data (if structured)
  invoiceNumber?: string;
  merchantPIN?: string;
  merchantName?: string;
  totalAmount?: number;
  dateTime?: string;
  tillNumber?: string;
  receiptNumber?: string;
  // Metadata
  source: 'qr_code';
  confidence: 100; // QR data is always 100% confident
}

export async function decodeQRFromImage(imageBuffer: Buffer): Promise<QRCodeData> {
  const codeReader = new BrowserQRCodeReader();

  // Convert buffer to base64 data URL
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  try {
    const result = await codeReader.decodeFromImageUrl(dataUrl);
    const qrText = result.getText();

    console.log('📱 QR Code decoded:', qrText.substring(0, 100));

    // Check if it's a KRA URL or structured data
    if (qrText.includes('itax.kra.go.ke')) {
      return {
        rawText: qrText,
        url: qrText,
        source: 'qr_code',
        confidence: 100,
      };
    }

    // Try to parse structured QR data (JSON or key-value pairs)
    const parsed = parseQRData(qrText);
    
    return {
      rawText: qrText,
      url: null,
      ...parsed,
      source: 'qr_code',
      confidence: 100,
    };
  } catch (error: any) {
    throw new Error('No QR code found on receipt');
  }
}

function parseQRData(qrText: string): Partial<QRCodeData> {
  try {
    // Try JSON format first
    const json = JSON.parse(qrText);
    return {
      invoiceNumber: json.invoice || json.invoiceNumber || json.inv,
      merchantPIN: json.pin || json.merchantPIN || json.tax_id,
      merchantName: json.merchant || json.name || json.business,
      totalAmount: parseFloat(json.amount || json.total || json.totalAmount || 0),
      dateTime: json.date || json.dateTime || json.timestamp,
      tillNumber: json.till || json.tillNumber,
      receiptNumber: json.receipt || json.receiptNumber,
    };
  } catch {
    // Try key-value format (e.g., "INV=123,AMT=5000,MERCHANT=Total")
    const data: any = {};
    const pairs = qrText.split(/[,;|]/);
    
    for (const pair of pairs) {
      const [key, value] = pair.split(/[=:]/);
      if (key && value) {
        const k = key.trim().toLowerCase();
        const v = value.trim();
        
        if (k.includes('inv') || k.includes('invoice')) data.invoiceNumber = v;
        if (k.includes('pin') || k.includes('tax')) data.merchantPIN = v;
        if (k.includes('merch') || k.includes('name')) data.merchantName = v;
        if (k.includes('amt') || k.includes('amount') || k.includes('total')) data.totalAmount = parseFloat(v);
        if (k.includes('date') || k.includes('time')) data.dateTime = v;
        if (k.includes('till')) data.tillNumber = v;
        if (k.includes('receipt') || k.includes('rcpt')) data.receiptNumber = v;
      }
    }
    
    return data;
  }
}
