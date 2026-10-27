import {NextRequest,NextResponse} from 'next/server';
import crypto from 'crypto';
import {getUser} from '@/lib/session';
import {db} from '@/lib/prisma';
export async function GET(){const u=await getUser();if(!u)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});const keys=await db.apiKey.findMany({where:{userId:u.id},select:{id:true,name:true,mode:true,active:true,createdAt:true,lastUsedAt:true}});return NextResponse.json({keys});}
export async function POST(req:NextRequest){const u=await getUser();if(!u)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});const b=await req.json().catch(()=>({}));const mode=b.mode==='live'?'live':'test';if(mode==='live'&&u.credits<=0)return NextResponse.json({error:'Live API requires an activated account with production credits'},{status:402});const raw=`otp_${mode}_${crypto.randomBytes(24).toString('hex')}`;await db.apiKey.create({data:{userId:u.id,name:String(b.name||'Default'),mode,keyHash:crypto.createHash('sha256').update(raw).digest('hex')}});return NextResponse.json({ok:true,apiKey:raw,warning:'Store this key now. It will not be shown again.'});}
