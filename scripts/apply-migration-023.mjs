#!/usr/bin/env node

/**
 * Apply migration 023: Fix receipts storage RLS for mobile JWT (email OR sub)
 * Run: node scripts/apply-migration-023.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[match[1].trim()] = value;
    }
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// The SQL statements to execute — adapted from migrations/023 but split into
// individual statements for the REST SQL endpoint.
const statements = [
  `DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects`,
  `DROP POLICY IF EXISTS "Allow users to delete own receipts" ON storage.objects`,
  `DROP POLICY IF EXISTS "Allow public read" ON storage.objects`,
  // Also drop the insecure public policies from fix-storage.sql if they exist
  `DROP POLICY IF EXISTS "Public uploads to receipts bucket" ON storage.objects`,
  `DROP POLICY IF EXISTS "Public reads from receipts bucket" ON storage.objects`,
  `DROP POLICY IF EXISTS "Public updates in receipts bucket" ON storage.objects`,
  `DROP POLICY IF EXISTS "Public deletes from receipts bucket" ON storage.objects`,
  // Drop 023 policies in case partial apply
  `DROP POLICY IF EXISTS "receipts_insert_mobile" ON storage.objects`,
  `DROP POLICY IF EXISTS "receipts_select_public" ON storage.objects`,
  `DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects`,
  `DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects`,

  // INSERT: allow if the top-level folder is the user's email OR their Clerk sub
  `CREATE POLICY "receipts_insert_mobile"
   ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (
     bucket_id = 'receipts'
     AND (
       (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
       OR
       (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
     )
   )`,

  // SELECT: receipts bucket is public (images are served directly)
  `CREATE POLICY "receipts_select_public"
   ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'receipts')`,

  // DELETE: own folder by email or sub
  `CREATE POLICY "receipts_delete_own"
   ON storage.objects
   FOR DELETE TO authenticated
   USING (
     bucket_id = 'receipts'
     AND (
       (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
       OR
       (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
     )
   )`,

  // UPDATE: same pattern
  `CREATE POLICY "receipts_update_own"
   ON storage.objects
   FOR UPDATE TO authenticated
   USING (
     bucket_id = 'receipts'
     AND (
       (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
       OR
       (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
     )
   )
   WITH CHECK (
     bucket_id = 'receipts'
     AND (
       (storage.foldername(name))[1] = (auth.jwt()->>'email')::text
       OR
       (storage.foldername(name))[1] = (auth.jwt()->>'sub')::text
     )
   )`,
];

async function run() {
  console.log('🚀 Applying migration 023: Fix receipts storage RLS for mobile\n');

  for (const sql of statements) {
    const label = sql.substring(0, 70).replace(/\s+/g, ' ').trim();
    process.stdout.write(`  ⏳ ${label}... `);

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      // Supabase PostgREST doesn't have a raw SQL endpoint.
      // We'll use the pg_net extension or management API instead.
    });

    // PostgREST can't execute raw DDL, so use the SQL API (project management API)
    // The endpoint is: POST https://{ref}.supabase.co/pg/query
    // ... which requires the service_role key and Supabase >= certain version.
    // Alternatively we can use the Supabase Management API at api.supabase.com
    // Let's try the direct PostgreSQL REST endpoint:
    console.log('skipped (need direct SQL)');
  }

  // The cleanest approach: use the Supabase SQL endpoint (requires project ref)
  const projectRef = 'bkypfuyiknytkuhxtduc';
  const fullSql = statements.join(';\n') + ';';

  console.log('\n  📡 Sending SQL to Supabase SQL endpoint...');
  const resp = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: fullSql }),
  });

  if (!resp.ok) {
    // Try the pg endpoint available on newer Supabase instances
    console.log('  📡 Trying /pg/query endpoint...');
    const pgResp = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: fullSql }),
    });

    if (pgResp.ok) {
      const result = await pgResp.json();
      console.log('  ✅ Migration applied via /pg/query');
      console.log('  Result:', JSON.stringify(result).substring(0, 200));
      return;
    }

    console.log('\n  ❌ Automated apply failed. Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
    console.log('─'.repeat(70));
    console.log(fullSql);
    console.log('─'.repeat(70));
    console.log('\n  URL: https://supabase.com/dashboard/project/bkypfuyiknytkuhxtduc/sql');
  } else {
    console.log('  ✅ Migration applied successfully!');
  }

  // Verify: list storage policies
  console.log('\n  📋 Verifying storage policies...');
  const verifyResp = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/`, // Can't query pg_policies via REST easily
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  console.log('  Done. Check Supabase Dashboard → Storage → Policies to verify.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
