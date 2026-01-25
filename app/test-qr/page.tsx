'use client';

/**
 * Comprehensive Receipt Processor Test Page
 * 
 * Tests OCR + QR + structure extraction using Python processor
 */

import { useState } from 'react';

export default function QRTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [kraData, setKraData] = useState<any>(null);
  const [scrapingKRA, setScrapingKRA] = useState(false);

  async function scrapeKRAInvoice(url: string) {
    setScrapingKRA(true);
    try {
      const response = await fetch('/api/receipts/scrape-kra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape KRA invoice');
      }

      const result = await response.json();
      setKraData(result.data);
    } catch (error) {
      console.error('KRA scraping error:', error);
      setKraData({ error: 'Failed to fetch invoice data from KRA' });
    } finally {
      setScrapingKRA(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setKraData(null);
    
    // Show preview
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      const startTime = Date.now();
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // Call Python processor API
      const response = await fetch('/api/receipts/process-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      const data = await response.json();
      const totalTime = Date.now() - startTime;

      // Transform Python response to match UI expectations
      const processedResult = {
        fullText: data.ocr.full_text,
        confidence: data.ocr.confidence,
        lines: data.ocr.lines,
        qrCode: data.qr_codes.length > 0 ? {
          found: true,
          data: data.qr_codes[0].data,
          url: data.qr_codes[0].url,
          position: data.qr_codes[0].rect,
          isKRA: data.qr_codes[0].is_kra,
        } : { found: false },
        extractedFields: data.extracted_fields,
        processingTime: totalTime,
        imageSize: {
          width: data.image.width,
          height: data.image.height,
        },
        tables: data.tables,
        processingNotes: data.processing_notes,
      };

      setResult(processedResult);

      // If KRA QR code detected, automatically scrape the invoice
      if (processedResult.qrCode.found && processedResult.qrCode.isKRA && processedResult.qrCode.url) {
        await scrapeKRAInvoice(processedResult.qrCode.url);
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">QR Scanner Test</h1>
        <p className="text-gray-600 mb-8">
          Upload a receipt with QR code to test scanning
        </p>

        {/* File Input */}
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-12 h-12 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">Receipt image with QR code</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </label>

        {/* Loading */}
        {loading && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">� Processing receipt (OCR + QR + parsing)...</p>
            <p className="text-sm text-blue-600 mt-1">This may take 10-30 seconds</p>
          </div>
        )}

        {/* Image Preview */}
        {imageUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Uploaded Image</h2>
            <img
              src={imageUrl}
              alt="Receipt"
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold">Processing Results</h2>
            
            {result.error ? (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-800">❌ {result.error}</p>
              </div>
            ) : (
              <>
                {/* QR Code Section */}
                {result.qrCode && (
                  <div className={`p-6 rounded-lg ${result.qrCode.found ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <h3 className="text-lg font-semibold mb-3">
                      {result.qrCode.found ? '✅ QR Code Found' : '⚠️ No QR Code'}
                    </h3>
                    {result.qrCode.found && (
                      <div className="space-y-2">
                        {result.qrCode.url && (
                          <div>
                            <p className="text-sm font-medium text-gray-600">URL</p>
                            <a
                              href={result.qrCode.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all text-sm"
                            >
                              {result.qrCode.url}
                            </a>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-700">Raw Data</p>
                          <pre className="text-xs text-gray-900 bg-white p-3 rounded overflow-x-auto border border-gray-200 whitespace-pre-wrap break-words">
                            {result.qrCode.data}
                          </pre>
                        </div>
                        {result.qrCode.isKRA && (
                          <div className="p-3 bg-green-100 rounded border border-green-300">
                            <p className="text-green-900 text-sm font-medium mb-1">
                              🇰🇪 KRA Invoice Detected
                            </p>
                            {scrapingKRA && (
                              <p className="text-green-700 text-sm">
                                🔄 Fetching invoice data from KRA...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* KRA Invoice Data */}
                {kraData && (
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                    <h3 className="text-lg font-semibold mb-4 text-green-900">
                      🇰🇪 KRA Verified Invoice Data
                    </h3>
                    {kraData.error ? (
                      <div className="p-3 bg-red-100 rounded text-red-800 text-sm">
                        ❌ {kraData.error}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {kraData.invoiceNumber && (
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-gray-600">Invoice Number</p>
                            <p className="text-lg font-bold text-gray-900">{kraData.invoiceNumber}</p>
                          </div>
                        )}
                        {kraData.merchantName && (
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-gray-600">Merchant</p>
                            <p className="text-base font-semibold text-gray-900">{kraData.merchantName}</p>
                          </div>
                        )}
                        {kraData.totalAmount !== undefined && (
                          <div>
                            <p className="text-xs font-medium text-gray-600">Total Amount</p>
                            <p className="text-2xl font-bold text-green-700">
                              KES {kraData.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {kraData.vatAmount !== undefined && (
                          <div>
                            <p className="text-xs font-medium text-gray-600">VAT</p>
                            <p className="text-lg font-semibold text-gray-700">
                              KES {kraData.vatAmount.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {kraData.invoiceDate && (
                          <div>
                            <p className="text-xs font-medium text-gray-600">Date</p>
                            <p className="text-sm text-gray-900">{kraData.invoiceDate}</p>
                          </div>
                        )}
                        {kraData.traderInvoiceNo && (
                          <div>
                            <p className="text-xs font-medium text-gray-600">Trader Invoice #</p>
                            <p className="text-sm text-gray-900">{kraData.traderInvoiceNo}</p>
                          </div>
                        )}
                        {kraData.verified && (
                          <div className="col-span-2 mt-2 p-2 bg-green-200 rounded text-center">
                            <p className="text-green-900 font-medium text-sm">
                              ✓ Verified with KRA
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OCR Text Section */}
                <div className="p-6 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">📝 OCR Results</h3>
                  <p className="text-sm text-gray-700 mb-2 font-medium">
                    Confidence: {result.confidence?.toFixed(1)}%
                  </p>
                  {result.confidence < 50 && (
                    <div className="mb-3 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
                      ⚠️ Low confidence - Image quality may be poor. KRA data above is more reliable.
                    </div>
                  )}
                  <pre className="text-sm text-gray-900 bg-white p-4 rounded overflow-x-auto max-h-96 border border-gray-200 whitespace-pre-wrap break-words">
                    {result.fullText}
                  </pre>
                </div>

                {/* Extracted Fields */}
                {result.extractedFields && (
                  <div className="p-6 bg-purple-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">🧠 Extracted Data</h3>
                    <div className="space-y-2">
                      {result.extractedFields.merchantName && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Merchant</p>
                          <p className="text-gray-900">{result.extractedFields.merchantName}</p>
                        </div>
                      )}
                      {result.extractedFields.totalAmount && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Amount</p>
                          <p className="text-gray-900 text-xl font-bold">
                            KES {result.extractedFields.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {result.extractedFields.date && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Date</p>
                          <p className="text-gray-900">{result.extractedFields.date}</p>
                        </div>
                      )}
                      {result.extractedFields.items && result.extractedFields.items.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Line Items</p>
                          <div className="space-y-1">
                            {result.extractedFields.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                                <span>{item.name}</span>
                                <span className="font-medium">KES {item.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Stats */}
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                  ⏱️ Processing time: {result.processingTime}ms
                  {result.imageSize && result.imageSize.width > 0 && (
                    <> | 📐 Image: {result.imageSize.width}x{result.imageSize.height}px</>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Scans QR code using pyzbar (Python)</li>
            <li>• Extracts text using Tesseract OCR</li>
            <li>• Detects KRA invoices automatically</li>
            <li>• Scrapes verified data from KRA website</li>
            <li>• Combines QR + OCR for complete receipt data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
