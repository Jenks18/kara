# Fix Expired Gemini API Key

## Problem
Your Gemini API key has expired:
```
GEMINI_API_KEY=AIzaSyCdQtKGUVXjUPgO2z8-QF4Fv1TEKfCksq0 ❌ EXPIRED
```

Error in logs:
```
API key expired. Please renew the API key.
```

## Solution

### Step 1: Get New Gemini API Key

1. Go to **Google AI Studio**: https://makersuite.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the new key (starts with `AIza...`)

### Step 2: Update Vercel (Production)

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project (`kara-psi-flame`)
3. Go to **Settings** → **Environment Variables**
4. Find `GEMINI_API_KEY` and click **Edit**
5. Paste your new API key
6. Click **Save**
7. **Redeploy** your app (or it will use the old key)

### Step 3: Update Local Development

Update your `.env.local` file:

```bash
# Replace the old key
GEMINI_API_KEY=AIza_YOUR_NEW_KEY_HERE
```

**IMPORTANT**: Never commit this file to git! It's already in `.gitignore`.

### Step 4: Verify It Works

Test locally:
```bash
npm run dev
# Go to http://localhost:3000 and scan a receipt
```

Check production:
```bash
# Watch Vercel logs
vercel logs
```

## Why Did This Happen?

Google Gemini API keys can expire if:
- Free tier quota exceeded
- Key was regenerated in Google AI Studio
- Account billing issue
- Security reasons (key was exposed in git)

## Prevention

1. **Never commit API keys** to git
2. **Use Vercel environment variables** for production
3. **Set up billing** in Google Cloud for higher quotas
4. **Monitor usage** in Google AI Studio dashboard

## What About Google Vision API?

Your **Google Vision API key is still working**:
```
GOOGLE_VISION_API_KEY=AIzaSyATpOjJfFs1ASPRgSfVAY1BuAFZCq2acbA ✅ WORKING
```

This is why your test page works - it uses Vision API, not Gemini!

## Current API Keys Status

| API Key | Purpose | Status |
|---------|---------|--------|
| `GEMINI_API_KEY` | AI categorization & enhancement | ❌ EXPIRED |
| `GOOGLE_VISION_API_KEY` | OCR text extraction | ✅ WORKING |

Both are needed for full receipt processing:
- **Vision API** = Extract text from image
- **Gemini API** = Understand and categorize the text
