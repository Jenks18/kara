const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcons() {
  const sizes = [192, 512];
  
  // Create SVG with emerald gradient and white K
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#10b981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#34d399;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)" />
      <text x="256" y="340" font-family="-apple-system, BlinkMacSystemFont, sans-serif" 
            font-size="320" font-weight="bold" fill="white" text-anchor="middle">K</text>
    </svg>
  `;
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Created icon-${size}.png`);
  }
  
  console.log('✅ All icons created successfully!');
}

createIcons().catch(console.error);
