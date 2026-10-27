# WhatsApp gateway (QR / linked device)

Turns a phone or an always-on computer into a WhatsApp sender controlled from **Admin → WhatsApp**.
It only makes outgoing HTTPS calls to your site, so no server, open port or Railway is required.

## Run it (Termux on Android, or any computer with Node 18+)
1. In the admin panel open **WhatsApp → Add a device** and copy the token (shown once).
2. `cp .env.example .env` and fill `SERVER_URL` and `GATEWAY_TOKEN`.
3. `npm install`
4. `node --env-file=.env index.js` (Node 20+; on Node 18 run `export $(cat .env | xargs) && node index.js`)
5. In the admin panel the QR appears. On the phone: WhatsApp → Settings → Linked devices → Link a device.

Add more devices (more tokens, more phones) and the platform switches between them by priority, daily limit and health.
In the admin panel you can pause, disconnect, reconnect, refresh the QR, send a test and pin a customer to one device.

## Honest limitations
- This uses an unofficial linked-device protocol. WhatsApp can disconnect or ban a number. Use a dedicated number.
- Keep the process alive (Termux: `pkg install tmux`, run inside tmux, disable battery optimisation).
- Delivery states come only from WhatsApp receipts. If a send times out the result is stored as UNKNOWN_OUTCOME and is never retried automatically.
- For guaranteed production delivery, plan to move to the official WhatsApp Business Platform.
- `auth_session/` holds the linked-session secrets. Never commit or share it.
