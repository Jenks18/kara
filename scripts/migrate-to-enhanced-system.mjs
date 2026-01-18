#!/usr/bin/env node

/**
 * Migration Script: Old System → Enhanced Multi-Strategy System
 * 
 * Run this to migrate existing receipt data to the new schema
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🚀 Starting migration to enhanced receipt system...\n');
  
  // Step 1: Apply schema
  console.log('📋 Step 1: Applying new schema...');
  await applySchema();
  
  // Step 2: Seed stores
  console.log('\n🏪 Step 2: Seeding store data...');
  await seedStores();
  
  // Step 3: Migrate existing receipts (optional)
  console.log('\n📦 Step 3: Migrating existing receipt data...');
  const shouldMigrate = process.argv.includes('--migrate-data');
  
  if (shouldMigrate) {
    await migrateExistingReceipts();
  } else {
    console.log('⏭️  Skipping data migration (use --migrate-data to enable)');
  }
  
  // Step 4: Verify
  console.log('\n✅ Step 4: Verifying installation...');
  await verify();
  
  console.log('\n🎉 Migration complete!');
  console.log('\n📚 Next steps:');
  console.log('1. Review the new schema: lib/supabase/enhanced-receipt-schema.sql');
  console.log('2. Read the docs: MULTI_STRATEGY_RECEIPT_SYSTEM.md');
  console.log('3. Update your API route: app/api/receipts/upload/route.ts');
  console.log('4. Test with a receipt upload\n');
}

async function applySchema() {
  const schemaPath = path.join(process.cwd(), 'lib/supabase/enhanced-receipt-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split by statement and execute
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`   Executing ${statements.length} SQL statements...`);
  
  let success = 0;
  let failed = 0;
  
  for (const statement of statements) {
    try {
      await supabase.rpc('exec_sql', { sql_query: statement });
      success++;
    } catch (error: any) {
      // Ignore "already exists" errors
      if (!error.message?.includes('already exists')) {
        console.error(`   ⚠️  Statement failed: ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log(`   ✓ ${success} statements executed, ${failed} failed`);
}

async function seedStores() {
  const seedPath = path.join(process.cwd(), 'lib/supabase/seed-stores.sql');
  
  if (!fs.existsSync(seedPath)) {
    console.error('❌ Seed file not found:', seedPath);
    return;
  }
  
  const seed = fs.readFileSync(seedPath, 'utf8');
  
  // Execute seed file
  const statements = seed
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.toLowerCase().includes('insert'));
  
  console.log(`   Seeding ${statements.length} stores...`);
  
  let inserted = 0;
  
  for (const statement of statements) {
    try {
      await supabase.rpc('exec_sql', { sql_query: statement });
      inserted++;
    } catch (error: any) {
      // Ignore duplicates
      if (!error.message?.includes('duplicate') && !error.message?.includes('already exists')) {
        console.error(`   ⚠️  Insert failed: ${error.message}`);
      }
    }
  }
  
  console.log(`   ✓ ${inserted} stores seeded`);
}

async function migrateExistingReceipts() {
  // Migrate from old expense_items table
  const { data: oldReceipts, error } = await supabase
    .from('expense_items')
    .select('*')
    .limit(100);
  
  if (error || !oldReceipts) {
    console.log('   No old receipts found to migrate');
    return;
  }
  
  console.log(`   Found ${oldReceipts.length} old receipts`);
  
  let migrated = 0;
  
  for (const old of oldReceipts) {
    try {
      // Create raw receipt entry
      const { data: raw } = await supabase
        .from('raw_receipts')
        .insert({
          user_email: old.user_email || 'unknown@example.com',
          image_url: old.image_url,
          processing_status: 'parsed', // Already processed
          raw_ocr_text: old.description,
          latitude: old.latitude,
          longitude: old.longitude,
        })
        .select('id')
        .single();
      
      if (raw) {
        // Create parsed receipt
        await supabase.from('parsed_receipts').insert({
          raw_receipt_id: raw.id,
          merchant_name: old.merchant_name,
          total_amount: old.amount,
          transaction_date: old.transaction_date,
          confidence_score: 50, // Unknown confidence
          validation_status: 'validated', // Was already approved
        });
        
        migrated++;
      }
    } catch (error: any) {
      console.error(`   ⚠️  Migration failed for receipt ${old.id}: ${error.message}`);
    }
  }
  
  console.log(`   ✓ ${migrated} receipts migrated`);
}

async function verify() {
  // Check tables exist
  const tables = [
    'raw_receipts',
    'stores',
    'receipt_templates',
    'parsed_receipts',
    'store_geofences',
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`   ❌ Table ${table} not found`);
    } else {
      console.log(`   ✓ Table ${table} exists (${count || 0} rows)`);
    }
  }
  
  // Check stores
  const { data: stores } = await supabase
    .from('stores')
    .select('category, count(*)')
    .limit(1);
  
  if (stores && stores.length > 0) {
    console.log(`   ✓ Stores seeded successfully`);
  }
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
