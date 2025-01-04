import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    appKey: process.env.NEXT_PUBLIC_ALIYUN_APP_KEY
  })
} 