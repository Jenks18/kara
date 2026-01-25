/**
 * TEST SCRIPT: QR Processor
 * 
 * Tests the QR processor with a real receipt image
 * Run: npx tsx scripts/test-qr-processor.ts <image-url-or-path>
 */

import { qrProcessor } from '../lib/receipt-processing/processors/qr-processor';
import { qrStorage } from '../lib/receipt-processing/processors/qr-storage';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import https from 'https';
import http from 'http';

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
  });
}

async function testQRProcessor(imagePath: string) {
  console.log('🧪 Testing QR Processor');
  console.log('='.repeat(60));
  
  // Load image
  console.log('\n📥 Loading image...');
  let imageBuffer: Buffer;
  
  if (imagePath.startsWith('http')) {
    console.log(`   From URL: ${imagePath}`);
    imageBuffer = await downloadImage(imagePath);
  } else {
    console.log(`   From file: ${imagePath}`);
    imageBuffer = fs.readFileSync(imagePath);
  }
  
  console.log(`   ✓ Loaded ${imageBuffer.length} bytes`);
  
  // Process QR code
  console.log('\n🔍 Processing QR code...');
  const startTime = Date.now();
  const result = await qrProcessor.process(imageBuffer);
  const processingTime = Date.now() - startTime;
  
  console.log(`   ✓ Completed in ${processingTime}ms`);
  
  // Display results
  console.log('\n📊 RESULTS:');
  console.log('='.repeat(60));
  
  if (!result.found) {
    console.log('❌ No QR code found in image');
    return;
  }
  
  console.log('✅ QR code found!\n');
  
  console.log('📝 Raw Text:');
  console.log(`   ${result.rawText?.substring(0, 100)}${result.rawText && result.rawText.length > 100 ? '...' : ''}\n`);
  
  console.log(`🏷️  Data Type: ${result.dataType}`);
  
  if (result.url) {
    console.log(`🔗 URL: ${result.url}`);
    console.log(`   KRA URL: ${result.url.includes('itax.kra.go.ke') ? '✅ YES' : '❌ NO'}`);
  }
  
  if (result.scrapedData) {
    console.log('\n💰 KRA INVOICE DATA:');
    console.log('='.repeat(60));
    console.log(`   Invoice Number:    ${result.scrapedData.invoiceNumber || 'N/A'}`);
    console.log(`   Trader Invoice:    ${result.scrapedData.traderInvoiceNo || 'N/A'}`);
    console.log(`   Invoice Date:      ${result.scrapedData.invoiceDate || 'N/A'}`);
    console.log(`   Merchant:          ${result.scrapedData.merchantName || 'N/A'}`);
    console.log(`   Total Amount:      KES ${result.scrapedData.totalAmount?.toFixed(2) || 'N/A'}`);
    console.log(`   Taxable Amount:    KES ${result.scrapedData.taxableAmount?.toFixed(2) || 'N/A'}`);
    console.log(`   VAT Amount:        KES ${result.scrapedData.vatAmount?.toFixed(2) || 'N/A'}`);
    console.log(`   Verified:          ${result.scrapedData.verified ? '✅' : '❌'}`);
  }
  
  if (result.parsedFields) {
    console.log('\n📋 Parsed Fields:');
    console.log(JSON.stringify(result.parsedFields, null, 2));
  }
  
  // Test storage (if Supabase configured)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    console.log('\n💾 Testing storage...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
      const savedId = await qrStorage.save({
        userId: 'test-user',
        userEmail: 'test@example.com',
        receiptImageUrl: imagePath,
        qrResult: result,
        processingTimeMs: processingTime
      }, supabase);
      
      if (savedId) {
        console.log(`   ✅ Saved to database: ${savedId}`);
      } else {
        console.log('   ⚠️  Storage returned null (likely auth issue - run with real user context)');
      }
    } catch (error) {
      console.log(`   ⚠️  Storage test skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('\n⚠️  Supabase not configured - skipping storage test');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed');
}

// Run test
const imagePath = process.argv[2];
if (!imagePath) {
  console.error('Usage: npx tsx scripts/test-qr-processor.ts <image-url-or-path>');
  process.exit(1);
}

testQRProcessor(imagePath).catch(console.error);
