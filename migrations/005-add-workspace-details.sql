-- Add description and address fields to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Collect';

-- Add index for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);

-- Migration complete
SELECT 'Workspace details columns added successfully' as status;
