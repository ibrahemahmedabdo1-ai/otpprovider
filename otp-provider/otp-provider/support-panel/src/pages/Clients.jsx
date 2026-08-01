import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/panel/clients', { params: { search } });
      setClients(data.clients);
    } catch (err) {
      setError(err.response?.data?.error || 'لا تملك صلاحية عرض العملاء');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div className="topbar"><h1>العملاء</h1></div>

      {error && <div className="card error-text">{error}</div>}

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

      {!error && (
        <div className="card">
          <table>
            <thead>
              <tr><th>الشركة</th><th>البريد الإلكتروني</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.companyName}</td>
                  <td>{c.email}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td><Link className="btn secondary" to={`/clients/${c.id}`}>عرض البروفايل</Link></td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>لا يوجد عملاء</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
