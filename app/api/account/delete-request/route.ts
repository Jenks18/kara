import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, reason } = body

    // Log deletion request
    console.log('===== ACCOUNT DELETION REQUEST =====')
    console.log('Date:', new Date().toISOString())
    console.log('User ID:', userId)
    console.log('Email:', email)
    console.log('Reason:', reason || 'Not provided')
    console.log('=====================================')

    // In production, you would:
    // 1. Store this request in your database
    // 2. Send email to support team
    // 3. Send confirmation email to user
    // 4. Queue the actual deletion job (after 30 days or immediately based on your policy)
    
    // Example: Store in database (you'll need to create this table)
    // await supabase.from('account_deletion_requests').insert({
    //   user_id: userId,
    //   email: email,
    //   reason: reason,
    //   requested_at: new Date().toISOString(),
    //   status: 'pending'
    // })

    // Example: Send email notification to support
    // await sendEmail({
    //   to: 'support@mafutapass.com',
    //   subject: `Account Deletion Request - ${email}`,
    //   body: `User ${email} (ID: ${userId}) has requested account deletion.\nReason: ${reason}`
    // })

    // For now, we'll just return success
    // You can manually process these from your logs or set up proper automation
    
    return NextResponse.json({ 
      success: true,
      message: 'Deletion request received and will be processed within 30 days'
    })
  } catch (error) {
    console.error('Error processing deletion request:', error)
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    )
  }
}
