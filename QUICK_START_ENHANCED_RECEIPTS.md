# 🚀 QUICK START: Enhanced Receipt Processing System

## What This System Does

**Problem:** Receipts come in different formats, OCR is unreliable, no learning from past receipts.

**Solution:** Multi-strategy system that:
1. ✅ Stores raw data for later AI analysis
2. ✅ Recognizes stores automatically (GPS, KRA PIN, name matching)
3. ✅ Uses store-specific templates to parse receipts
4. ✅ Falls back to AI only when needed (saves costs)
5. ✅ Learns from user corrections
6. ✅ Verifies location and detects anomalies

## Installation (5 minutes)

### Step 1: Apply Database Schema

```bash
# Option A: Run migration script (recommended)
node scripts/migrate-to-enhanced-system.mjs

# Option B: Manual SQL execution
psql $DATABASE_URL < lib/supabase/enhanced-receipt-schema.sql
psql $DATABASE_URL < lib/supabase/seed-stores.sql
```

### Step 2: Update API Route

```bash
# Replace old route with enhanced version
mv app/api/receipts/upload/route-enhanced.ts \
   app/api/receipts/upload/route.ts
```

### Step 3: Environment Variables

Add to `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ENABLE_AI_ENHANCEMENT=true
AI_CONFIDENCE_THRESHOLD=70
```

### Step 4: Test

```bash
# Start dev server
npm run dev

# Upload a test receipt
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "image=@test-receipt.jpg" \
  -F "userEmail=test@example.com" \
  -F "latitude=-1.2921" \
  -F "longitude=36.8219"
```

## Usage Examples

### 1. Basic Upload (Frontend)

```typescript
// components/ReceiptUpload.tsx
async function uploadReceipt(file: File, location?: GeolocationCoordinates) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('userEmail', user.email);
  
  // Add GPS location if available
  if (location) {
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('locationAccuracy', location.accuracy.toString());
  }
  
  const response = await fetch('/api/receipts/upload', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Receipt processed:', result);
    
    // Show store match
    if (result.store) {
      alert(`Store recognized: ${result.store.name} (${result.store.confidence}% confidence)`);
    }
    
    // Show parsed data
    console.log('Parsed data:', result.data.parsed);
    
    // Show AI insights
    if (result.data.enhanced) {
      console.log('Category:', result.data.enhanced.category);
      console.log('Insights:', result.data.enhanced.insights);
    }
  } else {
    console.error('Processing failed:', result.errors);
  }
}
```

### 2. Export Raw Data for AI Analysis

```typescript
// Export to SQL-like text format
const response = await fetch(
  `/api/receipts/upload?id=${receiptId}&format=sql`
);
const sqlText = await response.text();

// Now you can:
// 1. Feed this to an AI for analysis
// 2. Import into data warehouse
// 3. Use for custom processing
console.log(sqlText);
/*
-- RAW RECEIPT DATA EXPORT
INSERT INTO qr_data (receipt_id, field, value) VALUES
  ('123', 'invoice', 'INV-001'),
  ('123', 'amount', '6640.23');

INSERT INTO ocr_text (receipt_id, full_text) VALUES
  ('123', 'TOTAL KENYA\n...');
*/
```

### 3. Manual Correction (Train the System)

```typescript
// User corrects a field
async function correctReceiptData(
  receiptId: string,
  field: string,
  correctValue: string
) {
  await fetch('/api/receipts/annotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiptId,
      field,
      correctedValue: correctValue,
      reason: 'OCR misread',
    }),
  });
  
  // System will:
  // 1. Update the template
  // 2. Improve future parsing
  // 3. Train AI model
}
```

### 4. Add Custom Store

```sql
-- Add your favorite store
INSERT INTO stores (
  name, 
  chain_name, 
  category, 
  kra_pin,
  latitude, 
  longitude, 
  address, 
  city
) VALUES (
  'My Local Store',
  'MyChain',
  'fuel',
  'A001234567X',
  -1.2921,
  36.8219,
  '123 Main Street',
  'Nairobi'
);

-- Create geofence (100m radius)
INSERT INTO store_geofences (store_id, center_lat, center_lng, radius_meters)
SELECT id, latitude, longitude, 100 
FROM stores 
WHERE name = 'My Local Store';
```

### 5. Add Custom Template

