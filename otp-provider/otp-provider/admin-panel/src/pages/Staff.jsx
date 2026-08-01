import React, { useEffect, useState } from 'react';
import api from '../api/client';

const PERMISSION_LABELS = {
  viewClients: 'مشاهدة العملاء',
  chatWithClients: 'المحادثة مع العملاء',
  shipPackages: 'شحن الباكدجات',
  activateClients: 'تفعيل/إيقاف العملاء',
  manageChannels: 'إدارة القنوات',
  diagnoseFaults: 'اكتشاف الأعطال',
};

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/admin/staff');
    setStaff(data.staff);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/staff', form);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإنشاء');
    }
  }

  async function togglePermission(s, key) {
    const updated = { ...s.permissions, [key]: !s.permissions[key] };
    await api.patch(`/admin/staff/${s.id}/permissions`, { permissions: updated });
    load();
  }

  async function toggleActive(s) {
    await api.patch(`/admin/staff/${s.id}/active`, { isActive: !s.isActive });
    load();
  }

  return (
    <div>
      <div className="topbar"><h1>فريق الدعم (السبورت)</h1></div>

      <div className="card">
        <h3>إضافة عضو دعم جديد</h3>
        {error && <div className="error-text">{error}</div>}
        <form onSubmit={create} className="grid-2">
          <div><label>الاسم</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>البريد الإلكتروني</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>كلمة المرور</label><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn" type="submit">إضافة</button></div>
        </form>
      </div>

      {staff.map((s) => (
        <div className="card" key={s.id}>
          <div className="topbar" style={{ marginBottom: 12 }}>
            <div>
              <strong>{s.name}</strong> — {s.email}
              <span className={`badge ${s.isActive ? 'active' : 'suspended'}`} style={{ marginRight: 10 }}>
                {s.isActive ? 'مفعّل' : 'موقوف'}
              </span>
            </div>
            <button className="btn secondary" onClick={() => toggleActive(s)}>
              {s.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
            </button>
          </div>
          <div className="grid-2">
            {Object.keys(PERMISSION_LABELS).map((key) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto', marginBottom: 0 }}
                  checked={!!s.permissions[key]}
                  onChange={() => togglePermission(s, key)}
                />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
