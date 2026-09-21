import {NextResponse} from 'next/server'; export async function GET(){return NextResponse.json({ok:true,service:'otp-platform',time:new Date().toISOString()})}
