/**
 * Apply Receipt Templates Migration
 * Reads and executes the 009-receipt-templates.sql migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Applying Receipt Templates Migration...\n');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'migrations', '009-receipt-templates.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Read migration file:', sqlPath);
    console.log('📏 SQL length:', sql.length, 'bytes\n');
    
    // Execute the SQL
    console.log('⚙️ Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql function doesn't exist, try direct query
      console.log('⚠️ exec_sql function not found, trying direct execution...');
      
      const { data: queryData, error: queryError } = await supabase
        .from('_prisma_migrations') // Use a system table to execute raw SQL
        .select('*')
        .limit(0); // Don't actually select anything
      
      if (queryError) {
        console.error('❌ Migration failed:', queryError.message);
        process.exit(1);
      }
      
      // Try using Postgres REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        console.error('❌ Migration failed:', await response.text());
        process.exit(1);
      }
      
      console.log('✅ Migration executed successfully via REST API');
    } else {
      console.log('✅ Migration executed successfully');
      console.log('📊 Result:', data);
    }
    
    console.log('\n🎉 Receipt templates migration complete!');
    console.log('\n📝 Tables created:');
    console.log('  • receipt_templates - Store patterns for different receipt types');
    console.log('  • receipt_extraction_feedback - Learn from user corrections');
    console.log('\n🌱 Seeded templates:');
    console.log('  • Shell Kenya (Fuel)');
    console.log('  • TotalEnergies Kenya (Fuel)');
    console.log('  • Naivas Supermarket (Food)');
    console.log('  • Carrefour Kenya (Food)');
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

applyMigration();
