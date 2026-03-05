import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth/mobile-auth';
import { createMobileClient } from '@/lib/supabase/mobile-client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/mobile/workspaces/[id]/upload-avatar
 * Upload a workspace avatar image (multipart/form-data, field name "file").
 * Stores in the "workspace-avatars" Supabase Storage bucket and returns { url }.
 * Uses mobile auth (Bearer token) — not Clerk session cookies.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mobileClient = await createMobileClient(request);
    if (!mobileClient) {
      return NextResponse.json(
        { error: 'Authentication failed or server misconfigured' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { userId } = mobileClient;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use service-role client for Storage access (bypasses RLS on buckets)
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileExt = file.name.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/${id}/${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('workspace-avatars')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Workspace avatar upload error:', uploadError.message);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: urlData } = adminSupabase.storage
      .from('workspace-avatars')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Also persist the URL directly on the workspace row
    const { supabase } = mobileClient;
    await supabase
      .from('workspaces')
      .update({ avatar: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ url: publicUrl }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error uploading workspace avatar:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
