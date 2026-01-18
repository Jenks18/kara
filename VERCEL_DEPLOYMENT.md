# 🚀 VERCEL DEPLOYMENT GUIDE

## Quick Deploy to Vercel

### Option 1: One-Click Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/kara)

1. Click the button above
2. Connect your GitHub account
3. Configure environment variables (see below)
4. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option 3: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure settings
5. Deploy

---

## ⚙️ Environment Variables Setup

### Required Variables

Add these in your Vercel project settings:

**Dashboard → Project → Settings → Environment Variables**

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Service (REQUIRED)
GEMINI_API_KEY=your-gemini-api-key
```

### Optional Variables

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Processing Configuration
ENABLE_AI_ENHANCEMENT=true
AI_CONFIDENCE_THRESHOLD=70
```

---

## 🗄️ Database Setup

### Step 1: Setup Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your credentials

### Step 2: Apply Database Schema

**Option A: Using Supabase Dashboard**
```
1. Go to SQL Editor in Supabase dashboard
2. Paste contents of lib/supabase/enhanced-receipt-schema.sql
3. Run the query
4. Paste contents of lib/supabase/seed-stores.sql
5. Run the query
```

**Option B: Using psql**
```bash
psql $DATABASE_URL < lib/supabase/enhanced-receipt-schema.sql
psql $DATABASE_URL < lib/supabase/seed-stores.sql
```

**Option C: Using migration script**
```bash
node scripts/migrate-to-enhanced-system.mjs
```

### Step 3: Configure Storage

1. Go to Supabase Dashboard → Storage
2. Create a bucket named `receipt-images`
3. Set as Public bucket
4. Configure RLS policies:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipt-images');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipt-images');
```

---

## 🔧 Vercel Configuration

### Project Settings

**Dashboard → Project → Settings → General**

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x or higher

### Function Configuration

**Dashboard → Project → Settings → Functions**

- **Max Duration**: 60 seconds (Pro plan required)
- **Memory**: 3008 MB (recommended for AI processing)
- **Region**: Auto (closest to users)

### Build & Development Settings

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

---

## 📦 Pre-Deployment Checklist

### Code Preparation

- [x] All dependencies in package.json
- [x] No hard-coded secrets
- [x] Environment variables documented
- [x] Database schema files ready
- [x] API routes configured for serverless

### Supabase Setup

- [ ] Project created
- [ ] Database schema applied
- [ ] Stores seeded
- [ ] Storage bucket created
- [ ] RLS policies configured
- [ ] Credentials copied

### Vercel Setup

- [ ] Repository connected
- [ ] Environment variables added
- [ ] Build settings configured
- [ ] Domain configured (optional)

### AI/API Keys

- [ ] Gemini API key obtained
- [ ] API key added to Vercel
- [ ] Usage limits verified

---

## 🧪 Testing After Deployment

### 1. Check Health

```bash
curl https://your-app.vercel.app/api/health
```

### 2. Test Receipt Upload

```bash
curl -X POST https://your-app.vercel.app/api/receipts/upload \
  -F "image=@test-receipt.jpg" \
  -F "userEmail=test@example.com" \
  -F "latitude=-1.2921" \
  -F "longitude=36.8219"
