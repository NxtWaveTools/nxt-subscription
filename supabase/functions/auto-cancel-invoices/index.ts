// ============================================================================
// Auto-Cancel Overdue Invoices Edge Function
// ============================================================================
// This Edge Function runs on a schedule (via pg_cron) to automatically cancel
// payment cycles that have passed their invoice deadline without an uploaded invoice.
// It also sends notifications to POC and Finance users.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Types
interface OverduePaymentCycle {
  id: string
  subscription_id: string
  cycle_number: number
  cycle_start_date: string
  cycle_end_date: string
  invoice_deadline: string
  cycle_status: string
  subscriptions: {
    id: string
    subscription_id: string
    tool_name: string
    vendor_name: string
    poc_email: string
    department_id: string
    departments: {
      name: string
    }
  }
}

interface CancelledCycle {
  id: string
  subscription_id: string
  tool_name: string
  poc_email: string
  cycle_number: number
  invoice_deadline: string
}

interface ProcessingResult {
  success: boolean
  totalOverdue: number
  cancelledCount: number
  notificationsSent: number
  errors: string[]
  cancelledCycles: CancelledCycle[]
}

// Constants
const CANCELLATION_REASON = 'Invoice not uploaded by deadline - auto-cancelled'
const MAX_RETRIES = 3

Deno.serve(async (req) => {
  // Only allow POST requests (from pg_cron/pg_net)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse authorization header for service role access
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Initialize Supabase client with service role for full database access
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: ProcessingResult = {
    success: true,
    totalOverdue: 0,
    cancelledCount: 0,
    notificationsSent: 0,
    errors: [],
    cancelledCycles: [],
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    // Fetch all payment cycles that:
    // 1. Are in PAYMENT_RECORDED status (payment made, waiting for invoice)
    // 2. Have no invoice uploaded (invoice_file_id is null)
    // 3. Have passed their invoice deadline
    const { data: overdueCycles, error: fetchError } = await supabase
      .from('subscription_payments')
      .select(`
        id,
        subscription_id,
        cycle_number,
        cycle_start_date,
        cycle_end_date,
        invoice_deadline,
        cycle_status,
        subscriptions!inner(
          id,
          subscription_id,
          tool_name,
          vendor_name,
          poc_email,
          department_id,
          departments(name)
        )
      `)
      .eq('cycle_status', 'PAYMENT_RECORDED')
      .is('invoice_file_id', null)
      .lt('invoice_deadline', today)
      .order('invoice_deadline', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch overdue cycles: ${fetchError.message}`)
    }

    result.totalOverdue = overdueCycles?.length || 0

    if (!overdueCycles || overdueCycles.length === 0) {
      console.log('No overdue invoices found')
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${overdueCycles.length} overdue payment cycles to process`)

    // Process each overdue cycle
    for (const cycle of overdueCycles as unknown as OverduePaymentCycle[]) {
      try {
        // Update the payment cycle to CANCELLED status
        const { error: updateError } = await supabase
          .from('subscription_payments')
          .update({
            cycle_status: 'CANCELLED',
            poc_rejection_reason: CANCELLATION_REASON,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cycle.id)

        if (updateError) {
          result.errors.push(
            `Failed to cancel cycle ${cycle.id}: ${updateError.message}`
          )
          continue
        }

        result.cancelledCount++
        result.cancelledCycles.push({
          id: cycle.id,
          subscription_id: cycle.subscription_id,
          tool_name: cycle.subscriptions.tool_name,
          poc_email: cycle.subscriptions.poc_email,
          cycle_number: cycle.cycle_number,
          invoice_deadline: cycle.invoice_deadline,
        })

        // Create audit log entry
        try {
          await supabase.from('audit_log').insert({
            user_id: null, // System action
            action: 'PAYMENT_CYCLE_AUTO_CANCELLED',
            entity_type: 'subscription_payments',
            entity_id: cycle.id,
            details: {
              subscription_id: cycle.subscription_id,
              cycle_number: cycle.cycle_number,
              invoice_deadline: cycle.invoice_deadline,
              reason: CANCELLATION_REASON,
            },
          })
        } catch (auditError) {
          console.error(`Failed to create audit log for cycle ${cycle.id}:`, auditError)
        }

        // Create notification for POC
        try {
          // Get POC user by email
          const { data: pocUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', cycle.subscriptions.poc_email)
            .single()

          if (pocUser) {
            await supabase.from('notifications').insert({
              user_id: pocUser.id,
              type: 'PAYMENT_UPDATE',
              title: 'Payment Cycle Auto-Cancelled',
              message: `Payment cycle #${cycle.cycle_number} for ${cycle.subscriptions.tool_name} was automatically cancelled due to missed invoice deadline (${cycle.invoice_deadline}).`,
              subscription_id: cycle.subscriptions.id,
              is_read: false,
            })
            result.notificationsSent++
          }
        } catch (notifError) {
          console.error(`Failed to create notification for cycle ${cycle.id}:`, notifError)
        }

        // Also notify Finance users
        try {
          const { data: financeUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role_id', (
              await supabase.from('roles').select('id').eq('name', 'FINANCE').single()
            ).data?.id)

          if (financeUsers && financeUsers.length > 0) {
            const notifications = financeUsers.map((fu) => ({
              user_id: fu.user_id,
              type: 'PAYMENT_UPDATE',
              title: 'Payment Cycle Auto-Cancelled',
              message: `Payment cycle #${cycle.cycle_number} for ${cycle.subscriptions.tool_name} (${cycle.subscriptions.departments?.name || 'Unknown Dept'}) was automatically cancelled due to missed invoice deadline.`,
              subscription_id: cycle.subscriptions.id,
              is_read: false,
            }))

            await supabase.from('notifications').insert(notifications)
            result.notificationsSent += financeUsers.length
          }
        } catch (financeNotifError) {
          console.error(`Failed to notify finance users for cycle ${cycle.id}:`, financeNotifError)
        }

      } catch (cycleError) {
        const errorMessage = cycleError instanceof Error ? cycleError.message : String(cycleError)
        result.errors.push(`Error processing cycle ${cycle.id}: ${errorMessage}`)
      }
    }

    // Log summary
    console.log('Auto-cancel processing complete:', {
      totalOverdue: result.totalOverdue,
      cancelledCount: result.cancelledCount,
      notificationsSent: result.notificationsSent,
      errorCount: result.errors.length,
    })

    result.success = result.errors.length === 0

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Auto-cancel function error:', errorMessage)
    
    result.success = false
    result.errors.push(errorMessage)

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
