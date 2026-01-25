#!/usr/bin/env node
/**
 * Test Receipt Upload
 * Tests the /api/receipts/upload endpoint with a dummy image
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a simple 1x1 pixel PNG (base64 encoded)
const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const dummyImageBuffer = Buffer.from(dummyImageBase64, 'base64');

async function testUpload() {
  console.log('🧪 Testing receipt upload API...\n');
  
  const url = process.env.API_URL || 'https://kara-psi-flame.vercel.app/api/receipts/upload';
  
  // Create form data
  const formData = new FormData();
  const blob = new Blob([dummyImageBuffer], { type: 'image/png' });
  formData.append('image', blob, 'test-receipt.png');
  formData.append('userEmail', 'test@example.com');
  formData.append('workspaceId', '00000000-0000-0000-0000-000000000000');
  
  console.log(`📤 Uploading to: ${url}`);
  console.log('   Email: test@example.com');
  console.log('   Image size:', dummyImageBuffer.length, 'bytes\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    console.log('📊 Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Failed!');
      console.error('\nError response:');
      console.error(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error(error.stack);
  }
}

testUpload();