```

### 3. Verify Database

```sql
-- Check if data is being stored
SELECT COUNT(*) FROM raw_receipts;
SELECT COUNT(*) FROM stores;
SELECT * FROM store_metrics;
```

### 4. Monitor Performance

**Dashboard → Project → Analytics**

- Function duration
- Error rates
- API usage
- Memory consumption

---

## 🔍 Troubleshooting

### Build Fails

**Error: Module not found**
```bash
# Ensure all dependencies installed
npm install
npm run build
```

**Error: Out of memory**
```
Solution: Increase memory limit in vercel.json
"memory": 3008
```

### Runtime Errors

**Error: Timeout**
```
Solution: Increase maxDuration in vercel.json
"maxDuration": 60  // Requires Pro plan
```

**Error: Missing environment variable**
```
Solution: Add variable in Vercel dashboard
Settings → Environment Variables
```

### Database Connection

**Error: Connection failed**
```
Check: SUPABASE_URL and keys are correct
Verify: Supabase project is active
Test: Connect using psql directly
```

### AI/OCR Issues

**Error: Gemini API failed**
```
Check: GEMINI_API_KEY is valid
Verify: API quota not exceeded
Monitor: Google AI Studio dashboard
```

---

## 📊 Performance Optimization

### 1. Enable Caching

```typescript
// Add to API route
export const revalidate = 3600; // Cache for 1 hour
```

### 2. Optimize Images

Supabase storage automatically optimizes images. Ensure proper configuration:

```typescript
// Use Supabase image transformation
const optimizedUrl = `${imageUrl}?width=800&quality=80`;
```

### 3. Database Indexing

Ensure indexes are created (already in schema):
```sql
-- Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'raw_receipts';
```

### 4. Monitor Costs

**AI Usage (Gemini)**
- Track usage in Google Cloud Console
- Set budget alerts
- Optimize confidence threshold

**Supabase Usage**
- Monitor database size
- Set up backup schedule
- Review storage usage

---

## 🔐 Security Best Practices

### 1. API Keys

- ✅ Never commit API keys to git
- ✅ Use Vercel environment variables
- ✅ Rotate keys regularly
- ✅ Set up usage limits

### 2. Database Security

```sql
-- Enable RLS
ALTER TABLE raw_receipts ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users see own receipts" ON raw_receipts
  FOR SELECT USING (auth.uid() = user_email);
```

### 3. Rate Limiting

```typescript
// Add rate limiting to API routes
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

### 4. Input Validation

```typescript
// Validate file size and type
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large');
}

if (!['image/jpeg', 'image/png'].includes(file.type)) {
  throw new Error('Invalid file type');
}
```

---

## 📈 Monitoring & Analytics

### Vercel Analytics

Enable in dashboard:
- **Analytics**: Track page views, performance
- **Speed Insights**: Monitor Core Web Vitals
- **Logs**: View function logs in real-time

### Custom Monitoring

Add to receipt processing:

```typescript
// Track processing time
const startTime = Date.now();
// ... processing ...
const duration = Date.now() - startTime;

await supabase.from('processing_logs').insert({
  receipt_id: id,
  duration_ms: duration,
  stage: 'complete',
  status: 'success',
});
```

### Cost Tracking

Monitor in respective dashboards:
- **Vercel**: Function invocations, bandwidth
- **Supabase**: Database size, API requests
- **Google AI**: Gemini API calls
- **Total estimated cost**: $5-50/month depending on usage

---

## 🎯 Production Readiness

### Performance Targets

- ✅ API response time: < 3 seconds
- ✅ Success rate: > 95%
- ✅ Uptime: > 99.9%
- ✅ Error rate: < 1%

### Scaling

Vercel automatically scales:
- **Functions**: Scale to zero when idle
- **Bandwidth**: Auto-scaling CDN
- **Database**: Upgrade Supabase plan as needed

### Backup Strategy

```bash
# Automated database backups (Supabase)
# Daily automatic backups enabled by default

# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20260118.sql
```

---

## 🚀 Post-Deployment Steps

### 1. Configure Custom Domain

```
Dashboard → Project → Settings → Domains
Add your domain: receipts.yourdomain.com
```

### 2. Set Up Monitoring

- Enable Vercel Analytics
- Set up error notifications
- Configure Slack/Discord webhooks

### 3. User Onboarding

- Update documentation
- Create user guides
- Set up support channels

### 4. Performance Tuning

- Monitor function duration
- Optimize slow queries
- Adjust AI confidence threshold
- Review and update templates

---

## 📞 Support

- **Vercel Issues**: [vercel.com/support](https://vercel.com/support)
- **Supabase Issues**: [supabase.com/support](https://supabase.com/support)
- **System Issues**: Create GitHub issue

---

## 🎉 Success!

Your enhanced receipt processing system is now live on Vercel!

**Next Steps:**
1. Test with real receipts
2. Monitor performance
3. Add custom stores
4. Customize templates
5. Scale as needed

**Deployment URL**: https://your-app.vercel.app

**Documentation**: See README and other docs in `/docs`

---

Made with ❤️ for Kenyan businesses 🇰🇪
