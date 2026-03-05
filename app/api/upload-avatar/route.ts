import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const BUCKET = 'profile-pictures'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create admin client for storage access (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ensure the bucket exists (auto-create if missing)
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.id === BUCKET)) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
      })
      if (createErr) {
        console.error(`Failed to create ${BUCKET} bucket:`, createErr.message)
        // Continue anyway — bucket might have been created by another request
      }
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName)

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl 
    })
  } catch (error) {
    console.error('Error uploading avatar:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
