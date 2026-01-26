/**
 * RECEIPT IMAGE PREPROCESSOR
 * 
 * Prepares receipt images for processing:
 * - Enhances quality
 * - Isolates QR code region
 * - Prepares for OCR
 */

export interface ProcessedReceiptImage {
  original: ImageData;
  enhanced: ImageData;
  qrRegion?: ImageData;  // Isolated QR code area (bottom ~20%)
  textRegion?: ImageData; // Main receipt body
}

/**
 * Process receipt image - enhance and segment for different processors
 */
export async function preprocessReceiptImage(
  imageBlob: Blob | File
): Promise<ProcessedReceiptImage> {
  const imageBitmap = await createImageBitmap(imageBlob);
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  // Get original image data
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0);
  const original = ctx.getImageData(0, 0, width, height);
  
  // Create enhanced version (better contrast, sharpness)
  const enhanced = enhanceImage(original);
  
  // Isolate QR region (bottom 25% of receipt)
  const qrRegion = extractRegion(imageBitmap, {
    x: 0,
    y: Math.floor(height * 0.75),
    width: width,
    height: Math.floor(height * 0.25),
  });
  
  // Isolate text region (top 75% of receipt)
  const textRegion = extractRegion(imageBitmap, {
    x: 0,
    y: 0,
    width: width,
    height: Math.floor(height * 0.75),
  });
  
  return {
    original,
    enhanced,
    qrRegion,
    textRegion,
  };
}

/**
 * Extract and enhance a specific region of the image
 */
function extractRegion(
  imageBitmap: ImageBitmap,
  region: { x: number; y: number; width: number; height: number }
): ImageData {
  const canvas = new OffscreenCanvas(region.width, region.height);
  const ctx = canvas.getContext('2d')!;
  
  // Draw the region
  ctx.drawImage(
    imageBitmap,
    region.x, region.y, region.width, region.height,
    0, 0, region.width, region.height
  );
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, region.width, region.height);
  
  // Apply enhancement
  return enhanceImage(imageData);
}

/**
 * Enhance image for better QR/OCR detection
 * - Increase contrast
 * - Sharpen edges
 * - Normalize brightness
 */
function enhanceImage(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const pixels = data.length / 4;
  
  // Step 1: Convert to grayscale and normalize
  for (let i = 0; i < pixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    // Grayscale using luminosity method
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply contrast enhancement (stretch histogram)
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
    
    data[idx] = enhanced;
    data[idx + 1] = enhanced;
    data[idx + 2] = enhanced;
    // Alpha stays same
  }
  
  // Step 2: Sharpen (simple 3x3 kernel)
  const sharpened = sharpenImage(data, imageData.width, imageData.height);
  
  return new ImageData(new Uint8ClampedArray(sharpened), imageData.width, imageData.height);
}

/**
 * Apply sharpening filter to enhance edges (helps QR detection)
 */
function sharpenImage(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  
  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = (y + ky) * width + (x + kx);
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          sum += data[px * 4] * weight;
        }
      }
      
      const value = Math.min(255, Math.max(0, sum));
      output[idx] = value;
      output[idx + 1] = value;
      output[idx + 2] = value;
      output[idx + 3] = 255;
    }
  }
  
  // Copy edges
  for (let i = 0; i < data.length; i += 4) {
    if (output[i] === 0 && output[i + 1] === 0 && output[i + 2] === 0) {
      output[i] = data[i];
      output[i + 1] = data[i + 1];
      output[i + 2] = data[i + 2];
      output[i + 3] = data[i + 3];
    }
  }
  
  return output;
}
