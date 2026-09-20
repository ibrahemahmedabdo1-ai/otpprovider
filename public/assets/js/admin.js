const user = guardRole("admin");
let currentClientId = null;

document.getElementById("userName").textContent = user ? `${user.name} (أدمن)` : "";

document.querySelectorAll(".sidebar a[data-tab]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".sidebar a[data-tab]").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
    document.querySelectorAll("main > section").forEach(s => s.style.display = "none");
    document.getElementById(`tab-${link.dataset.tab}`).style.display = "block";
    document.getElementById("pageTitle").textContent = link.textContent.trim();

    if (link.dataset.tab === "packages") loadPackages();
    if (link.dataset.tab === "billing") switchBillingSub("rules");
    if (link.dataset.tab === "pricing") loadPricing();
    if (link.dataset.tab === "templates") loadTemplates();
    if (link.dataset.tab === "settings") loadSettingsCheck();
    if (link.dataset.tab === "languages") loadLanguages();
    if (link.dataset.tab === "team") loadStaff();
    if (link.dataset.tab === "tickets") loadAllTickets();
    if (link.dataset.tab === "health") detectSystemErrors();
  });
});

// ---- العملاء والخدمات ----
async function loadClients() {
  const users = await apiFetch("/admin/users");
  const clients = users.filter(u => u.role === "client");
  document.getElementById("clientsBody").innerHTML = clients.map(c => `
    <tr>
      <td>${c.name}</td><td>${c.email}</td><td>${c.balance}</td>
      <td><button class="btn btn-outline btn-sm" onclick="viewClientServices('${c.id}','${c.name.replace(/'/g, "")}')">إدارة الخدمات</button></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${c.id}')">حذف</button></td>
    </tr>
  `).join("");
}

async function deleteUser(id) {
  if (!confirm("تأكيد حذف هذا المستخدم نهائيًا؟")) return;
  try {
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    loadClients();
    loadStaff();
  } catch (e) {
    alert(e.message);
  }
}

async function viewClientServices(id, name) {
  currentClientId = id;
  document.getElementById("clientServicesBox").style.display = "block";
  document.getElementById("csClientName").textContent = name;
  const services = await apiFetch(`/admin/clients/${id}/services`);
  renderServices(services);
  const users = await apiFetch("/admin/users");
  const client = users.find(u => u.id === id);
  renderAllowanceControls(client?.testAllowance || {});
}

function renderAllowanceControls(allowance) {
  const labels = { whatsapp: "واتساب", sms: "SMS", email: "إيميل" };
  document.getElementById("allowanceControls").innerHTML = Object.entries(allowance).map(([ch, a]) => `
    <div class="toggle-row">
      <span>${labels[ch] || ch}</span>
      <span style="display:flex;align-items:center;gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="adjustAllowance('${ch}', -1)">−</button>
        <strong>${a.remaining}</strong>
        <button class="btn btn-outline btn-sm" onclick="adjustAllowance('${ch}', 1)">+</button>
        <button class="btn ${a.locked ? "btn-primary" : "btn-danger"} btn-sm" onclick="toggleAllowanceLock('${ch}', ${!a.locked})">${a.locked ? "فتح" : "قفل"}</button>
      </span>
    </div>
  `).join("");
}

async function adjustAllowance(channel, delta) {
  const users = await apiFetch("/admin/users");
  const client = users.find(u => u.id === currentClientId);
  const current = client.testAllowance[channel].remaining;
  const allowance = await apiFetch(`/admin/clients/${currentClientId}/test-allowance`, {
    method: "POST", body: JSON.stringify({ channel, remaining: current + delta })
  });
  renderAllowanceControls(allowance);
}

async function toggleAllowanceLock(channel, locked) {
  const allowance = await apiFetch(`/admin/clients/${currentClientId}/test-allowance`, {
    method: "POST", body: JSON.stringify({ channel, locked })
  });
  renderAllowanceControls(allowance);
}

