import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: Email verification no longer needed
 * 
 * Backend SDK auto-verifies email addresses when creating accounts.
 * Sign-up flow now provides immediate authentication via sign-in tokens.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated.',
      message: 'Email verification is no longer required. Accounts are auto-verified on sign-up.'
    },
    { status: 410, headers: corsHeaders }
  );
}
