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
}

export interface CreateWorkspaceInput {
  userId: string
  name: string
  avatar?: string
  currency?: string
  currencySymbol?: string
}

/**
 * Create a new workspace (RLS-enforced via Clerk JWT)
 */
export async function createWorkspace(
  data: CreateWorkspaceInput
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  try {
    const supabase = await createServerClient()
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
 * Delete a workspace — soft delete (RLS-enforced)
 */
export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
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