function renderServices(services) {
  document.getElementById("servicesBody").innerHTML = services.map(s => `
    <tr>
      <td>${s.name}</td><td>${s.channel}</td>
      <td><span class="badge badge-${s.status}">${s.status}</span></td>
      <td>${s.billing}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toggleService('${s.id}')">${s.status === "active" ? "تعطيل" : "تفعيل"}</button>
        <button class="btn btn-outline btn-sm" onclick="toggleBilling('${s.id}','${s.billing === "free" ? "paid" : "free"}')">${s.billing === "free" ? "اجعله مدفوع" : "اجعله مجاني"}</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan=\"5\" style=\"color:var(--muted)\">لا توجد خدمات بعد</td></tr>";
}

async function addService() {
  const name = document.getElementById("newServiceName").value;
  const channel = document.getElementById("newServiceChannel").value;
  const billing = document.getElementById("newServiceBilling").value;
  if (!name || !currentClientId) return alert("اختر عميل واسم خدمة");
  await apiFetch(`/admin/clients/${currentClientId}/services`, { method: "POST", body: JSON.stringify({ name, channel, billing }) });
  document.getElementById("newServiceName").value = "";
  viewClientServices(currentClientId, document.getElementById("csClientName").textContent);
}

async function toggleService(id) {
  await apiFetch(`/admin/services/${id}/toggle`, { method: "POST" });
  viewClientServices(currentClientId, document.getElementById("csClientName").textContent);
}

async function toggleBilling(id, billing) {
  await apiFetch(`/admin/services/${id}/billing`, { method: "POST", body: JSON.stringify({ billing }) });
  viewClientServices(currentClientId, document.getElementById("csClientName").textContent);
}

// ---- الباكدجات ----
async function loadPackages() {
  const packages = await apiFetch("/admin/packages");
  document.getElementById("packagesGrid").innerHTML = packages.map(p => `
    <div class="card">
      ${p.popular ? '<span class="badge badge-active">الأكثر طلبًا</span>' : ""}
      <span class="badge badge-${p.active ? "active" : "pending"}">${p.active ? "مفعّل" : "معطّل"}</span>
      <h3>${p.name}</h3>
      <p style="color:var(--muted)">${p.description || ""}</p>
      <div class="stat">$${p.price} <span style="font-size:12px;color:var(--muted);">/ ${p.credits.toLocaleString()} كريدت</span></div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="togglePackageActive('${p.id}', ${!p.active})">${p.active ? "تعطيل" : "تفعيل"}</button>
        <button class="btn btn-outline btn-sm" onclick="togglePackagePopular('${p.id}', ${!p.popular})">${p.popular ? "إلغاء الأكثر طلبًا" : "اجعله الأكثر طلبًا"}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePackage('${p.id}')">حذف</button>
      </div>
    </div>
  `).join("");
}

async function addPackage() {
  const name = document.getElementById("pkgName").value;
  const credits = Number(document.getElementById("pkgCredits").value || 0);
  const price = Number(document.getElementById("pkgPrice").value || 0);
  const description = document.getElementById("pkgDesc").value;
  const popular = document.getElementById("pkgPopular").checked;
  if (!name) return alert("أدخل اسم الباكدج");
  await apiFetch("/admin/packages", {
    method: "POST",
    body: JSON.stringify({ name, credits, price, description, popular, currency: "USD", channels: { whatsapp: true, email: true }, apiAccess: true, webhooks: true, features: [] })
  });
  document.getElementById("pkgName").value = "";
  document.getElementById("pkgCredits").value = "";
  document.getElementById("pkgPrice").value = "";
  document.getElementById("pkgDesc").value = "";
  document.getElementById("pkgPopular").checked = false;
  loadPackages();
}

async function togglePackageActive(id, active) {
  await apiFetch(`/admin/packages/${id}`, { method: "PUT", body: JSON.stringify({ active }) });
  loadPackages();
}

async function togglePackagePopular(id, popular) {
  await apiFetch(`/admin/packages/${id}`, { method: "PUT", body: JSON.stringify({ popular }) });
  loadPackages();
}

async function deletePackage(id) {
  if (!confirm("تأكيد حذف الباكدج؟")) return;
  await apiFetch(`/admin/packages/${id}`, { method: "DELETE" });
  loadPackages();
}

// ==================== الفوترة والتسعير ====================
function switchBillingSub(name) {
  document.querySelectorAll(".billing-sub").forEach(s => s.style.display = "none");
  document.getElementById(`billing-${name}`).style.display = "block";
  document.querySelectorAll("[data-billing-sub]").forEach(b => b.classList.toggle("btn-primary", b.dataset.billingSub === name));

  if (name === "rules") loadPricingRules();
  if (name === "coupons") loadCoupons();
  if (name === "paymentmethods") loadPaymentMethods();
  if (name === "orders") loadAdminOrders();
  if (name === "ledger") loadAdminLedger();
  if (name === "audit") loadAuditLog();
  if (name === "profit") loadProfitAnalytics();
}

// ---- قواعد التسعير ----
async function loadPricingRules() {
  const rules = await apiFetch("/admin/pricing-rules");
  const labels = { whatsapp: "واتساب", email: "إيميل" };
  document.getElementById("pricingRulesBody").innerHTML = rules.map(r => `
    <tr>
      <td>${labels[r.channel] || r.channel}</td>
      <td>$${r.providerCost}</td>
      <td>$${r.customerCost}</td>
      <td>${r.creditCost}</td>
      <td><span class="badge badge-${r.active ? "active" : "pending"}">${r.active ? "مفعّل" : "معطّل"}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="togglePricingRule('${r.id}', ${!r.active})">${r.active ? "تعطيل" : "تفعيل"}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePricingRule('${r.id}')">حذف</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan=\"6\" style=\"color:var(--muted)\">لا توجد قواعد بعد</td></tr>";
}

async function addPricingRule() {
  const channel = document.getElementById("ruleChannel").value;
  const providerCost = Number(document.getElementById("ruleProviderCost").value || 0);
  const customerCost = Number(document.getElementById("ruleCustomerCost").value || 0);
  const creditCost = Number(document.getElementById("ruleCreditCost").value || 1);
  await apiFetch("/admin/pricing-rules", { method: "POST", body: JSON.stringify({ channel, providerCost, customerCost, creditCost, currency: "USD" }) });
  loadPricingRules();
}

async function togglePricingRule(id, active) {
  await apiFetch(`/admin/pricing-rules/${id}`, { method: "PUT", body: JSON.stringify({ active }) });
  loadPricingRules();
}

async function deletePricingRule(id) {
  if (!confirm("تأكيد حذف القاعدة؟")) return;
  await apiFetch(`/admin/pricing-rules/${id}`, { method: "DELETE" });
  loadPricingRules();
}

// ---- الكوبونات ----
async function loadCoupons() {
  const coupons = await apiFetch("/admin/coupons");
  document.getElementById("couponsBody").innerHTML = coupons.map(c => `
    <tr>
      <td>${c.code}</td>
      <td>${c.type === "percentage" ? "نسبة" : "قيمة ثابتة"}</td>
      <td>${c.value}${c.type === "percentage" ? "%" : "$"}</td>
      <td>${c.bonusCredits || 0}</td>
      <td>${c.usedCount || 0} / ${c.maxUses ?? "∞"}</td>
      <td><span class="badge badge-${c.active ? "active" : "pending"}">${c.active ? "مفعّل" : "معطّل"}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toggleCoupon('${c.id}', ${!c.active})">${c.active ? "تعطيل" : "تفعيل"}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCoupon('${c.id}')">حذف</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan=\"7\" style=\"color:var(--muted)\">لا توجد كوبونات بعد</td></tr>";
}

async function addCoupon() {
  const code = document.getElementById("couponCode").value.trim();
  const type = document.getElementById("couponType").value;
  const value = Number(document.getElementById("couponValue").value || 0);
  const bonusCredits = Number(document.getElementById("couponBonus").value || 0);
  const maxUses = document.getElementById("couponMaxUses").value ? Number(document.getElementById("couponMaxUses").value) : null;
  const expirationDate = document.getElementById("couponExpiry").value || null;
  if (!code) return alert("أدخل كود الكوبون");
  try {
    await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify({ code, type, value, bonusCredits, maxUses, expirationDate }) });
    document.getElementById("couponCode").value = "";
    document.getElementById("couponValue").value = "";
    document.getElementById("couponBonus").value = "";
    document.getElementById("couponMaxUses").value = "";
    loadCoupons();
  } catch (e) { alert("❌ " + e.message); }
}

async function toggleCoupon(id, active) {
  await apiFetch(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify({ active }) });
  loadCoupons();
}

async function deleteCoupon(id) {
  if (!confirm("تأكيد حذف الكوبون؟")) return;
  await apiFetch(`/admin/coupons/${id}`, { method: "DELETE" });
  loadCoupons();
}

// ---- طرق الدفع ----
async function loadPaymentMethods() {
  const methods = await apiFetch("/admin/payment-methods");
  document.getElementById("paymentMethodsBox").innerHTML = methods.map(m => `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h4>${m.label}</h4>
        <button class="btn ${m.enabled ? "btn-danger" : "btn-primary"} btn-sm" onclick="togglePaymentMethod('${m.id}', ${!m.enabled})">${m.enabled ? "تعطيل" : "تفعيل"}</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <input id="pm-wallet-${m.id}" placeholder="عنوان المحفظة / الحساب" value="${m.walletAddress || ""}" style="flex:1;min-width:220px;padding:8px;border-radius:8px;border:1px solid var(--border);">
        <input id="pm-network-${m.id}" placeholder="الشبكة (مثلاً TRC20)" value="${m.network || ""}" style="width:150px;padding:8px;border-radius:8px;border:1px solid var(--border);">
        <input id="pm-min-${m.id}" type="number" placeholder="أقل مبلغ" value="${m.minPayment || 0}" style="width:110px;padding:8px;border-radius:8px;border:1px solid var(--border);">
      </div>
      <textarea id="pm-instructions-${m.id}" placeholder="تعليمات الدفع للعميل" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--border);">${m.instructions || ""}</textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="savePaymentMethod('${m.id}')">حفظ</button>
    </div>
  `).join("");
}

async function togglePaymentMethod(id, enabled) {
  await apiFetch(`/admin/payment-methods/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) });
  loadPaymentMethods();
}

