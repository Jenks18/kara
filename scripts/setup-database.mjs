#!/usr/bin/env node
/**
 * Database Setup Script
 * 
 * This script will:
 * 1. Check Supabase connection
 * 2. Apply enhanced-receipt-schema.sql if tables don't exist
 * 3. Seed stores data
 * 4. Setup storage bucket
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\nPlease set these in your .env.local file or Vercel dashboard');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkConnection() {
  console.log('🔍 Checking Supabase connection...');
  
  // Try to query any table - we just want to verify connection works
  const { data, error } = await supabase
    .from('raw_receipts')
    .select('id')
    .limit(1);
  
  // If error contains "does not exist" or "schema cache", connection is fine
  if (error && !error.message.includes('does not exist') && !error.message.includes('schema cache')) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
  
  console.log('✅ Supabase connection successful');
  return true;
}

async function checkTablesExist() {
  console.log('\n🔍 Checking if tables exist...');
  
  const requiredTables = [
    'raw_receipts',
    'stores', 
    'receipt_templates',
    'parsed_receipts',
    'receipt_annotations',
    'store_geofences',
    'receipt_processing_logs'
  ];
  
  const { data, error } = await supabase
    .from('raw_receipts')
    .select('id')
    .limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('❌ Tables do not exist');
    return false;
  }
  
  console.log('✅ Tables already exist');
  return true;
}

async function applySchema() {
  console.log('\n📝 Applying database schema...');
  
  const schemaPath = join(__dirname, '../lib/supabase/enhanced-receipt-schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  
  // Split by semicolons but be careful with functions
  const statements = schema
    .split(/;\s*$/gm)
    .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
    .map(stmt => stmt.trim());
  
  console.log(`   Found ${statements.length} SQL statements`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) throw error;
      process.stdout.write(`\r   Progress: ${i + 1}/${statements.length}`);
    } catch (err) {
      console.error(`\n❌ Error executing statement ${i + 1}:`, err.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
      
      // Try direct execution as fallback
      console.log('   Trying direct execution via REST API...');
      // This would require using Supabase SQL editor or manual application
      throw new Error('Schema application failed. Please apply manually via Supabase SQL Editor');
    }
  }
  
  console.log('\n✅ Schema applied successfully');
}

async function seedStores() {
  console.log('\n🌱 Checking stores data...');
  
  const { data: existingStores, error } = await supabase
    .from('stores')
    .select('id')
    .limit(1);
  
  if (existingStores && existingStores.length > 0) {
    console.log('✅ Stores already seeded');
    return;
  }
  
  console.log('📝 Seeding stores...');
  const seedPath = join(__dirname, '../lib/supabase/seed-stores.sql');
  const seed = readFileSync(seedPath, 'utf8');
  
  // Extract INSERT statements
  const inserts = seed.match(/INSERT INTO[^;]+;/gi);
  
  if (!inserts) {
    console.log('⚠️  No INSERT statements found in seed file');
    return;
  }
  
  console.log(`   Found ${inserts.length} INSERT statements`);
  
  for (let i = 0; i < inserts.length; i++) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: inserts[i] });
      if (error) throw error;
      process.stdout.write(`\r   Progress: ${i + 1}/${inserts.length}`);
    } catch (err) {
      console.error(`\n❌ Error inserting stores:`, err.message);
      throw err;
    }
  }
  
  console.log('\n✅ Stores seeded successfully');
}

async function setupStorage() {
  console.log('\n📦 Checking storage bucket...');
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    return;
  }
  
  const receiptBucket = buckets.find(b => b.name === 'receipt-images');
  
  if (receiptBucket) {
    console.log('✅ Storage bucket already exists');
    return;
  }
  
  console.log('📝 Creating storage bucket...');
  const { error: createError } = await supabase.storage.createBucket('receipt-images', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  });
  
  if (createError) {
    console.error('❌ Failed to create bucket:', createError.message);
    return;
  }
  
  console.log('✅ Storage bucket created');
}

async function showSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 DATABASE SUMMARY');
  console.log('='.repeat(50));
  
  // Count tables
  const tables = [
    { name: 'raw_receipts', label: 'Raw Receipts' },
    { name: 'stores', label: 'Stores' },
    { name: 'receipt_templates', label: 'Templates' },
    { name: 'parsed_receipts', label: 'Parsed Receipts' },
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`   ${table.label}: ${count} records`);
    }
  }
  
  console.log('='.repeat(50));
}

async function main() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    // Step 1: Check connection
    const connected = await checkConnection();
    if (!connected) {
      throw new Error('Failed to connect to Supabase');
    }
    
    // Step 2: Check if tables exist
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist) {
      console.log('\n⚠️  IMPORTANT: Tables do not exist!');
      console.log('   You need to apply the schema manually via Supabase SQL Editor:');
      console.log(`   1. Go to: ${SUPABASE_URL.replace('https://', 'https://app.')}/project/_/sql`);
      console.log('   2. Copy content from: lib/supabase/enhanced-receipt-schema.sql');
      console.log('   3. Paste and run in SQL Editor');
      console.log('   4. Then copy content from: lib/supabase/seed-stores.sql');
      console.log('   5. Paste and run in SQL Editor');
      console.log('   6. Run this script again\n');
      process.exit(1);
    }
    
    // Step 3: Seed stores if needed
    await seedStores();
    
    // Step 4: Setup storage
    await setupStorage();
    
    // Step 5: Show summary
    await showSummary();
    
    console.log('\n✅ Database setup complete!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
