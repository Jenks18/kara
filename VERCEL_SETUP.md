# Vercel Deployment Setup

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### Navigate to:
1. Go to your Vercel project dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in the sidebar

### Add these variables:

**NEXT_PUBLIC_SUPABASE_URL**
```
https://bkypfuyiknytkuhxtduc.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo
```

**GEMINI_API_KEY** (optional - for OCR)
```
AIzaSyCdQtKGUVXjUPgO2z8-QF4Fv1TEKfCksq0
```

### Important Notes:

1. **Environment Scope**: Set all variables to apply to:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

2. **After Adding**: Redeploy your application:
   - Click "Deployments" tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"
   - Check "Use existing Build Cache" (optional)
   - Click "Redeploy"

3. **Verify**: After redeployment, open browser console and check for:
   ```
   🔧 Supabase Client Init: { hasUrl: true, hasKey: true, ... }
   ✅ isSupabaseConfigured: true
   ```

## Camera Permission Note

Camera permissions cannot be persisted across sessions in web browsers for security reasons. This is standard browser behavior and cannot be changed. Users will need to grant camera access each session.

However, once granted within a session, the permission persists until:
- User closes the browser tab
- User clears site data/cookies
- Browser is restarted

This is different from location permissions which can be remembered longer-term.

## Troubleshooting

If Supabase still shows as not configured:
1. Check variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. No extra spaces or quotes in Vercel dashboard
3. Redeploy after adding variables
4. Hard refresh browser (Cmd+Shift+R) after redeployment
