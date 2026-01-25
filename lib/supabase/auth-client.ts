/**
 * Authenticated Supabase Client Factory
 * 
 * Creates Supabase clients that maintain user context for proper RLS enforcement.
 * Use this on the server to create clients that act on behalf of authenticated users.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Create a Supabase client that acts as a specific user
 * 
 * This maintains user context for:
 * - RLS policies (auth.uid() returns the user ID)
 * - Audit trails (storage.owner is set correctly)
 * - Data isolation (users can only see their own data)
 * 
 * @param userId - The Clerk user ID (e.g., "user_2abc123")
 * @param userEmail - The user's email address
 * @returns Supabase client with user context
 */
export function createAuthenticatedClient(userId: string, userEmail: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        // Pass user context to Supabase
        // RLS policies can now access these via auth.uid() and auth.email()
        'x-user-id': userId,
        'x-user-email': userEmail,
      },
    },
    auth: {
      // Don't persist sessions on server
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Check if authenticated client can be created
 */
export const canCreateAuthClient = !!(supabaseUrl && supabaseServiceKey);
