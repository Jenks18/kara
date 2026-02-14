import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwt, corsHeaders, unauthorizedResponse } from '@/lib/auth/mobile-auth';
import { getWorkspaces, createWorkspace } from '@/lib/api/workspaces';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/mobile/workspaces
 * List workspaces for the authenticated mobile user.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    const workspaces = await getWorkspaces(userId);

    return NextResponse.json({ workspaces }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in mobile workspaces:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspaces' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/mobile/workspaces
 * Create a new workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromJwt(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { name, avatar, currency, currencySymbol } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await createWorkspace({
      userId,
      name,
      avatar,
      currency: currency || 'KES',
      currencySymbol: currencySymbol || 'KSh',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { workspace: result.workspace },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in mobile create workspace:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500, headers: corsHeaders }
    );
  }
}
