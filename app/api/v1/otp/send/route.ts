import {NextRequest, NextResponse} from 'next/server';
import crypto from 'crypto';
import {db} from '@/lib/prisma';
import {ServiceType} from '@prisma/client';
const hash=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
const code=()=>String(Math.floor(100000+Math.random()*900000));
async function deliver(channel:string,recipient:string,otp:string){
 if(channel==='whatsapp'){
  const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,from=process.env.TWILIO_WHATSAPP_FROM;
  if(!sid||!token||!from)return {ok:false,provider:'twilio',error:'WhatsApp provider is not configured'};
  const body=new URLSearchParams({From:from,To:`whatsapp:${recipient.replace(/^whatsapp:/,'')}`,Body:`Your OTPProvider verification code is ${otp}`});
  const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(`${sid}:${token}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body});
  return {ok:r.ok,provider:'twilio',error:r.ok?undefined:await r.text()};
 }
 const api=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
 if(!api||!from)return {ok:false,provider:'resend',error:'Email provider is not configured'};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${api}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[recipient],subject:'Your OTPProvider verification code',text:`Your verification code is ${otp}. It expires in 5 minutes.`})});
 return {ok:r.ok,provider:'resend',error:r.ok?undefined:await r.text()};
}
export async function POST(req:NextRequest){try{
 const raw=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||req.headers.get('x-api-key'); if(!raw)return NextResponse.json({ok:false,error:'API key required'},{status:401});
 const key=await db.apiKey.findUnique({where:{keyHash:hash(raw)}}); if(!key||!key.active)return NextResponse.json({ok:false,error:'Invalid API key'},{status:401});
 const b=await req.json(); const channel=String(b.channel||'').toLowerCase(),recipient=String(b.recipient||'').trim(); if(!['whatsapp','email'].includes(channel)||!recipient)return NextResponse.json({ok:false,error:'channel and recipient are required'},{status:400});
 const user=await db.user.findUnique({where:{id:key.userId}}); if(!user||user.status!=='ACTIVE')return NextResponse.json({ok:false,error:'Customer account is not active'},{status:403});
 const country=b.country?String(b.country):undefined; const c=country?await db.country.findFirst({where:{code:country,enabled:true}}):null; const cost=channel==='whatsapp'?(c?.whatsappCredits||1):(c?.emailCredits||1); const test=key.mode==='test';
 if((test?user.testCredits:user.credits)<cost)return NextResponse.json({ok:false,error:'Insufficient credits',requiredCredits:cost},{status:402});
 const otp=code(); const v=await db.otpVerification.create({data:{userId:user.id,apiKeyId:key.id,channel:channel==='whatsapp'?ServiceType.WHATSAPP:ServiceType.EMAIL,recipient,codeHash:hash(otp),expiresAt:new Date(Date.now()+300000),credits:cost,isTest:test}});
 const sent=await deliver(channel,recipient,otp); if(!sent.ok){await db.otpVerification.update({where:{id:v.id},data:{status:'FAILED'}});return NextResponse.json({ok:false,error:sent.error,verificationId:v.id},{status:502});}
 await db.user.update({where:{id:user.id},data:test?{testCredits:{decrement:cost}}:{credits:{decrement:cost}}}); await db.apiKey.update({where:{id:key.id},data:{lastUsedAt:new Date()}}); await db.otpLog.create({data:{userId:user.id,service:channel==='whatsapp'?ServiceType.WHATSAPP:ServiceType.EMAIL,recipient,status:'SENT',provider:sent.provider,countryCode:country,credits:cost,isTest:test}});
 return NextResponse.json({ok:true,verificationId:v.id,status:'PENDING',expiresAt:v.expiresAt.toISOString(),creditsCharged:cost,mode:key.mode});
}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Internal error'},{status:500});}}
