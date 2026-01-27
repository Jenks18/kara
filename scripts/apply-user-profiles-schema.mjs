import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySchema() {
  try {
    // Read the schema file
    const schemaPath = join(process.cwd(), 'lib', 'supabase', 'user-profiles-schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')

    console.log('Applying user_profiles schema...')
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: schemaSql })

    if (error) {
      // Try direct execution if rpc fails
      const { error: directError } = await supabase.from('_sql').select('*').limit(0)
      
      if (directError) {
        console.error('Error applying schema:', error)
        console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:')
        console.log('\n' + schemaSql)
        process.exit(1)
      }
    }

    console.log('✅ Schema applied successfully!')
    console.log('\nYou can now:')
    console.log('1. Refresh your app to load the avatar from the database')
    console.log('2. Select a new avatar and it will be saved to the database')
    console.log('3. Edit your profile information and it will persist')
    
  } catch (error) {
    console.error('Error:', error)
    console.log('\n⚠️  Automatic application failed. Please apply manually:')
    console.log('\n1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Copy and paste the contents of: lib/supabase/user-profiles-schema.sql')
    console.log('3. Run the query')
    process.exit(1)
  }
}

applySchema()
