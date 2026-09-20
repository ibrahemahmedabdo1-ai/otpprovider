const user = guardRole("client");
let currentTicketId = null;

document.getElementById("userName").textContent = user ? `${user.name} (عميل)` : "";

// تبديل التابات
document.querySelectorAll(".sidebar a[data-tab]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".sidebar a[data-tab]").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
    document.querySelectorAll("main > section").forEach(s => s.style.display = "none");
    document.getElementById(`tab-${link.dataset.tab}`).style.display = "block";
    document.getElementById("pageTitle").textContent = link.textContent.trim();
    if (link.dataset.tab === "customers") loadCustomers();
    if (link.dataset.tab === "support") loadTickets();
    if (link.dataset.tab === "test") loadAllowance();
    if (link.dataset.tab === "orders") loadOrders();
    if (link.dataset.tab === "ledger") loadLedger();
    if (link.dataset.tab === "apikeys") loadApiKeys();
  });
});

async function loadAllowance() {
  const allowance = await apiFetch("/client/test-allowance");
  const labels = { whatsapp: "واتساب", sms: "SMS", email: "إيميل" };
  document.getElementById("allowanceBox").innerHTML = Object.entries(allowance).map(([ch, a]) => `
    <div style="display:flex;justify-content:space-between;padding:4px 0;">
      <span>${labels[ch] || ch}</span>
      <span>${a.locked ? "🔒 موقوف من الأدمن" : `متبقي ${a.remaining} رسالة اختبار مجانية`}</span>
    </div>
  `).join("");
}

async function loadOverview() {
  const me = await apiFetch("/client/me");
  document.getElementById("statBalance").textContent = me.balance;
  document.getElementById("statCountry").textContent = me.country || "-";
  const customers = await apiFetch("/client/customers");
  document.getElementById("statVerifications").textContent = customers.length;
}

async function loadPackages() {
  const packages = await apiFetch("/client/packages");
  document.getElementById("packagesGrid").innerHTML = packages.map(p => `
    <div class="card">
      ${p.popular ? '<span class="badge badge-active">الأكثر طلبًا</span>' : ""}
      <h3>${p.name}</h3>
      <p style="color:var(--muted)">${p.description || ""}</p>
      <div class="stat">$${p.price} <span style="font-size:12px;color:var(--muted);">/ ${p.credits.toLocaleString()} كريدت</span></div>
      <ul style="list-style:none;padding:0;margin:10px 0;font-size:12px;color:var(--muted);line-height:1.8;">
        ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join("")}
      </ul>
      <button class="btn btn-primary btn-sm" onclick='openBuyModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'>شراء الآن</button>
    </div>
  `).join("");
}

let selectedPackage = null;
let currentOrder = null;

async function openBuyModal(pkg) {
  selectedPackage = pkg;
  document.getElementById("buyPkgName").textContent = `شراء: ${pkg.name} — $${pkg.price}`;
  const methods = await apiFetch("/payment-methods");
  const select = document.getElementById("buyPaymentMethod");
  select.innerHTML = methods.map(m => `<option value="${m.id}">${m.label}</option>`).join("");
  document.getElementById("buySummary").textContent = `${pkg.credits.toLocaleString()} كريدت — $${pkg.price} ${pkg.currency}`;
  document.getElementById("buyModal").style.display = "flex";
}

function closeBuyModal() { document.getElementById("buyModal").style.display = "none"; }
function closePaymentModal() { document.getElementById("paymentModal").style.display = "none"; loadOrders(); }

