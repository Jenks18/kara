import { supabase, isSupabaseConfigured } from '../supabase/client'

export interface Workspace {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  name: string
  avatar: string
  currency: string
  currency_symbol: string
  is_active: boolean
}

export interface CreateWorkspaceInput {
  userId: string
  name: string
  avatar?: string
  currency?: string
  currencySymbol?: string
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  data: CreateWorkspaceInput
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: data.userId,
        name: data.name,
        avatar: data.avatar || data.name.charAt(0).toUpperCase(),
        currency: data.currency || 'USD',
        currency_symbol: data.currencySymbol || '$',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workspace:', error)
      return { success: false, error: error.message }
    }

    return { success: true, workspace }
  } catch (error: any) {
    console.error('Error creating workspace:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all workspaces for a user
 */
export async function getWorkspaces(
  userId: string
): Promise<Workspace[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workspaces:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting workspaces:', error)
    return []
  }
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(
  workspaceId: string,
  userId: string
): Promise<Workspace | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .eq('user_id', userId)
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
 * Update a workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: Partial<Pick<Workspace, 'name' | 'avatar' | 'currency' | 'currency_symbol'>>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('workspaces')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating workspace:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating workspace:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a workspace (soft delete by setting is_active to false)
 */
export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('workspaces')
      .update({ is_active: false })
      .eq('id', workspaceId)
      .eq('user_id', userId)

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
