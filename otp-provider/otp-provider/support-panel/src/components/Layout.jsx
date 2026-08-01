import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('otp_support_user') || '{}');

  function logout() {
    localStorage.removeItem('otp_support_token');
    localStorage.removeItem('otp_support_user');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>OTP Provider — دعم</h2>
        <nav>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>العملاء</a>
        </nav>
        <div style={{ marginTop: 40, fontSize: 13, color: '#8993ad' }}>
          <div>{user.name}</div>
          <div style={{ marginBottom: 4 }}>{user.email}</div>
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            الصلاحيات: {Object.entries(user.permissions || {}).filter(([, v]) => v).map(([k]) => k).join('، ') || 'لا يوجد'}
          </div>
          <button className="btn secondary" style={{ width: '100%' }} onClick={logout}>تسجيل الخروج</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
