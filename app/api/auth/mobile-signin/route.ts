import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated.',
      message: 'Sign-up now includes automatic authentication.',
      redirectTo: 'https://www.mafutapass.com/sign-in'
    },
    { status: 410, headers: corsHeaders }
  );
}
