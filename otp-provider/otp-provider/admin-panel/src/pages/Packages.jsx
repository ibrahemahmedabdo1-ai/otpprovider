import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({ name: '', channelType: 'all', messageCount: '', price: '', description: '' });
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/admin/packages');
    setPackages(data.packages);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/packages', form);
      setForm({ name: '', channelType: 'all', messageCount: '', price: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإنشاء');
    }
  }

  async function toggle(id) {
    await api.delete(`/admin/packages/${id}`);
    load();
  }

  return (
    <div>
      <div className="topbar"><h1>الباكدجات</h1></div>

      <div className="card">
        <h3>إضافة باكدج جديد</h3>
        {error && <div className="error-text">{error}</div>}
        <form onSubmit={create} className="grid-2">
          <div><label>الاسم</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label>القناة</label>
            <select value={form.channelType} onChange={(e) => setForm({ ...form, channelType: e.target.value })}>
              <option value="all">الكل</option>
              <option value="whatsapp">واتساب</option>
              <option value="email">إيميل</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div><label>عدد الرسائل</label><input type="number" required value={form.messageCount} onChange={(e) => setForm({ ...form, messageCount: e.target.value })} /></div>
          <div><label>السعر</label><input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label>الوصف</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><button className="btn" type="submit">إضافة الباكدج</button></div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>الاسم</th><th>القناة</th><th>عدد الرسائل</th><th>السعر</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.channelType}</td>
                <td>{p.messageCount}</td>
                <td>{p.price} {p.currency}</td>
                <td><span className={`badge ${p.isActive ? 'active' : 'suspended'}`}>{p.isActive ? 'نشط' : 'موقوف'}</span></td>
                <td>{p.isActive && <button className="btn secondary" onClick={() => toggle(p.id)}>إيقاف</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
