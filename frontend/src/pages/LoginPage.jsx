import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await authApi.login(username, password);
      localStorage.setItem('seed_ai_token', data.access_token);
      localStorage.setItem('seed_ai_user', JSON.stringify({ username: data.username, role: data.role }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-overlay" />
      <form className="login-card" onSubmit={handleLogin}>
        <h1>Seed IQ Platform</h1>
        <p>Secure login required to access operational dashboard</p>

        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        {error ? <div className="error-box">{error}</div> : null}

        <button className="primary-btn" type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
