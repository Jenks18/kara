#!/usr/bin/env node

/**
 * Check Supabase database schema
 * Run with: node scripts/check-schema.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load environment
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
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema...\n')
  
  let allGood = true
  
  try {
    // Check 1: Database table and user_id column
    console.log('1️⃣ Checking database tables...')
    const { data, error } = await supabase
      .from('expense_reports')
      .select('id, user_id, user_email, workspace_name')
      .limit(1)
    
    if (error) {
      console.error('   ❌ Database Error:', error.message)
      
      if (error.message.includes('user_id')) {
        console.log('\n   ❌ MIGRATION NEEDED!')
        console.log('      The expense_reports table is missing the user_id column.')
        allGood = false
      } else {
        allGood = false
      }
    } else {
      console.log('   ✅ expense_reports table OK')
      console.log('      ✓ user_id column exists')
      
      if (data && data.length > 0) {
        console.log(`      ✓ Found ${data.length} existing report(s)`)
      }
    }
    
    // Check 2: Storage bucket
    console.log('\n2️⃣ Checking storage bucket...')
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets()
    
    if (bucketError) {
      console.log('   ⚠️ Could not check buckets:', bucketError.message)
    } else {
      const receiptsBucket = buckets?.find(b => b.id === 'receipts')
      if (receiptsBucket) {
        console.log('   ✅ receipts bucket exists')
        console.log('      ✓ Public:', receiptsBucket.public ? 'Yes' : 'No')
      } else {
        console.log('   ❌ receipts bucket missing')
        console.log('      Run apply-migrations.sql to create it')
        allGood = false
      }
    }
    
    // Check 3: Test upload permission
    console.log('\n3️⃣ Testing storage permissions...')
    const testFile = new Blob(['test'], { type: 'text/plain' })
    const testPath = `test-${Date.now()}.txt`
    
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(testPath, testFile)
    
    if (uploadError) {
      if (uploadError.message.includes('row-level security')) {
        console.log('   ❌ Storage RLS policies missing')
        console.log('      Run apply-migrations.sql to fix')
        allGood = false
      } else if (uploadError.message.includes('not found')) {
        console.log('   ❌ receipts bucket does not exist')
        console.log('      Run apply-migrations.sql to create it')
        allGood = false
      } else {
        console.log('   ⚠️ Upload test failed:', uploadError.message)
      }
    } else {
      console.log('   ✅ Storage upload works')
      // Clean up test file
      await supabase.storage.from('receipts').remove([testPath])
    }
    
    return allGood
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

console.log('═'.repeat(60))
console.log('  Supabase Schema Checker')
console.log('═'.repeat(60))
console.log()

checkSchema().then(success => {
  console.log()
  console.log('═'.repeat(60))
  if (success) {
    console.log('✅ Everything looks good! You can create expense reports.')
  } else {
    console.log('⚠️ Migration required.')
    console.log()
    console.log('📋 To fix:')
    console.log('   1. Go to: https://supabase.com/dashboard')
    console.log('   2. Open SQL Editor')
    console.log('   3. Run: apply-migrations.sql')
    console.log()
    console.log('   See FIX_ALL_ERRORS.md for detailed steps.')
  }
  console.log('═'.repeat(60))
  process.exit(success ? 0 : 1)
})
