import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({ type: 'whatsapp', identifier: '', provider: 'twilio', assignmentMode: 'shared' });
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/admin/channels');
    setChannels(data.channels);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/channels', form);
      setForm({ type: 'whatsapp', identifier: '', provider: 'twilio', assignmentMode: 'shared' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإنشاء');
    }
  }

  async function remove(id) {
    if (!confirm('تأكيد حذف القناة؟')) return;
    await api.delete(`/admin/channels/${id}`);
    load();
  }

  return (
    <div>
      <div className="topbar"><h1>القنوات (أرقام واتساب / إيميلات / SMS)</h1></div>

      <div className="card">
        <h3>ربط قناة جديدة</h3>
        {error && <div className="error-text">{error}</div>}
        <form onSubmit={create} className="grid-2">
          <div>
            <label>النوع</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="whatsapp">واتساب</option>
              <option value="email">إيميل</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div><label>المعرّف (رقم/إيميل)</label><input required value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} /></div>
          <div><label>المزوّد</label><input required value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
          <div>
            <label>وضع التخصيص</label>
            <select value={form.assignmentMode} onChange={(e) => setForm({ ...form, assignmentMode: e.target.value })}>
              <option value="shared">مشترك (لكل العملاء)</option>
              <option value="dedicated">مخصص لعميل واحد</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><button className="btn" type="submit">ربط القناة</button></div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>النوع</th><th>المعرّف</th><th>المزوّد</th><th>الوضع</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id}>
                <td>{c.type}</td>
                <td>{c.identifier}</td>
                <td>{c.provider}</td>
                <td>{c.assignmentMode === 'dedicated' ? 'مخصص' : 'مشترك'}</td>
                <td><span className={`badge ${c.status === 'active' ? 'active' : 'faulty'}`}>{c.status}</span></td>
                <td><button className="btn danger" onClick={() => remove(c.id)}>حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
