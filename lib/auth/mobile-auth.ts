import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Extract userId from the Clerk JWT in the Authorization header.
 * Decodes the JWT payload to get the 'sub' claim (Clerk userId).
 */
export function getUserIdFromJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Get the user's email from Clerk using their userId.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return user.emailAddresses?.[0]?.emailAddress || null;
  } catch {
    return null;
  }
}

/**
 * Standard unauthorized response for mobile endpoints.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Missing or invalid Authorization token' },
    { status: 401, headers: corsHeaders }
  );
}
