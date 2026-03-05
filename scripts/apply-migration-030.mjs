#!/usr/bin/env node

/**
 * Apply migration 030: Add is_default flag to workspaces
 * Run: node scripts/apply-migration-030.mjs
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

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

const migrationSql = fs.readFileSync(
  path.join(__dirname, '../migrations/030-add-is-default-workspace.sql'),
  'utf8'
);

async function run() {
  console.log('🚀 Applying migration 030: Add is_default flag to workspaces\n');

  // Try the /pg/query endpoint (available on newer Supabase instances)
  console.log('  📡 Sending SQL to Supabase...');

  const pgResp = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: migrationSql }),
  });

  if (pgResp.ok) {
    const result = await pgResp.json();
    console.log('  ✅ Migration applied successfully via /pg/query');
    console.log('  Result:', JSON.stringify(result).substring(0, 300));
    return;
  }

  // Fallback: print the SQL for manual application
  console.log('\n  ❌ Automated apply failed. Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
  console.log('─'.repeat(70));
  console.log(migrationSql);
  console.log('─'.repeat(70));
  console.log(`\n  URL: https://supabase.com/dashboard/project/${projectRef}/sql`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
