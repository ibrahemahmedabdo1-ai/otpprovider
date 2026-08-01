import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import Packages from './pages/Packages';
import Channels from './pages/Channels';
import Staff from './pages/Staff';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('otp_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Clients />} />
        <Route path="clients/:id" element={<ClientProfile />} />
        <Route path="packages" element={<Packages />} />
        <Route path="channels" element={<Channels />} />
        <Route path="staff" element={<Staff />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
