import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/staff/login', { email, password });
      if (data.user.role !== 'admin') {
        setError('هذه اللوحة مخصصة للأدمن فقط. استخدم تطبيق السبورت.');
        setLoading(false);
        return;
      }
      localStorage.setItem('otp_admin_token', data.token);
      localStorage.setItem('otp_admin_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>لوحة تحكم الأدمن</h1>
        <p>OTP Provider - إدارة كاملة للنظام</p>
        {error && <div className="error-text">{error}</div>}
        <label>البريد الإلكتروني</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn" style={{ width: '100%' }} disabled={loading}>
          {loading ? '...جاري الدخول' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}
