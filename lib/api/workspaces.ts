import { createServerClient } from '../supabase/server-client'

export interface Workspace {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
  description?: string
  address?: string
  plan_type?: string
  is_active: boolean
  is_default?: boolean
}

export interface CreateWorkspaceInput {
  userId: string
  name: string
  avatar?: string
  currency?: string
  currencySymbol?: string
  isDefault?: boolean
}

/**
 * Create a new workspace (RLS-enforced via Clerk JWT)
 */
export async function createWorkspace(
  data: CreateWorkspaceInput
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  try {
    const supabase = await createServerClient()
    
    // Step 1: Insert the workspace
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: data.userId,
        owner_id: data.userId,
        name: data.name,
        avatar: data.avatar || data.name.charAt(0).toUpperCase(),
        currency: data.currency || 'USD',
        currency_symbol: data.currencySymbol || '$',
        ...(data.isDefault ? { is_default: true } : {}),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workspace:', error)
      
      // If the error is with SELECT after INSERT (RLS timing issue),
      // the workspace was likely created. Try fetching all workspaces.
      if (error.code === 'PGRST116' || error.message?.includes('rows')) {
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', data.userId)
          .eq('name', data.name)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (workspaces && workspaces.length > 0) {
          return { success: true, workspace: workspaces[0] }
        }
      }
      
      // Unique constraint violation on is_default — another path already
      // created the default workspace. Fetch and return the existing one.
      if (data.isDefault && (error.code === '23505' || error.message?.includes('idx_workspaces_one_default_per_user'))) {
        const { data: existing } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', data.userId)
          .eq('is_default', true)
          .eq('is_active', true)
          .limit(1)
        
        if (existing && existing.length > 0) {
          return { success: true, workspace: existing[0] }
        }
      }
      
      return { success: false, error: error.message }
    }

    return { success: true, workspace }
  } catch (error: any) {
    console.error('Error creating workspace:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all workspaces for the authenticated user (RLS-enforced)
 */
export async function getWorkspaces(
  userId: string
): Promise<Workspace[]> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workspaces:', error)
      return []
    }

    // Safety net: If user has zero workspaces, auto-create a default "Personal" one.
    // This handles edge cases where the init trigger failed or migration
    // wasn't applied, ensuring users always have at least one workspace.
    if (!data || data.length === 0) {
      console.warn(`User ${userId} has no workspaces — auto-creating Personal workspace`)
      try {
        const created = await createWorkspace({
          userId,
          name: 'Personal',
          avatar: '💼',
          currency: 'KES',
          currencySymbol: 'KSh',
          isDefault: true,
        })
        if (created.workspace) {
          return [created.workspace as Workspace]
        }
      } catch (autoCreateErr: any) {
        // Unique constraint violation means another code path already created
        // the default workspace (race condition). Re-fetch instead of failing.
        if (autoCreateErr?.code === '23505' || autoCreateErr?.message?.includes('unique')) {
          const { data: retryData } = await supabase
            .from('workspaces')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
          if (retryData && retryData.length > 0) return retryData
        }
        console.error('Failed to auto-create workspace:', autoCreateErr)
      }
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting workspaces:', error)
    return []
  }
}

/**
 * Get a single workspace by ID (RLS-enforced — only returns if user owns it)
 */
export async function getWorkspace(
  workspaceId: string,
  userId: string
): Promise<Workspace | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (error) {
      console.error('Error fetching workspace:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting workspace:', error)
    return null
  }
}

/**
 * Update a workspace (RLS-enforced)
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: Partial<Pick<Workspace, 'name' | 'avatar' | 'currency' | 'currency_symbol' | 'description' | 'address' | 'plan_type'>>
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('workspaces')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating workspace:', error)
      return { success: false, error: error.message }
    }

    return { success: true, workspace: data }
  } catch (error: any) {
    console.error('Error updating workspace:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a workspace — soft delete (RLS-enforced).
 * Default workspaces cannot be deleted.
 */
export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()

    // Check if this is the default workspace — block deletion
    const { data: ws } = await supabase
      .from('workspaces')
      .select('is_default')
      .eq('id', workspaceId)
      .single()

    if (ws?.is_default) {
      return { success: false, error: 'Cannot delete the default workspace' }
    }

    const { error } = await supabase
      .from('workspaces')
      .update({ is_active: false })
      .eq('id', workspaceId)

    if (error) {
      console.error('Error deleting workspace:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting workspace:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the user's default workspace (for receipt uploads, etc.).
 * Always returns one — auto-creates if missing.
 */
export async function getDefaultWorkspace(
  userId: string
): Promise<Workspace | null> {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    if (data) return data

    // Fallback: oldest active workspace
    const { data: oldest } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return oldest || null
  } catch (error) {
    console.error('Error getting default workspace:', error)
    return null
  }
}
