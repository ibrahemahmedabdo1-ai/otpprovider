import {cookies} from 'next/headers'; import {jwtVerify,SignJWT} from 'jose'; import {db} from './prisma';
const secret=new TextEncoder().encode(process.env.AUTH_SECRET||'dev-only-change-this-secret');
export async function createSession(id:string){const token=await new SignJWT({sub:id}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret); cookies().set('otp_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});}
export async function getUser(){const token=cookies().get('otp_session')?.value; if(!token)return null; try{const {payload}=await jwtVerify(token,secret); if(!payload.sub)return null; return db.user.findUnique({where:{id:String(payload.sub)}})}catch{return null}}
export async function requireUser(){const u=await getUser(); if(!u) throw new Error('UNAUTHENTICATED'); return u}
export async function requireRoles(roles:string[]){const u=await requireUser(); if(!roles.includes(u.role)) throw new Error('FORBIDDEN'); return u}
