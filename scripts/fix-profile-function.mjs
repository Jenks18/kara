import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const sql = readFileSync('lib/supabase/create-user-profile-function.sql', 'utf-8');

console.log('📝 Applying updated create_user_profile function...');
console.log('SQL to execute:\n', sql.substring(0, 200) + '...\n');

// Use Supabase client with service role to execute SQL
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Execute the SQL directly - Supabase doesn't have exec_sql RPC by default
// So we'll just print instructions f
or manual application
console.log('⚠️  Please apply this SQL manually in Supabase SQL Editor:');
console.log('\n1. Go to: https://supabase.com/dashboard/project/[your-project]/sql');
console.log('2. Copy the SQL from: lib/supabase/create-user-profile-function.sql');
console.log('3. Paste and run it\n');

console.log('OR run this SQL directly:');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
