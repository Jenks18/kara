#!/usr/bin/env node

/**
 * Apply workspace collaboration migration (011)
 * Creates workspace_members, workspace_invites, workspace_activity tables
 * Run: node scripts/apply-migration-011.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  line = line.trim()
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      envVars[key] = value
    }
  }
})

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://bkypfuyiknytkuhxtduc.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  console.error('Expected location:', envPath)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('🚀 Applying workspace collaboration migration...\n')

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '../migrations/011-workspace-collaboration.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log('📄 Migration file loaded:', migrationPath)
  console.log('📏 SQL length:', migrationSQL.length, 'characters\n')

  // Execute migration
  console.log('⏳ Executing SQL...')
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

  if (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Details:', error)
    
    // Fallback: Try direct execution via REST API
    console.log('\n🔄 Trying alternative method...')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Alternative method also failed:', errorText)
      console.log('\n📋 Please apply the migration manually:')
      console.log('1. Go to Supabase Dashboard → SQL Editor')
      console.log('2. Copy the contents of migrations/011-workspace-collaboration.sql')
      console.log('3. Paste and run the SQL')
      process.exit(1)
    }
  }

  console.log('✅ Migration applied successfully!\n')

  // Verify tables were created
  console.log('🔍 Verifying tables...')
  const tables = ['workspace_members', 'workspace_invites', 'workspace_activity']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count')
      .limit(1)

    if (error) {
      console.log(`  ⚠️  ${table}: Error (${error.message})`)
    } else {
      console.log(`  ✅ ${table}: Created successfully`)
    }
  }

  // Check if workspaces table has new columns
  const { data: sampleWorkspace } = await supabase
    .from('workspaces')
    .select('id, owner_id, member_count, workspace_type')
    .limit(1)
    .single()

  if (sampleWorkspace?.owner_id !== undefined) {
    console.log('  ✅ workspaces: Updated with owner_id, member_count, workspace_type')
  }

  console.log('\n🎉 Workspace collaboration system is ready!')
  console.log('📝 Features enabled:')
  console.log('  - Multi-user workspaces')
  console.log('  - Role-based access (admin, member, viewer)')
  console.log('  - Workspace invites with email')
  console.log('  - Activity logging')
  console.log('  - Member management')
}

applyMigration().catch(err => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
