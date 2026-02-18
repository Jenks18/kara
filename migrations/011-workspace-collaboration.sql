-- ============================================
-- MIGRATION 011: Workspace Collaboration System
-- ============================================
-- Full multi-user workspace collaboration with roles and invites

BEGIN;

-- ========================================
-- 1. WORKSPACE_MEMBERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Relationships
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  
  -- Member role
  role TEXT NOT NULL DEFAULT 'member', -- admin, member, viewer
  
  -- Member status
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended
  
  -- Joined metadata
  invited_by TEXT, -- Clerk user ID of inviter
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Permissions (for future granular control)
  permissions JSONB DEFAULT '{"can_view": true, "can_edit": false, "can_delete": false, "can_invite": false}'::jsonb,
  
  -- Unique constraint: one user per workspace
  UNIQUE(workspace_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(workspace_id, role);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);

-- ========================================
-- 2. WORKSPACE_INVITES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Relationships
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL, -- Clerk user ID of inviter
  
  -- Invitee info
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  
  -- Invite status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
  
  -- Acceptance tracking
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id TEXT, -- Clerk user ID who accepted
  
  -- Shareable token
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  
  -- Metadata
  message TEXT, -- Optional personal message from inviter
  metadata JSONB -- Extra data (e.g., inviter name, workspace name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_status ON workspace_invites(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires ON workspace_invites(expires_at);

-- ========================================
-- 3. WORKSPACE ACTIVITY LOG
-- ========================================

CREATE TABLE IF NOT EXISTS workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Context
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Actor (who did it)
  
  -- Activity details
  activity_type TEXT NOT NULL, -- member_joined, member_removed, role_changed, workspace_updated, etc.
  description TEXT NOT NULL,
  
  -- Related entities
  target_user_id TEXT, -- User affected by the action
  metadata JSONB -- Additional context
);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace ON workspace_activity(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user ON workspace_activity(user_id);

-- ========================================
-- 4. UPDATE WORKSPACES TABLE
-- ========================================

-- Add owner tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN owner_id TEXT;
    -- Backfill: Set owner_id = user_id for existing workspaces
    UPDATE workspaces SET owner_id = user_id WHERE owner_id IS NULL;
    ALTER TABLE workspaces ALTER COLUMN owner_id SET NOT NULL;
  END IF;
END $$;

-- Add member count cache
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;

-- Add workspace type
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS workspace_type TEXT DEFAULT 'personal'; -- personal, team, business

-- ========================================
-- 5. AUTO-CREATE WORKSPACE_MEMBER FOR OWNER
-- ========================================

CREATE OR REPLACE FUNCTION auto_add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- When a workspace is created, automatically add the owner as admin member
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, permissions)
  VALUES (
    NEW.id,
    NEW.owner_id,
    'admin',
    NEW.owner_id, -- Self-invited
    '{"can_view": true, "can_edit": true, "can_delete": true, "can_invite": true, "can_manage_members": true}'::jsonb
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_workspace_owner ON workspaces;
CREATE TRIGGER trigger_auto_add_workspace_owner
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_workspace_owner();

-- ========================================
-- 6. AUTO-UPDATE MEMBER COUNT
-- ========================================

CREATE OR REPLACE FUNCTION update_workspace_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update member count when members are added/removed
  UPDATE workspaces
  SET member_count = (
    SELECT COUNT(*) 
    FROM workspace_members 
    WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_count_insert ON workspace_members;
CREATE TRIGGER trigger_update_member_count_insert
  AFTER INSERT ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_member_count();

DROP TRIGGER IF EXISTS trigger_update_member_count_update ON workspace_members;
CREATE TRIGGER trigger_update_member_count_update
  AFTER UPDATE ON workspace_members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_workspace_member_count();

DROP TRIGGER IF EXISTS trigger_update_member_count_delete ON workspace_members;
CREATE TRIGGER trigger_update_member_count_delete
  AFTER DELETE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_member_count();

-- ========================================
-- 7. LOG ACTIVITY AUTOMATICALLY
-- ========================================

CREATE OR REPLACE FUNCTION log_workspace_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id, metadata)
    VALUES (
      NEW.workspace_id,
      COALESCE(NEW.invited_by, NEW.user_id),
      'member_joined',
      'New member joined the workspace',
      NEW.user_id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id, metadata)
    VALUES (
      NEW.workspace_id,
      (auth.jwt()->>'sub'), -- Current user making the change
      'role_changed',
      format('Member role changed from %s to %s', OLD.role, NEW.role),
      NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO workspace_activity (workspace_id, user_id, activity_type, description, target_user_id)
    VALUES (
      OLD.workspace_id,
      (auth.jwt()->>'sub'),
      'member_removed',
      'Member removed from workspace',
      OLD.user_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_member_activity ON workspace_members;
CREATE TRIGGER trigger_log_member_activity
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION log_workspace_activity();

-- ========================================
-- 8. ENABLE RLS
-- ========================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 9. RLS POLICIES
-- ========================================

-- Workspace Members: Users see members of workspaces they belong to
CREATE POLICY "Users can view workspace members if they are members"
ON workspace_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.status = 'active'
  )
);

-- Only admins can add members
CREATE POLICY "Admins can add workspace members"
ON workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Only admins can update members (e.g., change roles)
CREATE POLICY "Admins can update workspace members"
ON workspace_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Only admins can remove members
CREATE POLICY "Admins can remove workspace members"
ON workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Workspace Invites: Members can view invites for their workspaces
CREATE POLICY "Members can view workspace invites"
ON workspace_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.status = 'active'
  )
);

-- Admins can create invites
CREATE POLICY "Admins can create invites"
ON workspace_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Admins can cancel invites
CREATE POLICY "Admins can update invites"
ON workspace_invites FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Workspace Activity: Members can view activity logs
CREATE POLICY "Members can view workspace activity"
ON workspace_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_activity.workspace_id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.status = 'active'
  )
);

-- ========================================
-- 10. UPDATE WORKSPACES RLS POLICIES
-- ========================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;

-- New policies: Users see workspaces they're members of
CREATE POLICY "Users can view workspaces they are members of"
ON workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.status = 'active'
  )
);

-- Users can create workspaces (they become owner)
CREATE POLICY "Users can create their own workspaces"
ON workspaces FOR INSERT
WITH CHECK (owner_id = (auth.jwt()->>'sub'));

-- Only admins can update workspaces
CREATE POLICY "Admins can update workspaces"
ON workspaces FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- Only admins can delete workspaces
CREATE POLICY "Admins can delete workspaces"
ON workspaces FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = (auth.jwt()->>'sub')
    AND wm.role = 'admin'
    AND wm.status = 'active'
  )
);

-- ========================================
-- 11. BACKFILL EXISTING WORKSPACES
-- ========================================

-- Add owner as admin member for all existing workspaces
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, permissions, status)
SELECT 
  id,
  owner_id,
  'admin',
  owner_id,
  '{"can_view": true, "can_edit": true, "can_delete": true, "can_invite": true, "can_manage_members": true}'::jsonb,
  'active'
FROM workspaces
WHERE owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Update member counts
UPDATE workspaces w
SET member_count = (
  SELECT COUNT(*) FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.status = 'active'
);

COMMIT;

-- Success message
SELECT 'Workspace collaboration system created successfully!' as status;
SELECT 'Tables created: workspace_members, workspace_invites, workspace_activity' as info;