```typescript
// lib/receipt-processing/custom-templates.ts
import { templateRegistry } from './template-registry';

templateRegistry.register({
  id: 'my-store-fuel-v1',
  name: 'My Store Fuel Receipt',
  chainName: 'MyChain',
  receiptType: 'fuel',
  formatType: 'thermal',
  parserType: 'hybrid',
  active: true,
  
  fields: {
    invoiceNumber: {
      ocrPatterns: [/Invoice:\s*([A-Z0-9]+)/i],
      qrKeys: ['invoice'],
      required: true,
    },
    
    totalAmount: {
      ocrPatterns: [/Total:\s*([0-9,]+\.?[0-9]*)/i],
      dataType: 'currency',
      transform: (v) => parseFloat(String(v).replace(/,/g, '')),
      required: true,
    },
    
    litres: {
      ocrPatterns: [/([0-9.]+)\s*L/],
      requiredFor: ['fuel'],
      dataType: 'number',
    },
    
    // Add more fields...
  },
  
  validation: {
    requireKRAVerification: true,
    priceRanges: {
      'DIESEL': { min: 160, max: 220 }
    },
  },
});
```

## System Architecture

```
Receipt Image
    │
    ├─► QR Decode ──────────┐
    ├─► KRA Scrape ─────────┤
    ├─► Tesseract OCR ──────┼──► Raw Storage (SQL dump)
    └─► Gemini AI (if needed)│
                             │
                             ▼
                    Store Recognition
                    (GPS, PIN, name)
                             │
                             ▼
                    Template Matching
                    (store-specific parser)
                             │
                             ▼
                    AI Enhancement
                    (categorize, insights)
                             │
                             ▼
                    Structured Transaction
                    (ready for expense report)
```

## Key Benefits

### 1. Handles Any Format
- **Store Templates**: Total, Shell, Carrefour each have custom parsers
- **Fallback Chain**: Store → Chain → Category → Generic → AI
- **User Corrections**: System learns from mistakes

### 2. Cost Optimization
- **Free First**: QR (free) → OCR ($0.001/page)
- **AI Last Resort**: Only when confidence < 70% ($0.01-0.05/image)
- **Batch Processing**: Queue receipts for off-peak AI processing

### 3. Verifiable
- **KRA Integration**: 100% verified government data
- **GPS Verification**: Receipt location matches store
- **Duplicate Detection**: Image hash comparison

### 4. Audit Trail
- **Raw Storage**: Complete data dump for every receipt
- **Processing Logs**: Every step tracked
- **Reprocessing**: Apply new AI models to old receipts

## Common Tasks

### View Store Performance

```sql
SELECT * FROM store_metrics
WHERE total_receipts > 10
ORDER BY parse_success_rate DESC;
```

### Find Low-Confidence Receipts

```sql
SELECT * FROM receipt_complete
WHERE confidence_score < 70
  AND validation_status = 'pending'
ORDER BY created_at DESC;
```

### Track AI Costs

```sql
SELECT 
  DATE(created_at) as date,
  SUM(cost_usd) as daily_cost,
  COUNT(*) as api_calls
FROM receipt_processing_logs
WHERE stage = 'ai_enhance'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Export All Receipts from a Store

```sql
COPY (
  SELECT * FROM receipt_complete
  WHERE store_name = 'Total Westlands'
    AND created_at > '2025-01-01'
) TO '/tmp/total-receipts.csv' CSV HEADER;
```

## Troubleshooting

### Receipt Not Recognized

1. **Check QR Code**: Is QR visible and clear?
2. **Check GPS**: Did you provide location data?
3. **Check Store**: Is store in database? Run seed-stores.sql
4. **Check Template**: Does template exist for this store type?

### Low Confidence

1. **Image Quality**: Receipt blurry or crumpled?
2. **Force AI**: Add `forceAI=true` to request
3. **Manual Review**: Use correction API to train system

### High AI Costs

1. **Enable Caching**: Reuse results for similar receipts
2. **Batch Processing**: Process in off-peak hours
3. **Improve Templates**: Better templates = less AI needed
4. **Threshold Tuning**: Increase `AI_CONFIDENCE_THRESHOLD` to 80

## Next Steps

1. **Read Full Docs**: [MULTI_STRATEGY_RECEIPT_SYSTEM.md](./MULTI_STRATEGY_RECEIPT_SYSTEM.md)
2. **Add Your Stores**: Update `seed-stores.sql`
3. **Customize Templates**: Edit `template-registry.ts`
4. **Monitor Performance**: Check `store_metrics` view
5. **Train System**: Use correction API for edge cases

## Support

- **Issues**: Create GitHub issue with sample receipt
- **Template Help**: Share receipt format for custom template
- **Performance**: Check processing logs for bottlenecks

---

**Built with ❤️ for Kenyan businesses**

System handles: Total, Shell, Rubis, Engen, Carrefour, Naivas, Quickmart, KFC, Java House, and more!
