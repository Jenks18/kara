// Vendor-specific receipt parsers
// Add new vendors and their parsing logic here

export interface ParsedReceipt {
  totalAmount: number | null;
  date: string | null;
  invoiceNumber: string | null;
  tax: number | null;
  merchantName: string | null;
}

const mascotPetroleumParser = (text: string): ParsedReceipt => {
  // Example for MASCOT PETROLEUM
  const totalMatch = text.match(/TOTAL\s+([\d,]+\.\d{2})/i);
  const dateMatch = text.match(/Date[:\s]+([\d\/-]+)/i);
  const invoiceMatch = text.match(/Invoice\s*(?:Nr|No|Number|#)?[:\s]*([\w\d]+)/i);
  const taxMatch = text.match(/TOTAL TAX\s+([\d,]+\.\d{2})/i);
  const merchantMatch = text.match(/MASCOT PETROLEUM/i);
  return {
    totalAmount: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : null,
    date: dateMatch ? dateMatch[1] : null,
    invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
    tax: taxMatch ? parseFloat(taxMatch[1].replace(/,/g, "")) : null,
    merchantName: merchantMatch ? "MASCOT PETROLEUM" : null,
  };
};

export const vendorParsers: Record<string, (text: string) => ParsedReceipt> = {
  "MASCOT PETROLEUM": mascotPetroleumParser,
  // Add more vendors here
};

export function parseReceiptByVendor(merchant: string, text: string): ParsedReceipt {
  const parser = vendorParsers[merchant.toUpperCase()];
  if (parser) return parser(text);
  // fallback: return nulls or use generic parser
  return {
    totalAmount: null,
    date: null,
    invoiceNumber: null,
    tax: null,
    merchantName: merchant,
  };
}