async function submitOrder() {
  const paymentMethodId = document.getElementById("buyPaymentMethod").value;
  const couponCode = document.getElementById("buyCoupon").value.trim() || undefined;
  try {
    const { order, paymentInstructions } = await apiFetch("/client/orders", {
      method: "POST",
      body: JSON.stringify({ packageId: selectedPackage.id, paymentMethodId, couponCode })
    });
    currentOrder = order;
    closeBuyModal();
    document.getElementById("paymentInstructions").innerHTML = `
      <div>الإجمالي بعد الخصم: <b>$${order.finalPrice}</b></div>
      ${paymentInstructions.walletAddress ? `<div>عنوان المحفظة: <code>${paymentInstructions.walletAddress}</code></div>` : ""}
      ${paymentInstructions.network ? `<div>الشبكة: ${paymentInstructions.network}</div>` : ""}
      ${paymentInstructions.instructions ? `<div>${paymentInstructions.instructions}</div>` : ""}
    `;
    document.getElementById("paymentModal").style.display = "flex";
  } catch (e) {
    alert("❌ " + e.message);
  }
}

async function submitPaymentProof() {
  if (!currentOrder) return;
  const txHash = document.getElementById("payTxHash").value;
  const amount = document.getElementById("payAmount").value;
  const network = document.getElementById("payNetwork").value;
  try {
    await apiFetch(`/client/orders/${currentOrder.id}/submit-payment`, {
      method: "POST", body: JSON.stringify({ txHash, amount, network })
    });
    alert("تم إرسال إثبات الدفع — بانتظار مراجعة الأدمن، الرصيد هيتضاف بعد الاعتماد.");
    closePaymentModal();
  } catch (e) {
    alert("❌ " + e.message);
  }
}

async function loadOrders() {
  const orders = await apiFetch("/client/orders");
  const statusLabels = { pending_payment: "بانتظار الدفع", pending_review: "بانتظار المراجعة", paid: "تم الاعتماد ✅", rejected: "مرفوض ❌", cancelled: "ملغي" };
  document.getElementById("ordersBody").innerHTML = orders.map(o => `
    <tr>
      <td>${o.packageName}</td>
      <td>$${o.finalPrice}</td>
      <td>${o.paymentMethodLabel}</td>
      <td>${statusLabels[o.status] || o.status}</td>
      <td>${new Date(o.createdAt).toLocaleString()}</td>
      <td>${o.status === "pending_payment" ? `<button class="btn btn-sm" onclick='resumePayment(${JSON.stringify(o).replace(/'/g, "&apos;")})'>إتمام الدفع</button>` : ""}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"6\" style=\"text-align:center;color:var(--muted)\">لا توجد طلبات بعد</td></tr>";
}

function resumePayment(order) {
  currentOrder = order;
  document.getElementById("paymentInstructions").innerHTML = `<div>الإجمالي: <b>$${order.finalPrice}</b> — طريقة الدفع: ${order.paymentMethodLabel}</div>`;
  document.getElementById("paymentModal").style.display = "flex";
}

