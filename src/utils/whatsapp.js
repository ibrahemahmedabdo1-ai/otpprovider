const QRCode = require("qrcode");
const { readDb, writeDb } = require("./db");

let Client;
let LocalAuth;
try {
  ({ Client, LocalAuth } = require("whatsapp-web.js"));
} catch (error) {
  // Keep the application loadable until dependencies are installed.
  Client = null;
  LocalAuth = null;
  console.warn("whatsapp-web.js is not installed. WhatsApp device features are unavailable until npm install completes.");
}

const clients = new Map();
const qrCodes = new Map();
const statuses = new Map();

function assertDependency() {
  if (!Client || !LocalAuth) {
    const error = new Error("whatsapp-web.js is not installed. Run: npm install whatsapp-web.js qrcode");
    error.code = "WHATSAPP_DEPENDENCY_MISSING";
    throw error;
  }
}

function normalizeDeviceId(deviceId) {
  return String(deviceId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) throw new Error("A valid international phone number is required");
  return `${digits}@c.us`;
}

function initializeWhatsAppDevice(deviceId, onQrGenerated, onReady) {
  assertDependency();
  const normalizedId = normalizeDeviceId(deviceId);
  if (!normalizedId) throw new Error("Device ID is required");

  if (clients.has(normalizedId)) return clients.get(normalizedId);

  statuses.set(normalizedId, "initializing");
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: normalizedId }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    }
  });

  client.on("qr", async (qr) => {
    try {
      const qrImageUrl = await QRCode.toDataURL(qr);
      qrCodes.set(normalizedId, qrImageUrl);
      statuses.set(normalizedId, "waiting_for_scan");
      if (typeof onQrGenerated === "function") onQrGenerated(qrImageUrl);
    } catch (error) {
      statuses.set(normalizedId, "error");
      console.error(`Failed to generate QR for ${normalizedId}:`, error);
    }
  });

  client.on("ready", async () => {
    statuses.set(normalizedId, "ready");
    qrCodes.delete(normalizedId);
    try {
      const db = await readDb();
      db.settings.whatsappConnected = true;
      db.settings.whatsappQr = null;
      await writeDb(db);
    } catch (error) {
      console.error("Failed to persist WhatsApp ready state:", error);
    }
    if (typeof onReady === "function") onReady();
  });

  client.on("auth_failure", (message) => {
    statuses.set(normalizedId, "auth_failure");
    console.error(`WhatsApp auth failure for ${normalizedId}:`, message);
  });

  client.on("disconnected", (reason) => {
    statuses.set(normalizedId, "disconnected");
    clients.delete(normalizedId);
    qrCodes.delete(normalizedId);
    console.log(`WhatsApp device ${normalizedId} disconnected:`, reason);
  });

  clients.set(normalizedId, client);
  client.initialize().catch((error) => {
    statuses.set(normalizedId, "error");
    console.error(`Failed to initialize WhatsApp device ${normalizedId}:`, error);
  });
  return client;
}

async function sendWhatsAppOTP(deviceId, phone, message) {
  const normalizedId = normalizeDeviceId(deviceId);
  const client = clients.get(normalizedId);
  if (!client) throw new Error(`WhatsApp device ${normalizedId} is not connected or initialized`);
  if (statuses.get(normalizedId) !== "ready") throw new Error(`WhatsApp device ${normalizedId} is not ready`);
  return client.sendMessage(normalizePhone(phone), String(message || ""));
}

function getDeviceQR(deviceId) {
  return qrCodes.get(normalizeDeviceId(deviceId)) || null;
}

function getDeviceStatus(deviceId) {
  const normalizedId = normalizeDeviceId(deviceId);
  return statuses.get(normalizedId) || "not_initialized";
}

async function generateConnectQr(deviceId = "default") {
  const normalizedId = normalizeDeviceId(deviceId) || "default";
  initializeWhatsAppDevice(normalizedId);
  const qr = getDeviceQR(normalizedId);
  return { deviceId: normalizedId, status: getDeviceStatus(normalizedId), qr };
}

async function confirmConnected() {
  const db = await readDb();
  db.settings.whatsappConnected = true;
  db.settings.whatsappQr = null;
  await writeDb(db);
  return true;
}

async function disconnect(deviceId = "default") {
  const normalizedId = normalizeDeviceId(deviceId) || "default";
  const client = clients.get(normalizedId);
  if (client) {
    try { await client.logout(); } catch (error) { console.warn("WhatsApp logout warning:", error.message); }
    try { await client.destroy(); } catch (error) { console.warn("WhatsApp destroy warning:", error.message); }
  }
  clients.delete(normalizedId);
  qrCodes.delete(normalizedId);
  statuses.set(normalizedId, "disconnected");
  const db = await readDb();
  db.settings.whatsappConnected = false;
  db.settings.whatsappQr = null;
  await writeDb(db);
  return true;
}

module.exports = {
  initializeWhatsAppDevice,
  sendWhatsAppOTP,
  getDeviceQR,
  getDeviceStatus,
  generateConnectQr,
  confirmConnected,
  disconnect,
  clients
};
