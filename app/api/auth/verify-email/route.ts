import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer used.
 * Android app now verifies codes directly with Clerk Frontend API.
 * See: android-app/app/src/main/java/com/mafutapass/app/auth/ClerkAuthManager.kt
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please update your app.',
      message: 'Verify codes directly with Clerk Frontend API.'
    },
    { status: 410, headers: corsHeaders } // 410 Gone
  );
}