async function savePaymentMethod(id) {
  const walletAddress = document.getElementById(`pm-wallet-${id}`).value;
  const network = document.getElementById(`pm-network-${id}`).value;
  const minPayment = Number(document.getElementById(`pm-min-${id}`).value || 0);
  const instructions = document.getElementById(`pm-instructions-${id}`).value;
  await apiFetch(`/admin/payment-methods/${id}`, { method: "PUT", body: JSON.stringify({ walletAddress, network, minPayment, instructions }) });
  alert("تم الحفظ");
}

// ---- طلبات الشراء (اعتماد الدفعات اليدوية) ----
async function loadAdminOrders() {
  const orders = await apiFetch("/admin/orders");
  const users = await apiFetch("/admin/users");
  const statusLabels = { pending_payment: "بانتظار الدفع", pending_review: "بانتظار المراجعة", paid: "تم الاعتماد ✅", rejected: "مرفوض ❌", cancelled: "ملغي" };
  document.getElementById("ordersBody").innerHTML = orders.map(o => {
    const customer = users.find(u => u.id === o.customerId);
    return `
    <tr>
      <td>${customer ? customer.name : o.customerId}</td>
      <td>${o.packageName}</td>
      <td>$${o.finalPrice}</td>
      <td>${o.paymentMethodLabel}</td>
      <td>${o.payment ? `TX: ${o.payment.txHash || "-"} / ${o.payment.amount || "-"} ${o.payment.network || ""}` : "-"}</td>
      <td>${statusLabels[o.status] || o.status}</td>
      <td>${o.status === "pending_review" ? `
        <button class="btn btn-primary btn-sm" onclick="approveOrder('${o.id}')">اعتماد</button>
        <button class="btn btn-danger btn-sm" onclick="rejectOrder('${o.id}')">رفض</button>
      ` : ""}</td>
    </tr>`;
  }).join("") || "<tr><td colspan=\"7\" style=\"color:var(--muted)\">لا توجد طلبات بعد</td></tr>";
}

