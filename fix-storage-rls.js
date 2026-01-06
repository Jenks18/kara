const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkypfuyiknytkuhxtduc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStorageRLS() {
  console.log('🔧 Fixing storage bucket RLS policies...');
  
  // The RLS error means the bucket has RLS enabled but no policies
  // We need to use SQL to add policies
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      -- Allow public uploads to receipts bucket
      CREATE POLICY IF NOT EXISTS "Allow public uploads"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'receipts');
      
      -- Allow public reads from receipts bucket
      CREATE POLICY IF NOT EXISTS "Allow public reads"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'receipts');
    `
  });
  
  if (error) {
    console.log('⚠️ Could not create policies via RPC, trying direct SQL...');
    console.log('Error:', error.message);
  } else {
    console.log('✅ Storage policies created');
  }
}

fixStorageRLS().then(() => process.exit(0)).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
