/**
 * Test client-side QR scanner with real receipt image
 */

import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';
import { isKRAUrl, scrapeKRAInvoice } from '../lib/qr-scanner/kra-scraper';
import fs from 'fs';

async function testClientQR(imagePath: string) {
  console.log('🧪 Testing Client-Side QR Scanner');
  console.log('='.repeat(60));
  
  // Load image
  console.log('\n📥 Loading image...');
  const image = await loadImage(imagePath);
  console.log(`   ✓ Loaded ${image.width}x${image.height}px`);
  
  // Convert to ImageData format for jsQR
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  
  // Scan for QR code
  console.log('\n🔍 Scanning for QR code...');
  const startTime = Date.now();
  
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  
  const scanTime = Date.now() - startTime;
  console.log(`   ✓ Scan completed in ${scanTime}ms`);
  
  // Display results
  console.log('\n📊 RESULTS:');
  console.log('='.repeat(60));
  
  if (!code) {
    console.log('❌ No QR code found');
    return;
  }
  
  console.log('✅ QR code detected!\n');
  console.log(`📝 Raw Data:`);
  console.log(`   ${code.data}\n`);
  
  const isURL = code.data.startsWith('http');
  console.log(`🔗 Type: ${isURL ? 'URL' : 'Plain Text'}`);
  
  if (isURL) {
    console.log(`   URL: ${code.data}`);
    
    const isKRA = isKRAUrl(code.data);
    console.log(`   KRA Invoice: ${isKRA ? '✅ YES' : '❌ NO'}`);
    
    if (isKRA) {
      console.log('\n🌐 Scraping KRA data...');
      const kraStart = Date.now();
      const kraData = await scrapeKRAInvoice(code.data);
      const kraTime = Date.now() - kraStart;
      
      console.log(`   ✓ Scraping completed in ${kraTime}ms\n`);
      
      console.log('💰 KRA INVOICE DATA:');
      console.log('='.repeat(60));
      console.log(`   Status:            ${kraData.verified ? '✅ VERIFIED' : '❌ UNVERIFIED'}`);
      console.log(`   Invoice Number:    ${kraData.invoiceNumber || 'N/A'}`);
      console.log(`   Trader Invoice:    ${kraData.traderInvoiceNo || 'N/A'}`);
      console.log(`   Invoice Date:      ${kraData.invoiceDate || 'N/A'}`);
      console.log(`   Merchant:          ${kraData.merchantName || 'N/A'}`);
      console.log(`   Total Amount:      ${kraData.totalAmount ? `KES ${kraData.totalAmount.toFixed(2)}` : 'N/A'}`);
      console.log(`   Taxable Amount:    ${kraData.taxableAmount ? `KES ${kraData.taxableAmount.toFixed(2)}` : 'N/A'}`);
      console.log(`   VAT Amount:        ${kraData.vatAmount ? `KES ${kraData.vatAmount.toFixed(2)}` : 'N/A'}`);
      
      if (kraData.error) {
        console.log(`\n   ⚠️  Error: ${kraData.error}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed');
  console.log(`⏱️  Total time: ${Date.now() - startTime}ms`);
}

// Run test
const imagePath = process.argv[2] || '~/Downloads/WhatsApp Image 2025-12-22 at 03.47.32.jpeg';
const resolvedPath = imagePath.replace('~', process.env.HOME || '');

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ File not found: ${resolvedPath}`);
  process.exit(1);
}

testClientQR(resolvedPath).catch(console.error);
