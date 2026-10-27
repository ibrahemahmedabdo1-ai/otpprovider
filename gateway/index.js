/**
 * OTPProvider WhatsApp gateway (linked-device / QR mode).
 * Runs on a phone (Termux) or any always-on computer. It never receives inbound connections:
 * it polls the platform over HTTPS, so no open ports or Railway are needed.
 *
 * Linked-device sessions can expire or be revoked by WhatsApp at any time and this is not the official
 * Business Platform. Use a dedicated number and keep volume modest.
 */
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = (process.env.SERVER_URL || '').replace(/\/$/, '');
const TOKEN = process.env.GATEWAY_TOKEN || '';
if (!SERVER || !/^gw_[a-f0-9]{48}$/.test(TOKEN)) {
  console.error('Set SERVER_URL and GATEWAY_TOKEN (copy .env.example). The token comes from Admin > WhatsApp.');
  process.exit(1);
}

const VERSION = '1.0.0';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(DIR, 'auth_session');
const LOCK = path.join(DIR, '.gateway.lock');
const log = pino({ level: 'silent' });

// ── single instance per folder: two workers would double-send ──
try {
  if (fs.existsSync(LOCK)) {
    const pid = Number(fs.readFileSync(LOCK, 'utf8'));
    let alive = false;
    try { process.kill(pid, 0); alive = pid !== process.pid; } catch { alive = false; }
    if (alive) { console.error(`Another gateway is already running here (pid ${pid}).`); process.exit(1); }
  }
  fs.writeFileSync(LOCK, String(process.pid), { mode: 0o600 });
  const cleanup = () => { try { fs.unlinkSync(LOCK); } catch {} };
  process.on('exit', cleanup);
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));
} catch (e) { console.error('Lock error:', e.message); process.exit(1); }

let sock = null;
let state = { status: 'DISCONNECTED', qr: null, phone: null, error: null };
let manualOff = false;          // admin pressed Disconnect: stay offline until RECONNECT
let starting = false;
const sentIds = new Map();      // whatsapp message id -> platform request id (for delivery receipts)

async function api(method, route, body) {
  const res = await fetch(SERVER + route, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) { console.error('Token rejected by the server (rotated or device deleted). Stopping.'); process.exit(2); }
  return res.ok ? res.json().catch(() => ({})) : null;
}

const heartbeat = () => api('POST', '/api/gateway/heartbeat', { ...state, version: VERSION }).catch(() => null);
const report = (id, status, extra = {}) => api('POST', '/api/gateway/report', { id, status, ...extra }).catch(() => null);

const toJid = (phone) => phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';

async function start() {
  if (starting || manualOff) return;
  starting = true;
  try {
    const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    try { fs.chmodSync(AUTH_DIR, 0o700); } catch {}
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
    sock = makeWASocket({ auth, version, logger: log, printQRInTerminal: false, browser: ['OTPProvider', 'Chrome', '1.0'], markOnlineOnConnect: false });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) { state = { ...state, status: 'PAIRING', qr, error: null }; await heartbeat(); }
      if (connection === 'open') {
        state = { status: 'CONNECTED', qr: null, phone: '+' + (sock.user?.id || '').split(':')[0].split('@')[0], error: null };
        console.log('Connected as', state.phone);
        await heartbeat();
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        state = { ...state, status: 'DISCONNECTED', qr: null, error: loggedOut ? 'Logged out from the phone. Scan a new QR.' : `Connection closed (${code ?? 'unknown'})` };
        await heartbeat();
        sock = null; starting = false;
        if (loggedOut) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        if (!manualOff) setTimeout(start, loggedOut ? 1000 : 5000);
      }
    });

    // delivery receipts: 3 = delivered to device, 4 = read
    sock.ev.on('messages.update', async (updates) => {
      for (const u of updates) {
        const id = u.key?.id; const reqId = id && sentIds.get(id);
        if (!reqId || !u.key.fromMe) continue;
        if (u.update?.status === 3) await report(reqId, 'DELIVERED', { providerMessageId: id });
        if (u.update?.status === 4) { await report(reqId, 'READ', { providerMessageId: id }); sentIds.delete(id); }
      }
    });
  } catch (e) {
    state = { ...state, status: 'DISCONNECTED', error: String(e.message).slice(0, 200) };
    sock = null;
    setTimeout(start, 8000);
  } finally { starting = false; }
}

async function sendText(to, text) {
  const jid = toJid(to);
  const exists = await sock.onWhatsApp(jid).catch(() => null);
  if (exists && exists.length === 0) return { outcome: 'REJECTED', error: 'Number is not on WhatsApp' };
  try {
    const r = await sock.sendMessage(jid, { text });
    return { outcome: 'SUBMITTED', id: r?.key?.id };
  } catch (e) {
    // We cannot know whether WhatsApp accepted it, so never report a plain failure and never auto-retry.
    return { outcome: 'UNKNOWN_OUTCOME', error: String(e.message).slice(0, 200) };
  }
}

let busy = false;
async function pollJobs() {
  if (busy || !sock || state.status !== 'CONNECTED') return;
  busy = true;
  try {
    const r = await api('POST', '/api/gateway/jobs');
    for (const job of r?.jobs ?? []) {
      const out = await sendText(job.to, job.text);
      if (out.outcome === 'SUBMITTED') { if (out.id) sentIds.set(out.id, job.id); await report(job.id, 'SUBMITTED', { providerMessageId: out.id }); }
      else await report(job.id, out.outcome, { error: out.error });
      await new Promise((r2) => setTimeout(r2, 1500 + Math.random() * 1500)); // gentle pacing
    }
  } finally { busy = false; }
}

async function pollCommands() {
  const r = await api('GET', '/api/gateway/commands');
  for (const c of r?.commands ?? []) {
    let ok = true, result = 'ok';
    try {
      if (c.type === 'DISCONNECT') { manualOff = true; try { sock?.end(undefined); } catch {} sock = null; state = { ...state, status: 'DISCONNECTED', qr: null, error: 'Disconnected by admin' }; await heartbeat(); }
      else if (c.type === 'RECONNECT') { manualOff = false; if (!sock) await start(); }
      else if (c.type === 'REFRESH_QR') { if (state.status !== 'CONNECTED') { try { sock?.end(undefined); } catch {} sock = null; starting = false; manualOff = false; await start(); } else { ok = false; result = 'Already connected'; } }
      else if (c.type === 'TEST_MESSAGE') {
        if (!sock || state.status !== 'CONNECTED') { ok = false; result = 'Not connected'; }
        else { const o = await sendText(String(c.payload?.to || ''), String(c.payload?.text || 'Test')); ok = o.outcome === 'SUBMITTED'; result = ok ? 'sent' : (o.error || o.outcome); }
      }
    } catch (e) { ok = false; result = String(e.message).slice(0, 200); }
    await api('POST', '/api/gateway/commands', { id: c.id, ok, result });
  }
}

console.log(`OTPProvider gateway ${VERSION} -> ${SERVER}`);
await start();
setInterval(heartbeat, 15000);
setInterval(() => pollJobs().catch(() => {}), 3000);
setInterval(() => pollCommands().catch(() => {}), 4000);
