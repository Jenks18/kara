import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server-client'

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

    // Clerk-authenticated Supabase client — RLS enforced, no service role bypass
    const supabase = await createServerClient()

    // Create unique filename scoped to the user's folder
    // Storage RLS policy enforces: folder must match auth.jwt()->>'sub'
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage (RLS checks folder ownership)
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
