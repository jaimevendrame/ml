import { NextResponse } from 'next/server'
import { waClient } from '@/lib/whatsapp-client'

export async function GET() {
  try {
    const data = await waClient.getStatus()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