async function approveOrder(id) {
  if (!confirm("تأكيد اعتماد الدفعة وإضافة الرصيد للعميل؟")) return;
  try {
    await apiFetch(`/admin/orders/${id}/approve`, { method: "POST" });
    loadAdminOrders();
  } catch (e) { alert("❌ " + e.message); }
}

async function rejectOrder(id) {
  const reason = prompt("سبب الرفض (اختياري):") || "";
  await apiFetch(`/admin/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
  loadAdminOrders();
}

// ---- سجل الرصيد وسجل المراجعة ----
async function loadAdminLedger() {
  const entries = await apiFetch("/admin/ledger");
  const users = await apiFetch("/admin/users");
  document.getElementById("adminLedgerBody").innerHTML = entries.map(l => {
    const customer = users.find(u => u.id === l.customerId);
    return `
    <tr>
      <td>${customer ? customer.name : l.customerId}</td>
      <td>${l.type}</td>
      <td style="color:${l.amount >= 0 ? "#16a34a" : "#dc2626"}">${l.amount >= 0 ? "+" : ""}${l.amount}</td>
      <td>${l.balanceAfter}</td>
      <td>${l.note || ""}</td>
      <td>${new Date(l.createdAt).toLocaleString()}</td>
    </tr>`;
  }).join("") || "<tr><td colspan=\"6\" style=\"color:var(--muted)\">لا توجد حركات بعد</td></tr>";
}

async function loadAuditLog() {
  const logs = await apiFetch("/admin/audit-log");
  document.getElementById("auditLogBody").innerHTML = logs.map(a => `
    <tr><td>${a.adminId}</td><td>${a.action}</td><td>${new Date(a.createdAt).toLocaleString()}</td></tr>
  `).join("") || "<tr><td colspan=\"3\" style=\"color:var(--muted)\">لا يوجد سجل بعد</td></tr>";
}

// ---- تحليلات الربح ----
async function loadProfitAnalytics() {
  const stats = await apiFetch("/admin/profit-analytics");
  const labels = { today: "اليوم", yesterday: "أمس", last7Days: "آخر 7 أيام", last30Days: "آخر 30 يوم", currentMonth: "الشهر الحالي", previousMonth: "الشهر السابق" };
  document.getElementById("profitGrid").innerHTML = Object.entries(stats).map(([key, s]) => `
    <div class="card">
      <h4>${labels[key] || key}</h4>
      <div style="font-size:12px;color:var(--muted);line-height:2;">
        <div>الإيرادات: <b>$${s.revenue}</b></div>
        <div>تكلفة المزوّد: <b>$${s.providerCost}</b></div>
        <div>الربح: <b>$${s.grossProfit}</b> (${s.profitPercent}%)</div>
        <div>كريدت مباع: <b>${s.creditsSold}</b></div>
        <div>كريدت مستهلك: <b>${s.creditsConsumed}</b></div>
        <div>عدد الرسائل: <b>${s.otpCount}</b></div>
      </div>
    </div>
  `).join("");
}

// ---- التسعير القديم ----
async function loadPricing() {
  const pricing = await apiFetch("/admin/pricing");
  const labels = { whatsapp: "واتساب", sms: "SMS", email: "إيميل", bundle: "مجمع" };
  document.getElementById("pricingBox").innerHTML = Object.entries(pricing).map(([channel, tiers]) => `
    <div class="card" style="margin-bottom:16px;">
      <h4>${labels[channel] || channel}</h4>
      <table>
        <thead><tr><th>الكمية</th><th>السعر</th><th></th></tr></thead>
        <tbody>
          ${tiers.map((t, i) => `
            <tr><td>${t.qty}</td><td>${t.price}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deletePricingTier('${channel}', ${i})">حذف</button></td></tr>
          `).join("")}
        </tbody>
      </table>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <input id="pt-qty-${channel}" type="number" placeholder="الكمية" style="width:100px;padding:8px;border-radius:8px;border:1px solid var(--border);">
        <input id="pt-price-${channel}" type="number" step="0.01" placeholder="السعر" style="width:100px;padding:8px;border-radius:8px;border:1px solid var(--border);">
        <button class="btn btn-primary btn-sm" onclick="addPricingTier('${channel}')">+ إضافة</button>
      </div>
    </div>
  `).join("");
}

async function addPricingTier(channel) {
  const qty = document.getElementById(`pt-qty-${channel}`).value;
  const price = document.getElementById(`pt-price-${channel}`).value;
  if (!qty || !price) return alert("أدخل الكمية والسعر");
  await apiFetch(`/admin/pricing/${channel}`, { method: "POST", body: JSON.stringify({ qty, price }) });
  loadPricing();
}

async function deletePricingTier(channel, index) {
  await apiFetch(`/admin/pricing/${channel}/${index}`, { method: "DELETE" });
  loadPricing();
}

// ---- قوالب OTP ----
async function loadTemplates() {
  const templates = await apiFetch("/admin/templates");
  document.getElementById("templatesBox").innerHTML = templates.map(t => `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;">
        <strong>${t.channel}</strong>
        <span class="badge badge-${t.status}">${t.status}</span>
      </div>
      <p style="font-size:13px;">${t.body}</p>
      ${t.pendingBody ? `
        <div style="background:#FFFBEB;padding:10px;border-radius:8px;font-size:13px;margin-top:8px;">
          <strong>تعديل مقترح من السبورت:</strong><br>${t.pendingBody}<br><br>
          <button class="btn btn-primary btn-sm" onclick="approveTemplate('${t.id}')">اعتماد</button>
          <button class="btn btn-outline btn-sm" onclick="rejectTemplate('${t.id}')">رفض</button>
        </div>` : ""}
    </div>
  `).join("");
}

async function approveTemplate(id) {
  await apiFetch(`/admin/templates/${id}/approve`, { method: "POST" });
  loadTemplates();
}
async function rejectTemplate(id) {
  await apiFetch(`/admin/templates/${id}/reject`, { method: "POST" });
  loadTemplates();
}

// ---- واتساب QR ----
async function connectWhatsapp() {
  const data = await apiFetch("/admin/whatsapp/connect", { method: "POST" });
  document.getElementById("qrBox").innerHTML = `<img src="${data.qr}" alt="QR">`;
  document.getElementById("waStatus").innerHTML = `<span class="badge badge-pending">بانتظار المسح</span>`;
}

// ---- إعدادات الربط (فحص حالة القنوات) ----
async function loadSettingsCheck() {
  // ملاحظة: القيم الفعلية تُقرأ من متغيرات البيئة في السيرفر، هنا عرض توضيحي فقط
  document.getElementById("chk-twilio-sms").innerHTML = `<span class="badge badge-pending">أضف TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN في .env</span>`;
  document.getElementById("chk-twilio-wa").innerHTML = `<span class="badge badge-pending">أضف TWILIO_WHATSAPP_FROM في .env</span>`;
  document.getElementById("chk-ims").innerHTML = `<span class="badge badge-pending">أضف IMS_API_URL و IMS_API_KEY في .env</span>`;
  document.getElementById("chk-smtp").innerHTML = `<span class="badge badge-pending">أضف بيانات SMTP في .env</span>`;
}

// ---- اللغات ----
async function loadLanguages() {
  const langs = await apiFetch("/admin/languages");
  const box = document.getElementById("languagesBox");
  box.innerHTML = Object.keys(langs).map(lang => `
    <div class="card" style="margin-bottom:14px;">
      <h4>${lang.toUpperCase()}</h4>
      <textarea id="lang-${lang}" rows="8" style="width:100%;font-family:monospace;font-size:12px;">${JSON.stringify(langs[lang], null, 2)}</textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="saveLanguage('${lang}')">حفظ</button>
    </div>
  `).join("");
}

async function saveLanguage(lang) {
  try {
    const value = JSON.parse(document.getElementById(`lang-${lang}`).value);
    await apiFetch(`/admin/languages/${lang}`, { method: "PUT", body: JSON.stringify(value) });
    alert("تم الحفظ بنجاح");
  } catch (e) {
    alert("خطأ في تنسيق JSON: " + e.message);
  }
}

// ---- المستخدمون (عملاء / سبورت / أدمن) ----
async function loadStaff() {
  const users = await apiFetch("/admin/users");
  document.getElementById("staffBody").innerHTML = users.map(s => `
    <tr>
      <td>${s.name}</td><td>${s.email}</td><td>${s.role}</td>
      <td>${s.id === user.id ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${s.id}')">حذف</button>`}</td>
    </tr>
  `).join("");
}

async function addStaff() {
  const name = document.getElementById("staffName").value;
  const email = document.getElementById("staffEmail").value;
  const password = document.getElementById("staffPassword").value;
  const role = document.getElementById("staffRole").value;
  if (!name || !email || !password) return alert("أكمل كل الحقول");
  await apiFetch("/admin/users", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
  document.getElementById("staffName").value = "";
  document.getElementById("staffEmail").value = "";
  document.getElementById("staffPassword").value = "";
  loadStaff();
  loadClients();
}

// ---- كل التذاكر ----
async function loadAllTickets() {
  const tickets = await apiFetch("/admin/tickets");
  document.getElementById("allTicketsBody").innerHTML = tickets.map(t => `
    <tr><td>${t.subject}</td><td><span class="badge badge-${t.status}">${t.status}</span></td><td>${new Date(t.createdAt).toLocaleString()}</td></tr>
  `).join("") || "<tr><td colspan=\"3\" style=\"color:var(--muted)\">لا توجد تذاكر</td></tr>";
}

// ---- اكتشاف الأخطاء وإصلاحها على مستوى النظام ----
async function detectSystemErrors() {
  const data = await apiFetch("/admin/detect-errors");
  document.getElementById("systemIssuesBox").innerHTML = data.issues.map(i => `
    <div class="issue ${i.severity}">
      ${i.title}
      ${i.fix ? `<button class="btn btn-primary btn-sm" style="margin-inline-start:10px;" onclick="fixSystemIssue('${i.fix}')">إصلاح الآن</button>` : ""}
    </div>
  `).join("");
}

async function fixSystemIssue(action) {
  const data = await apiFetch(`/admin/fix/${action}`, { method: "POST" });
  if (data.qr) {
    alert("تم توليد QR جديد لربط واتساب — افتح تبويب ربط واتساب لمسحه");
  } else {
    alert(data.message || "تم الإصلاح");
  }
  detectSystemErrors();
}

loadClients();
