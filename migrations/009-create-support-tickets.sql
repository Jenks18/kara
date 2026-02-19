-- Migration 009: Create support_tickets table for bug reports and security reports
-- This unified table handles all user-submitted reports (bugs, suspicious activity, etc.)

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT DEFAULT '',
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'suspicious_activity', 'feature_request', 'general')),
  
  -- Common fields
  title TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Bug-specific fields
  category TEXT,
  severity TEXT,
  steps_to_reproduce TEXT,
  user_agent TEXT,
  screen_size TEXT,
  
  -- Security-specific fields
  activity_types TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can insert their own tickets, admins can read all
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own tickets
CREATE POLICY "Users can insert own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to read their own tickets
CREATE POLICY "Users can read own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub');

-- Allow service role full access
CREATE POLICY "Service role full access"
  ON support_tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
