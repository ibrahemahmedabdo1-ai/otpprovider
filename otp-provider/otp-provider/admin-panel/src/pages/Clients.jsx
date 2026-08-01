import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const { data } = await api.get('/panel/clients', { params: { search } });
    setClients(data.clients);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div className="topbar">
        <h1>العملاء (أصحاب المواقع)</h1>
        <button className="btn" onClick={() => setShowCreate(true)}>+ عميل جديد</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="بحث بالاسم أو الإيميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ marginBottom: 0 }}
          />
          <button className="btn secondary" onClick={load}>بحث</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>الشركة</th>
              <th>البريد الإلكتروني</th>
              <th>الحالة</th>
              <th>رصيد واتساب</th>
              <th>رصيد إيميل</th>
              <th>رصيد SMS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.companyName}</td>
                <td>{c.email}</td>
                <td><span className={`badge ${c.status}`}>{statusLabel(c.status)}</span></td>
                <td>{c.balanceWhatsapp}</td>
                <td>{c.balanceEmail}</td>
                <td>{c.balanceSms}</td>
                <td><Link className="btn secondary" to={`/clients/${c.id}`}>عرض البروفايل</Link></td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>لا يوجد عملاء بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateClientModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function statusLabel(s) {
  return { active: 'مفعّل', pending: 'قيد الانتظار', suspended: 'موقوف' }[s] || s;
}

function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', password: '', phone: '', websiteUrl: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post('/panel/clients', form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإنشاء');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>إنشاء عميل جديد</h2>
        {error && <div className="error-text">{error}</div>}
        <label>اسم الشركة</label>
        <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        <label>اسم المسؤول</label>
        <input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <label>البريد الإلكتروني</label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label>كلمة المرور</label>
        <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label>رقم الهاتف</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label>رابط الموقع</label>
        <input value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit">إنشاء</button>
          <button className="btn secondary" type="button" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </div>
  );
}