async function loadLedger() {
  const entries = await apiFetch("/client/ledger");
  const typeLabels = { purchase: "شراء", consume: "استهلاك", refund: "استرداد", bonus: "بونص", promo: "عرض", test: "تجربة", adjustment: "تعديل يدوي" };
  document.getElementById("ledgerBody").innerHTML = entries.map(l => `
    <tr>
      <td>${typeLabels[l.type] || l.type}</td>
      <td style="color:${l.amount >= 0 ? "#16a34a" : "#dc2626"}">${l.amount >= 0 ? "+" : ""}${l.amount}</td>
      <td>${l.balanceAfter}</td>
      <td>${l.note || ""}</td>
      <td>${new Date(l.createdAt).toLocaleString()}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"5\" style=\"text-align:center;color:var(--muted)\">لا توجد حركات بعد</td></tr>";
}

async function loadApiKeys() {
  const keys = await apiFetch("/client/api-keys");
  document.getElementById("apiKeysBody").innerHTML = keys.map(k => `
    <tr>
      <td>${k.mode === "production" ? "🔴 Production" : "🟢 Test"}</td>
      <td><code>${k.key}</code></td>
      <td>${new Date(k.createdAt).toLocaleString()}</td>
      <td>${k.revoked ? "ملغي" : `<button class="btn btn-sm" onclick="revokeApiKey('${k.id}')">إلغاء</button>`}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"4\" style=\"text-align:center;color:var(--muted)\">لا توجد مفاتيح بعد</td></tr>";
}

async function createApiKey(mode) {
  const key = await apiFetch("/client/api-keys", { method: "POST", body: JSON.stringify({ mode }) });
  document.getElementById("newKeyBox").innerHTML = `
    <div class="card" style="background:#fffbeb;">
      ⚠️ احفظ المفتاح ده الآن، مش هيظهر تاني: <br><code>${key.key}</code>
    </div>`;
  loadApiKeys();
}

async function revokeApiKey(id) {
  if (!confirm("إلغاء هذا المفتاح؟")) return;
  await apiFetch(`/client/api-keys/${id}`, { method: "DELETE" });
  loadApiKeys();
}

async function sendTest() {
  const channel = document.getElementById("testChannel").value;
  const recipient = document.getElementById("testRecipient").value;
  const resultBox = document.getElementById("testResult");
  if (!recipient) return alert("أدخل المستلم أولاً");
  resultBox.textContent = "جارٍ الإرسال...";
  try {
    const data = await apiFetch("/client/test", { method: "POST", body: JSON.stringify({ channel, recipient }) });
    resultBox.innerHTML = data.result.ok
      ? `✅ تم الإرسال بنجاح.`
      : `⚠️ محاكاة إرسال (القناة غير مفعّلة بعد بمفاتيح حقيقية): ${data.result.message || ""}`;
    loadAllowance();
  } catch (e) {
    resultBox.textContent = "❌ " + e.message;
  }
}

async function loadCustomers() {
  const list = await apiFetch("/client/customers");
  document.getElementById("customersBody").innerHTML = list.map(v => `
    <tr>
      <td>${v.channel}</td>
      <td>${v.recipient}</td>
      <td><span class="badge badge-${v.status}">${v.status}</span></td>
      <td>${new Date(v.createdAt).toLocaleString()}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"4\" style=\"text-align:center;color:var(--muted)\">لا توجد بيانات بعد</td></tr>";
}

async function loadTickets() {
  const tickets = await apiFetch("/client/tickets");
  document.getElementById("ticketsList").innerHTML = tickets.map(t => `
    <div class="card" style="margin-bottom:8px;cursor:pointer;padding:12px;" onclick="openTicket('${t.id}')">
      <div style="font-size:13px;font-weight:600;">${t.subject}</div>
      <span class="badge badge-${t.status}">${t.status}</span>
    </div>
  `).join("") || "<p style=\"color:var(--muted);font-size:13px;\">لا توجد تذاكر بعد</p>";
  if (tickets.length && !currentTicketId) openTicket(tickets[0].id);
}

async function newTicket() {
  const subject = prompt("موضوع التذكرة:");
  if (!subject) return;
  const ticket = await apiFetch("/client/tickets", { method: "POST", body: JSON.stringify({ subject }) });
  await loadTickets();
  openTicket(ticket.id);
}

async function openTicket(id) {
  currentTicketId = id;
  const messages = await apiFetch(`/client/tickets/${id}/messages`);
  renderMessages(messages);
}

function renderMessages(messages) {
  document.getElementById("chatMessages").innerHTML = messages.map(m => `
    <div class="msg ${m.senderRole === "client" ? "mine" : "theirs"}">
      ${m.message ? m.message : ""}
      ${m.fileUrl ? `<br><a href="${m.fileUrl}" target="_blank" style="text-decoration:underline;">📎 مرفق</a>` : ""}
    </div>
  `).join("");
}

async function sendMessage() {
  if (!currentTicketId) return alert("افتح تذكرة أولاً");
  const text = document.getElementById("chatText").value;
  const fileInput = document.getElementById("chatFile");
  const formData = new FormData();
  formData.append("message", text);
  if (fileInput.files[0]) formData.append("file", fileInput.files[0]);

  await apiFetch(`/client/tickets/${currentTicketId}/messages`, { method: "POST", body: formData });
  document.getElementById("chatText").value = "";
  fileInput.value = "";
  openTicket(currentTicketId);
}

loadOverview();
loadPackages();
