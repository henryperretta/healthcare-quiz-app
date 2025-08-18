import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) || 'not found',
    fromEmail: process.env.FROM_EMAIL || 'not found',
    nodeEnv: process.env.NODE_ENV
  });
}