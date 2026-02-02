import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

/**
 * Database Initialization Endpoint
 * Automatically creates all required database tables if they don't exist
 */
export async function POST(req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "")
    
    // Call the PHP initialization script
    const initUrl = `${base}/init-db.php?init=true`
    
    const response = await fetch(initUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Database initialization failed',
          details: data
        },
        { status: response.status }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      ...data
    })
  } catch (e: any) {
    console.error('Database initialization error:', e)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database initialization failed',
        error: e?.message || String(e)
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
