-- Workspaces table for multi-tenant support
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Owner information (Clerk user ID)
  user_id TEXT NOT NULL,
  
  -- Workspace details
  name TEXT NOT NULL,
  avatar TEXT DEFAULT 'W',
  currency TEXT DEFAULT 'USD',
  currency_symbol TEXT DEFAULT '$',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_active ON workspaces(user_id, is_active);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own workspaces
CREATE POLICY "Users can view their own workspaces"
ON workspaces FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own workspaces"
ON workspaces FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own workspaces"
ON workspaces FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own workspaces"
ON workspaces FOR DELETE
USING (auth.uid()::text = user_id);

-- Add workspace_id to expense_reports (optional, for future workspace scoping)
ALTER TABLE expense_reports 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_reports_workspace ON expense_reports(workspace_id);

-- Migration complete
SELECT 'Workspaces table created successfully' as status;
