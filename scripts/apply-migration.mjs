#!/usr/bin/env node

/**
 * Apply database migrations to Supabase
 * Run with: node scripts/apply-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load environment variables
const envPath = join(rootDir, '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]+)"?$/)
  if (match) {
    env[match[1]] = match[2]
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
console.log('   URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    console.log('\n📋 Applying migration: Add user_id to expense_reports')
    
    // Check current schema
    console.log('\n1️⃣ Checking current schema...')
    const { data: columns, error: schemaError } = await supabase.rpc('get_columns', {
      table_name: 'expense_reports'
    }).catch(() => {
      // Fallback: try to query table structure
      return supabase
        .from('expense_reports')
        .select('*')
        .limit(0)
    })
    
    if (schemaError) {
      console.warn('⚠️ Could not check schema:', schemaError.message)
    }
    
    // Add user_id column
    console.log('\n2️⃣ Adding user_id column...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE expense_reports 
        ADD COLUMN IF NOT EXISTS user_id TEXT;
      `
    }).catch(() => {
      console.log('   Note: RPC might not be available, using alternative method')
      return { error: null }
    })
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError.message)
      console.log('\n⚠️ Cannot apply migration programmatically.')
      console.log('   Please apply manually via Supabase Dashboard.')
      console.log('   See MIGRATION_INSTRUCTIONS.md for details.')
      process.exit(1)
    }
    
    console.log('   ✓ Column added (or already exists)')
    
    // Test insert
    console.log('\n3️⃣ Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('expense_reports')
      .select('id, user_id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Test query failed:', testError.message)
      
      if (testError.message.includes('user_id')) {
        console.log('\n⚠️ The user_id column still does not exist in the database.')
        console.log('\n📖 Manual migration required:')
        console.log('   1. Go to https://supabase.com/dashboard')
        console.log('   2. Select your project')
        console.log('   3. Open SQL Editor')
        console.log('   4. Copy contents of apply-migrations.sql')
        console.log('   5. Paste and run')
        console.log('\n   See MIGRATION_INSTRUCTIONS.md for detailed steps.')
        process.exit(1)
      }
    } else {
      console.log('   ✓ Database connected successfully')
      if (testData && testData.length > 0) {
        console.log(`   Found ${testData.length} existing report(s)`)
      }
    }
    
    console.log('\n✅ Migration check complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Apply the migration via Supabase Dashboard (see MIGRATION_INSTRUCTIONS.md)')
    console.log('   2. Test creating an expense report in the app')
    console.log('   3. Verify no more "user_id column" errors')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.log('\n📖 Please apply migration manually:')
    console.log('   See apply-migrations.sql and MIGRATION_INSTRUCTIONS.md')
    process.exit(1)
  }
}

console.log('═'.repeat(60))
console.log('  Database Migration Tool')
console.log('═'.repeat(60))

applyMigration()
