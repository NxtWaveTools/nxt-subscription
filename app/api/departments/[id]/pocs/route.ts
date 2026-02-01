// ============================================================================
// API Route: Fetch POCs for a Department
// ============================================================================

import { NextResponse } from 'next/server'
import { fetchPOCsForDepartment } from '@/lib/data-access'
import { z } from 'zod'

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid department ID format')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format to prevent injection
    const validationResult = uuidSchema.safeParse(id)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid department ID format' },
        { status: 400 }
      )
    }

    const pocs = await fetchPOCsForDepartment(id)
    
    return NextResponse.json({ pocs })
  } catch (error) {
    console.error('Failed to fetch POCs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch POCs for department' },
      { status: 500 }
    )
  }
}
