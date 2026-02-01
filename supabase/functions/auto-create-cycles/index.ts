// ============================================================================
// Auto-Create Payment Cycles Edge Function
// ============================================================================
// This Edge Function runs on a schedule (via pg_cron) to automatically create
// new payment cycles 10 days before the next billing date.
//
// Workflow:
// 1. Find all ACTIVE subscriptions
// 2. Get their latest payment cycle
// 3. Check if it's 10 days before the next cycle should start
// 4. Create new cycle with PENDING_APPROVAL status

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Types
interface SubscriptionWithLatestCycle {
  id: string
  subscription_id: string
  tool_name: string
  vendor_name: string
  department_id: string
  billing_frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED'
  start_date: string
  latest_cycle: {
    cycle_number: number
    cycle_end_date: string
  } | null
}

interface ProcessingResult {
  success: boolean
  totalChecked: number
  cyclesCreated: number
  errors: string[]
  createdCycles: Array<{
    subscription_id: string
    tool_name: string
    cycle_number: number
  }>
}

// ============================================================================
// Date Calculation Helpers
// ============================================================================

function getDaysForBillingFrequency(frequency: string): number {
  switch (frequency) {
    case 'MONTHLY':
      return 30
    case 'QUARTERLY':
      return 90
    case 'YEARLY':
      return 365
    case 'USAGE_BASED':
      return 30
    default:
      return 30
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

function calculateNextCycleStartDate(previousCycleEndDate: string): Date {
  return addDays(new Date(previousCycleEndDate), 1)
}

function calculateCycleEndDate(cycleStartDate: Date, billingFrequency: string): Date {
  const days = getDaysForBillingFrequency(billingFrequency)
  return addDays(cycleStartDate, days - 1)
}

function shouldCreateNextCycle(
  lastCycleEndDate: string,
  billingFrequency: string
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const nextCycleStartDate = calculateNextCycleStartDate(lastCycleEndDate)
  const daysUntilNextCycle = Math.floor(
    (nextCycleStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Create cycle if we're 10 days or less away from next cycle start
  return daysUntilNextCycle <= 10 && daysUntilNextCycle >= 0
}

// ============================================================================
// Main Handler
// ============================================================================

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

  // Initialize Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: ProcessingResult = {
    success: true,
    totalChecked: 0,
    cyclesCreated: 0,
    errors: [],
    createdCycles: [],
  }

  try {
    // Fetch all ACTIVE subscriptions with their latest payment cycle
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        subscription_id,
        tool_name,
        vendor_name,
        department_id,
        billing_frequency,
        start_date,
        subscription_payments!subscription_payments_subscription_id_fkey(
          cycle_number,
          cycle_end_date
        )
      `)
      .eq('status', 'ACTIVE')
      .order('subscription_payments(cycle_number)', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found')
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    result.totalChecked = subscriptions.length
    console.log(`Checking ${subscriptions.length} active subscriptions`)

    // Process each subscription
    for (const subscription of subscriptions as any[]) {
      try {
        // Get the latest cycle (first one due to ordering)
        const latestCycle = Array.isArray(subscription.subscription_payments) 
          && subscription.subscription_payments.length > 0
          ? subscription.subscription_payments[0]
          : null

        if (!latestCycle) {
          console.log(`Subscription ${subscription.subscription_id} has no payment cycles, skipping`)
          continue
        }

        // Check if we should create the next cycle
        if (!shouldCreateNextCycle(latestCycle.cycle_end_date, subscription.billing_frequency)) {
          continue
        }

        console.log(
          `Creating next cycle for subscription ${subscription.subscription_id} ` +
          `(last cycle ended: ${latestCycle.cycle_end_date})`
        )

        // Calculate next cycle dates
        const nextCycleStartDate = calculateNextCycleStartDate(latestCycle.cycle_end_date)
        const nextCycleEndDate = calculateCycleEndDate(nextCycleStartDate, subscription.billing_frequency)
        const invoiceDeadline = nextCycleEndDate // Same as cycle end date

        // Create the new payment cycle
        const { data: newCycle, error: cycleError } = await supabase
          .from('subscription_payments')
          .insert({
            subscription_id: subscription.id,
            cycle_number: latestCycle.cycle_number + 1,
            cycle_start_date: formatDateForDB(nextCycleStartDate),
            cycle_end_date: formatDateForDB(nextCycleEndDate),
            invoice_deadline: formatDateForDB(invoiceDeadline),
            poc_approval_status: 'PENDING',
            cycle_status: 'PENDING_APPROVAL', // Waiting for POC approval
            payment_status: 'IN_PROGRESS',
            accounting_status: 'PENDING',
          })
          .select()
          .single()

        if (cycleError) {
          result.errors.push(
            `Failed to create cycle for ${subscription.subscription_id}: ${cycleError.message}`
          )
          console.error(`Error creating cycle for ${subscription.subscription_id}:`, cycleError)
          continue
        }

        result.cyclesCreated++
        result.createdCycles.push({
          subscription_id: subscription.subscription_id,
          tool_name: subscription.tool_name,
          cycle_number: latestCycle.cycle_number + 1,
        })

        console.log(
          `Created cycle ${latestCycle.cycle_number + 1} for ${subscription.subscription_id}`
        )

        // TODO: Send notification to POC for approval
        // This can be implemented later with a notification system

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing subscription ${subscription.subscription_id}: ${errorMsg}`)
        console.error(`Error processing subscription ${subscription.subscription_id}:`, error)
      }
    }

    console.log(`Completed: ${result.cyclesCreated} cycles created, ${result.errors.length} errors`)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Auto-create cycles error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
