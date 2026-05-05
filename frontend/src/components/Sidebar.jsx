import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-pill">SI</div>
        <div>
          <h1>Seed IQ</h1>
          <p>Chamber intelligence</p>
        </div>
      </div>

      <button
        className={`nav-btn ${activeTab === 'sensor' ? 'active' : ''}`}
        onClick={() => setActiveTab('sensor')}
      >
        <span>Sensor Chamber</span>
        <small>Live climate and moisture</small>
      </button>

      <button
        className={`nav-btn ${activeTab === 'seed' ? 'active' : ''}`}
        onClick={() => setActiveTab('seed')}
      >
        <span>Seed Analysis</span>
        <small>Image quality prediction</small>
      </button>
    </aside>
  );
}
