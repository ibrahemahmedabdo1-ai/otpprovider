import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('otp_admin_user') || '{}');

  function logout() {
    localStorage.removeItem('otp_admin_token');
    localStorage.removeItem('otp_admin_user');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>OTP Provider — أدمن</h2>
        <nav>
          <NavLink to="/" end>لوحة العملاء</NavLink>
          <NavLink to="/packages">الباكدجات</NavLink>
          <NavLink to="/channels">القنوات (أرقام/إيميلات)</NavLink>
          <NavLink to="/staff">فريق الدعم (السبورت)</NavLink>
        </nav>
        <div style={{ marginTop: 40, fontSize: 13, color: '#8993ad' }}>
          <div>{user.name}</div>
          <div style={{ marginBottom: 12 }}>{user.email}</div>
          <button className="btn secondary" style={{ width: '100%' }} onClick={logout}>تسجيل الخروج</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
