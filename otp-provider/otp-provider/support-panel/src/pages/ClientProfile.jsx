import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

function getPermissions() {
  const user = JSON.parse(localStorage.getItem('otp_support_user') || '{}');
  return user.permissions || {};
}

const TABS = ['نظرة عامة', 'عمليات الشحن', 'المحادثة', 'اكتشف العطل'];

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState(0);
  const permissions = getPermissions();

  async function load() {
    const { data } = await api.get(`/panel/clients/${id}`);
    setClient(data.client);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (!client) return <p>...جاري التحميل</p>;

  return (
    <div>
      <div className="topbar">
        <h1>{client.companyName}</h1>
        <span className={`badge ${client.status}`}>{client.status}</span>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={t} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <Overview client={client} onStatusChange={load} permissions={permissions} />}
      {tab === 1 && <Transactions clientId={id} permissions={permissions} />}
      {tab === 2 && <Chat clientId={id} />}
      {tab === 3 && <Diagnose clientId={id} permissions={permissions} />}
    </div>
  );
}

function Overview({ client, onStatusChange, permissions }) {
  async function changeStatus(status) {
    await api.patch(`/panel/clients/${client.id}/status`, { status });
    onStatusChange();
  }

  return (
    <div className="card">
      <div className="grid-2">
        <div><label>البريد الإلكتروني</label><p>{client.email}</p></div>
        <div><label>اسم المسؤول</label><p>{client.contactName}</p></div>
        <div><label>رقم الهاتف</label><p>{client.phone || '—'}</p></div>
        <div><label>الموقع</label><p>{client.websiteUrl || '—'}</p></div>
        <div><label>رصيد واتساب / إيميل / SMS</label><p>{client.balanceWhatsapp} / {client.balanceEmail} / {client.balanceSms}</p></div>
      </div>
      {permissions.activateClients ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={() => changeStatus('active')}>تفعيل</button>
          <button className="btn danger" onClick={() => changeStatus('suspended')}>إيقاف</button>
        </div>
      ) : (
        <p style={{ color: '#888', marginTop: 12 }}>لا تملك صلاحية تفعيل/إيقاف العملاء</p>
      )}
    </div>
  );
}

function Transactions({ clientId, permissions }) {
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const { data } = await api.get(`/panel/clients/${clientId}/transactions`);
    setTransactions(data.transactions);
    if (permissions.shipPackages) {
      const pk = await api.get('/panel/packages');
      setPackages(pk.data.packages.filter((p) => p.isActive));
    }
  }

  useEffect(() => { load(); }, [clientId]); // eslint-disable-line

  async function ship(e) {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.post('/panel/transactions/ship', { clientId, packageId: selectedPackage, notes });
      setMsg(data.message);
      setSelectedPackage(''); setNotes('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'فشل الشحن');
    }
  }

  return (
    <div>
      {permissions.shipPackages ? (
        <div className="card">
          <h3>شحن باكدج جديد</h3>
          {msg && <p style={{ color: '#3f6bff' }}>{msg}</p>}
          <form onSubmit={ship}>
            <label>اختر الباكدج</label>
            <select required value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value)}>
              <option value="">-- اختر --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.messageCount} رسالة)</option>
              ))}
            </select>
            <label>ملاحظات (اختياري)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn" type="submit">شحن الباكدج</button>
          </form>
        </div>
      ) : (
        <div className="card"><p style={{ color: '#888' }}>لا تملك صلاحية شحن الباكدجات</p></div>
      )}

      <div className="card">
        <h3>سجل العمليات</h3>
        <table>
          <thead><tr><th>النوع</th><th>القناة</th><th>عدد الرسائل</th><th>التاريخ</th></tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{typeLabel(t.type)}</td>
                <td>{t.channelType}</td>
                <td>{t.messageCount}</td>
                <td>{new Date(t.createdAt).toLocaleString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function typeLabel(t) {
  return { purchase: 'شراء', trial_grant: 'رسائل اختبار مجانية', admin_adjustment: 'تعديل يدوي' }[t] || t;
}

function Chat({ clientId }) {
  const [chats, setChats] = useState([]);
  const [message, setMessage] = useState('');

  async function load() {
    const { data } = await api.get(`/panel/clients/${clientId}/chat`);
    setChats(data.chats);
  }

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [clientId]); // eslint-disable-line

  async function send(e) {
    e.preventDefault();
    if (!message.trim()) return;
    await api.post(`/panel/clients/${clientId}/chat`, { message });
    setMessage('');
    load();
  }

  return (
    <div className="card">
      <div className="chat-box">
        {chats.map((c) => (
          <div key={c.id} className={`chat-msg ${c.sender === 'client' ? 'client' : 'staff'}`}>{c.message}</div>
        ))}
        {chats.length === 0 && <p style={{ color: '#888' }}>لا توجد رسائل بعد</p>}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <input placeholder="اكتب رسالة..." value={message} onChange={(e) => setMessage(e.target.value)} style={{ marginBottom: 0 }} />
        <button className="btn" type="submit">إرسال</button>
      </form>
    </div>
  );
}

function Diagnose({ clientId, permissions }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!permissions.diagnoseFaults) {
    return <div className="card"><p style={{ color: '#888' }}>لا تملك صلاحية اكتشاف الأعطال</p></div>;
  }

  async function runDiagnose() {
    setLoading(true);
    try {
      const { data } = await api.post(`/panel/clients/${clientId}/diagnose`);
      setReport(data.report);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <button className="btn" onClick={runDiagnose} disabled={loading}>
        {loading ? '...جاري الفحص' : '🔍 اكتشف العطل'}
      </button>

      {report && (
        <div style={{ marginTop: 20 }}>
          <p>الحالة العامة: <span className={`badge ${report.overallStatus}`}>{report.overallStatus}</span></p>
          {report.balanceWarnings?.length > 0 && (
            <p style={{ color: '#b91c1c' }}>تنبيهات الرصيد: {report.balanceWarnings.join('، ')}</p>
          )}
          <table>
            <thead><tr><th>القناة</th><th>المعرّف</th><th>الوضع</th><th>الحالة</th><th>زمن الاستجابة</th></tr></thead>
            <tbody>
              {report.results.map((r, i) => (
                <tr key={i}>
                  <td>{r.channelType}</td>
                  <td>{r.identifier}</td>
                  <td>{r.mode === 'dedicated' ? 'مخصص' : 'مشترك'}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>{r.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
