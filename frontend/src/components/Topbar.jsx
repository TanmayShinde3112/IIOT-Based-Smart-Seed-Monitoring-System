import React from 'react';

export default function Topbar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <h2>Seed Quality and Smart Chamber Dashboard</h2>
        <p>Live sensor telemetry, AI insights, and seed prediction tools</p>
      </div>
      <div className="topbar-right">
        <div className="user-chip">
          <span>{user?.username || 'user'}</span>
          <small>{user?.role || 'user'}</small>
        </div>
        <button className="outline-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
