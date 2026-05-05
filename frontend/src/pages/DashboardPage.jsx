import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { authApi, seedApi, sensorApi, wsUrl, getImageUrl } from '../services/api';

function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function scoreRange(value, min, max, soft = 8) {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, Math.round(100 - distance * soft));
}

function getQualityLabel(score) {
  if (score >= 82) return 'Good';
  if (score >= 58) return 'Average';
  return 'Poor';
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('sensor');
  const [historyLimit, setHistoryLimit] = useState(60);
  const [focusMetric, setFocusMetric] = useState('moisture');
  const [explainMode, setExplainMode] = useState(true);
  const [scenario, setScenario] = useState({ temperature: 29, humidity: 62, moisture: 56, exposureHours: 24 });
  const [visibleSeries, setVisibleSeries] = useState({ temperature: true, humidity: true, moisture: true });
  const [latest, setLatest] = useState(null);
  const [insights, setInsights] = useState([]);
  const [history, setHistory] = useState([]);
  const [seedResult, setSeedResult] = useState(null);
  const [seedHistory, setSeedHistory] = useState([]);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedErr, setSeedErr] = useState('');
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [manualSensor, setManualSensor] = useState({ temperature: 29, humidity: 58, moisture: 52 });
  const [manualPrediction, setManualPrediction] = useState({ temperature: 28, humidity: 60, moisture: 55 });
  const [manualPredictionResult, setManualPredictionResult] = useState(null);
  const [manualPredictionLoading, setManualPredictionLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [users, setUsers] = useState([]);
  const [userMsg, setUserMsg] = useState('');

  const user = useMemo(() => {
    const raw = localStorage.getItem('seed_ai_user');
    return raw ? JSON.parse(raw) : { username: 'user', role: 'user' };
  }, []);

  const logout = () => {
    localStorage.removeItem('seed_ai_token');
    localStorage.removeItem('seed_ai_user');
    window.location.href = '/login';
  };

  const loadSensorData = async (limit = historyLimit) => {
    const [latestRes, historyRes] = await Promise.all([sensorApi.latest(), sensorApi.history(limit)]);
    setLatest(latestRes.data.latest);
    setInsights(latestRes.data.insights || []);
    setHistory(historyRes.data.records || []);
  };

  const loadSeedHistory = async () => {
    const { data } = await seedApi.history();
    setSeedHistory(data.records || []);
  };

  const loadUsers = async () => {
    if (user.role !== 'admin') return;
    const { data } = await authApi.listUsers();
    setUsers(data || []);
  };

  useEffect(() => {
    loadSeedHistory().catch(console.error);
    loadUsers().catch(console.error);

    const ws = new WebSocket(wsUrl());
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        setLatest({
          device_id: payload.device_id,
          temperature: payload.temperature,
          humidity: payload.humidity,
          moisture: payload.moisture,
          created_at: payload.created_at,
        });
        setInsights(payload.insights || []);
        setHistory((prev) => {
          const next = [...prev, payload].slice(-120);
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    loadSensorData(historyLimit).catch(console.error);
    const timer = setInterval(() => loadSensorData(historyLimit).catch(console.error), 10000);

    return () => clearInterval(timer);
  }, [historyLimit]);

  const submitManualSensor = async () => {
    setAdminMsg('');
    try {
      await sensorApi.ingest({
        device_id: 'admin-simulator',
        temperature: Number(manualSensor.temperature),
        humidity: Number(manualSensor.humidity),
        moisture: Number(manualSensor.moisture),
      });
      setAdminMsg('Manual sensor payload pushed successfully.');
      await loadSensorData();
    } catch (err) {
      setAdminMsg(err?.response?.data?.detail || 'Failed to push manual sensor data.');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setUserMsg('');
    try {
      await authApi.register(newUser.username, newUser.password);
      setUserMsg('User created successfully.');
      setNewUser({ username: '', password: '' });
      await loadUsers();
    } catch (err) {
      setUserMsg(err?.response?.data?.detail || 'Failed to create user.');
    }
  };

  const chartData = useMemo(
    () =>
      history.map((r) => ({
        time: fmtTime(r.created_at),
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
        moisture: Number(r.moisture),
      })),
    [history],
  );

  const averages = useMemo(() => {
    if (!chartData.length) return { temperature: 0, humidity: 0, moisture: 0 };
    const total = chartData.reduce(
      (acc, point) => ({
        temperature: acc.temperature + point.temperature,
        humidity: acc.humidity + point.humidity,
        moisture: acc.moisture + point.moisture,
      }),
      { temperature: 0, humidity: 0, moisture: 0 },
    );
    return {
      temperature: total.temperature / chartData.length,
      humidity: total.humidity / chartData.length,
      moisture: total.moisture / chartData.length,
    };
  }, [chartData]);

  const chamberStatus = useMemo(() => {
    if (!latest) return { label: 'Waiting', detail: 'Send sensor data to begin monitoring.', tone: 'idle' };
    if (latest.temperature > 34 || latest.moisture < 35 || latest.humidity > 78) {
      return { label: 'Needs Attention', detail: 'One or more readings are outside the target band.', tone: 'alert' };
    }
    if (latest.temperature > 31 || latest.moisture < 45 || latest.humidity > 70) {
      return { label: 'Watch', detail: 'Conditions are usable, but drifting from ideal.', tone: 'watch' };
    }
    return { label: 'Optimal', detail: 'The chamber is inside the healthy germination range.', tone: 'good' };
  }, [latest]);

const metricMeta = useMemo(
    () => ({
      temperature: {
        label: 'Temperature',
        value: latest ? latest.temperature : 0,
        unit: 'C',
        target: '24-32 C',
        range: [18, 38],
        ideal: [24, 32],
        advice: 'Keep the chamber warm without heat spikes. High heat slows healthy germination.',
      },
      humidity: {
        label: 'Humidity',
        value: latest ? latest.humidity : 0,
        unit: '%',
        target: '55-70%',
        range: [30, 90],
        ideal: [55, 70],
        advice: 'Balanced humidity keeps seeds hydrated while reducing fungal risk.',
      },
      moisture: {
        label: 'Soil Moisture',
        value: latest ? latest.moisture : 0,
        unit: '%',
        target: '45-65%',
        range: [20, 90],
        ideal: [45, 65],
        advice: 'Moisture is the main chamber signal. Keep it steady for uniform sprouting.',
      },
    }),
    [latest],
  );

const focus = metricMeta[focusMetric];
  const focusPercent = Math.min(100, Math.max(0, ((focus.value - focus.range[0]) / (focus.range[1] - focus.range[0])) * 100));

  const liveQuality = useMemo(() => {
    if (!latest) return { score: 0, label: 'Waiting', message: 'Send sensor data to calculate an environment-based seed quality forecast.' };
    const tempScore = scoreRange(latest.temperature, 24, 32, 9);
    const humidityScore = scoreRange(latest.humidity, 55, 70, 6);
    const moistureScore = scoreRange(latest.moisture, 45, 65, 7);
    const score = Math.round(tempScore * 0.34 + humidityScore * 0.26 + moistureScore * 0.4);
    return {
      score,
      label: getQualityLabel(score),
      message:
        score >= 82
          ? 'Live chamber values support healthy germination.'
          : score >= 58
            ? 'Seed quality may be acceptable, but one condition should be corrected.'
            : 'Current chamber values can reduce germination quality.',
      parts: { temperature: tempScore, humidity: humidityScore, moisture: moistureScore },
    };
  }, [latest]);

  // Pie chart data for quality score breakdown
  const qualityPieData = useMemo(() => {
    if (!liveQuality.parts) return [];
    return [
      { name: 'Temperature', value: liveQuality.parts.temperature, color: '#ff7a45' },
      { name: 'Humidity', value: liveQuality.parts.humidity, color: '#1d7cf2' },
      { name: 'Moisture', value: liveQuality.parts.moisture, color: '#13a76b' },
    ];
  }, [liveQuality.parts]);

  // Bar chart data for sensor averages comparison
  const sensorBarData = useMemo(() => {
    return [
      { name: 'Temperature', current: averages.temperature, ideal: 28 },
      { name: 'Humidity', current: averages.humidity, ideal: 62.5 },
      { name: 'Moisture', current: averages.moisture, ideal: 55 },
    ];
  }, [averages]);

  // Seed quality history for pie chart
  const seedQualityHistory = useMemo(() => {
    const counts = { Good: 0, Average: 0, Poor: 0 };
    seedHistory.forEach((r) => {
      if (r.quality_label === 'Good') counts.Good++;
      else if (r.quality_label === 'Average') counts.Average++;
      else counts.Poor++;
    });
    return [
      { name: 'Good', value: counts.Good, color: '#13a76b' },
      { name: 'Average', value: counts.Average, color: '#f4b63f' },
      { name: 'Poor', value: counts.Poor, color: '#ff7a45' },
    ].filter((d) => d.value > 0);
  }, [seedHistory]);

  const scenarioQuality = useMemo(() => {
    const tempScore = scoreRange(Number(scenario.temperature), 24, 32, 9);
    const humidityScore = scoreRange(Number(scenario.humidity), 55, 70, 6);
    const moistureScore = scoreRange(Number(scenario.moisture), 45, 65, 7);
    const exposurePenalty = Math.max(0, Number(scenario.exposureHours) - 24) * 0.45;
    const score = Math.max(0, Math.round(tempScore * 0.34 + humidityScore * 0.26 + moistureScore * 0.4 - exposurePenalty));
    return { score, label: getQualityLabel(score) };
  }, [scenario]);

  const toggleSeries = (key) => {
    setVisibleSeries((current) => ({ ...current, [key]: !current[key] }));
  };

  const pushPreset = async (preset) => {
    setManualSensor(preset.payload);
    setAdminMsg('');
    try {
      await sensorApi.ingest({
        device_id: preset.deviceId,
        ...preset.payload,
      });
      setAdminMsg(`${preset.label} sample data added.`);
      await loadSensorData();
    } catch (err) {
      setAdminMsg(err?.response?.data?.detail || 'Failed to add sample data.');
    }
  };

const handleSeedUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSeedBusy(true);
    setSeedErr('');
    try {
      // Pass current sensor values for germination change prediction
      const temperature = latest?.temperature || null;
      const humidity = latest?.humidity || null;
      const { data } = await seedApi.predict(file, temperature, humidity);
      setSeedResult(data);
      await loadSeedHistory();
    } catch (err) {
      setSeedErr(err?.response?.data?.detail || 'Prediction failed');
    } finally {
      setSeedBusy(false);
      e.target.value = '';
    }
  };

  const handleDeleteRecord = async (recordId) => {
    setDeletingRecordId(recordId);
    try {
      await seedApi.deleteRecord(recordId);
      await loadSeedHistory();
    } catch (err) {
      console.error('Failed to delete record:', err);
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all prediction history?')) return;
    try {
      await seedApi.clearHistory();
      await loadSeedHistory();
      setSeedResult(null);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleManualPrediction = async () => {
    setManualPredictionLoading(true);
    try {
      // Use the same calculation logic as the backend for immediate result
      const tempScore = scoreRange(Number(manualPrediction.temperature), 24, 32, 9);
      const humidityScore = scoreRange(Number(manualPrediction.humidity), 55, 70, 6);
      const moistureScore = scoreRange(Number(manualPrediction.moisture), 45, 65, 7);
      const score = Math.round(tempScore * 0.34 + humidityScore * 0.26 + moistureScore * 0.4);
      
      // Calculate predicted germination change
      let germinationChange = 0;
      let changeReason = '';
      
      if (Number(manualPrediction.temperature) >= 24 && Number(manualPrediction.temperature) <= 32) {
        germinationChange += 5;
        changeReason = 'Optimal temperature range';
      } else if (Number(manualPrediction.temperature) < 24) {
        germinationChange -= (24 - Number(manualPrediction.temperature)) * 2.5;
        changeReason = `Low temp slows germination`;
      } else if (Number(manualPrediction.temperature) > 32) {
        germinationChange -= (Number(manualPrediction.temperature) - 32) * 3;
        changeReason = `High temp stresses seeds`;
      }
      
      if (Number(manualPrediction.humidity) >= 55 && Number(manualPrediction.humidity) <= 70) {
        germinationChange += 5;
        changeReason += changeReason ? '; Optimal humidity range' : 'Optimal humidity range';
      } else if (Number(manualPrediction.humidity) < 55) {
        germinationChange -= (55 - Number(manualPrediction.humidity)) * 1.5;
        changeReason += changeReason ? '; Low humidity reduces moisture' : 'Low humidity reduces moisture';
      } else if (Number(manualPrediction.humidity) > 70) {
        germinationChange -= (Number(manualPrediction.humidity) - 70) * 2;
        changeReason += changeReason ? '; High humidity risks fungal growth' : 'High humidity risks fungal growth';
      }
      
      germinationChange = Math.max(-25, Math.min(25, germinationChange));
      
      setManualPredictionResult({
        germination_probability: score,
        quality_label: getQualityLabel(score),
        confidence: score / 100,
        raw_class: 'Manual Input',
        recommendation: score >= 82 
          ? 'Conditions are optimal for seed germination.' 
          : score >= 58 
            ? 'Conditions are acceptable but could be improved.' 
            : 'Conditions may reduce germination success.',
        germination_change: germinationChange,
        change_reason: changeReason || 'Conditions within acceptable range',
        temperature: Number(manualPrediction.temperature),
        humidity: Number(manualPrediction.humidity),
        moisture: Number(manualPrediction.moisture),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setManualPredictionLoading(false);
    }
  };

  return (
    <div className="layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-area">
        <Topbar user={user} onLogout={logout} />

        {activeTab === 'sensor' ? (
          <section className="panel-grid">
            <div className={`status-hero ${chamberStatus.tone}`}>
              <div>
                <span className="eyebrow">Chamber 1 health</span>
                <h1>{chamberStatus.label}</h1>
                <p>{chamberStatus.detail}</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveTab('seed')}>Analyze Seed</button>
                  <button type="button" onClick={() => setFocusMetric('moisture')}>View Moisture</button>
                  <button type="button" onClick={() => setExplainMode((value) => !value)}>
                    {explainMode ? 'Hide Guide' : 'Show Guide'}
                  </button>
                </div>
              </div>
              <div className="status-dial">
                <strong>{latest ? latest.moisture.toFixed(0) : '--'}%</strong>
                <span>moisture</span>
              </div>
            </div>

            <div className="metrics-row">
              <MetricCard
                label="Temperature"
                value={latest ? latest.temperature.toFixed(1) : '--'}
                unit=" C"
                tone="warm"
                helper={`Avg ${averages.temperature.toFixed(1)} C`}
                trend="24-32 C target"
                active={focusMetric === 'temperature'}
                onClick={() => setFocusMetric('temperature')}
              />
              <MetricCard
                label="Humidity"
                value={latest ? latest.humidity.toFixed(1) : '--'}
                unit=" %"
                tone="cool"
                helper={`Avg ${averages.humidity.toFixed(1)} %`}
                trend="55-70% target"
                active={focusMetric === 'humidity'}
                onClick={() => setFocusMetric('humidity')}
              />
              <MetricCard
                label="Soil Moisture"
                value={latest ? latest.moisture.toFixed(1) : '--'}
                unit=" %"
                tone="earth"
                helper={`Avg ${averages.moisture.toFixed(1)} %`}
                trend="45-65% target"
                active={focusMetric === 'moisture'}
                onClick={() => setFocusMetric('moisture')}
              />
            </div>

            {explainMode ? (
              <div className="visual-grid">
                <div className="card chamber-visual">
                  <div className="card-head">
                    <h3>Two-Chamber Visual Flow</h3>
                    <span>How the project works</span>
                  </div>
                  <div className="chamber-flow">
                    <button type="button" className="chamber-box active" onClick={() => setFocusMetric('temperature')}>
                      <span>Chamber 1</span>
                      <strong>Live sensors</strong>
                      <small>Temp + humidity + moisture</small>
                    </button>
                    <div className="flow-arrow">+</div>
                    <button type="button" className="chamber-box" onClick={() => setActiveTab('seed')}>
                      <span>Chamber 2</span>
                      <strong>Seed check</strong>
                      <small>Image + quality result</small>
                    </button>
                    <div className="flow-arrow">=</div>
                    <div className={`quality-badge ${liveQuality.label.toLowerCase()}`}>
                      <span>Forecast</span>
                      <strong>{liveQuality.score || '--'}%</strong>
                      <small>{liveQuality.label}</small>
                    </div>
                  </div>
                  <p className="helper-copy">{liveQuality.message}</p>
                </div>

<div className="card gauge-card">
                  <div className="card-head">
                    <h3>Sensor Health Gauges</h3>
                    <span>Click to focus</span>
                  </div>
                  <div className="gauge-list">
                    {[
                      ['temperature', 'Temperature', liveQuality.parts?.temperature || 0],
                      ['humidity', 'Humidity', liveQuality.parts?.humidity || 0],
                      ['moisture', 'Moisture', liveQuality.parts?.moisture || 0],
                    ].map(([key, label, value]) => (
                      <button key={key} className={`mini-gauge ${key}`} type="button" onClick={() => setFocusMetric(key)}>
                        <span>{label}</span>
                        <div className="mini-gauge-track">
                          <i style={{ width: `${value}%` }} />
                        </div>
                        <strong>{value}%</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {/* NEW: Quality Score Pie Chart */}
                <div className="card pie-card">
                  <div className="card-head">
                    <h3>Quality Score Breakdown</h3>
                    <span>Pie chart</span>
                  </div>
                  <div className="pie-chart-wrap">
<ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={qualityPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {qualityPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* NEW: Sensor Averages Bar Chart */}
                <div className="card bar-card">
                  <div className="card-head">
                    <h3>Sensor Averages vs Ideal</h3>
                    <span>Bar comparison</span>
                  </div>
                  <div className="bar-chart-wrap">
<ResponsiveContainer width="100%" height={180}>
<BarChart data={sensorBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#dbe6e2" />
                        <XAxis type="number" tick={{ fill: '#66758a', fontSize: 10 }} domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#66758a', fontSize: 10 }} width={60} />
                        <Tooltip />
                        <Bar dataKey="current" fill="#13a76b" name="Current" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="ideal" fill="#1d7cf2" name="Ideal" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="dashboard-split">
              <div className="card chart-card">
                <div className="card-head">
                  <h3>Real-time Chamber Trends</h3>
                  <span>{history.length} points</span>
                </div>
                <div className="chart-controls" aria-label="Chart controls">
                  {[30, 60, 120].map((limit) => (
                    <button
                      key={limit}
                      className={historyLimit === limit ? 'active' : ''}
                      type="button"
                      onClick={() => setHistoryLimit(limit)}
                    >
                      {limit}
                    </button>
                  ))}
                  {[
                    ['temperature', 'Temperature'],
                    ['humidity', 'Humidity'],
                    ['moisture', 'Moisture'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={visibleSeries[key] ? `active ${key}` : ''}
                      type="button"
                      onClick={() => toggleSeries(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff7a45" stopOpacity={0.34} />
                          <stop offset="95%" stopColor="#ff7a45" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="humidityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1d7cf2" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#1d7cf2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13a76b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#13a76b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe6e2" />
                      <XAxis dataKey="time" tick={{ fill: '#66758a', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#66758a', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#d8e4ef' }} />
                      {visibleSeries.temperature ? (
                        <Area type="monotone" dataKey="temperature" stroke="#ff7a45" fill="url(#tempFill)" strokeWidth={3} dot={false} />
                      ) : null}
                      {visibleSeries.humidity ? (
                        <Area type="monotone" dataKey="humidity" stroke="#1d7cf2" fill="url(#humidityFill)" strokeWidth={3} dot={false} />
                      ) : null}
                      {visibleSeries.moisture ? (
                        <Area type="monotone" dataKey="moisture" stroke="#13a76b" fill="url(#moistureFill)" strokeWidth={3} dot={false} />
                      ) : null}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <aside className={`focus-panel ${focusMetric}`}>
                <span className="eyebrow">Focused signal</span>
                <h3>{focus.label}</h3>
                <div className="focus-value">
                  {latest ? focus.value.toFixed(1) : '--'}
                  <span>{focus.unit}</span>
                </div>
                <div className="range-track">
                  <span className="range-fill" style={{ width: `${focusPercent}%` }} />
                </div>
                <div className="range-labels">
                  <span>{focus.range[0]}{focus.unit}</span>
                  <strong>Ideal {focus.target}</strong>
                  <span>{focus.range[1]}{focus.unit}</span>
                </div>
                <p>{focus.advice}</p>
                <div className="recipe-strip">
                  <div>
                    <strong>Seed stage</strong>
                    <span>Germination</span>
                  </div>
                  <div>
                    <strong>Refresh</strong>
                    <span>10 sec</span>
                  </div>
                  <div>
                    <strong>Source</strong>
                    <span>{latest?.device_id || 'waiting'}</span>
                  </div>
                </div>
              </aside>
            </div>

            <div className="quick-grid">
              <div className="card lab-card">
                <span className="eyebrow">Growth recipe</span>
                <h3>Climate Resilience Mode</h3>
                <p>Balanced watering, warm chamber air, and moderate humidity for consistent seed quality readings.</p>
                <div className="recipe-pills">
                  <span>Warm air</span>
                  <span>Clean moisture</span>
                  <span>Low fungus risk</span>
                </div>
              </div>

              <div className="card scenario-card">
                <div className="card-head">
                  <h3>What-if Seed Quality Planner</h3>
                  <span>{scenarioQuality.score}% {scenarioQuality.label}</span>
                </div>
                {[
                  ['temperature', 'Temperature', 18, 40, 'C'],
                  ['humidity', 'Humidity', 30, 90, '%'],
                  ['moisture', 'Moisture', 15, 90, '%'],
                  ['exposureHours', 'Exposure', 1, 72, 'hr'],
                ].map(([key, label, min, max, unit]) => (
                  <label className="slider-row" key={key}>
                    <span>{label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={scenario[key]}
                      onChange={(e) => setScenario((current) => ({ ...current, [key]: Number(e.target.value) }))}
                    />
                    <strong>{scenario[key]} {unit}</strong>
                  </label>
                ))}
                <p className="helper-copy">Move sliders to learn how chamber values affect the seed quality forecast before sending real sensor data.</p>
              </div>

              <div className="card">
                <div className="card-head">
                  <h3>AI Insights</h3>
                  <span>Rule + threshold intelligence</span>
                </div>
                <div className="insight-list">
                  {insights.length ? (
                    insights.map((item, idx) => (
                      <div key={`${item.message}-${idx}`} className={`insight ${item.severity}`}>
                        <strong>{item.severity.toUpperCase()}</strong>
                        <p>{item.message}</p>
                      </div>
                    ))
                  ) : (
                    <p>No insights yet. Send data from ESP32 first.</p>
                  )}
                </div>
              </div>
            </div>

            {user.role === 'admin' ? (
              <div className="card">
                <div className="card-head">
                  <h3>Admin Sensor Studio</h3>
                  <span>Manual readings and instant demo samples</span>
                </div>
                <div className="preset-row">
                  {[
                    { label: 'Healthy', deviceId: 'demo-healthy', payload: { temperature: 28.6, humidity: 62.5, moisture: 57.8 } },
                    { label: 'Dry Soil', deviceId: 'demo-dry', payload: { temperature: 31.8, humidity: 48.4, moisture: 28.5 } },
                    { label: 'Heat Stress', deviceId: 'demo-heat', payload: { temperature: 36.4, humidity: 66.1, moisture: 43.2 } },
                  ].map((preset) => (
                    <button key={preset.label} type="button" onClick={() => pushPreset(preset)}>
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="admin-form-grid">
                  <input
                    type="number"
                    value={manualSensor.temperature}
                    onChange={(e) => setManualSensor((s) => ({ ...s, temperature: e.target.value }))}
                    placeholder="Temperature"
                  />
                  <input
                    type="number"
                    value={manualSensor.humidity}
                    onChange={(e) => setManualSensor((s) => ({ ...s, humidity: e.target.value }))}
                    placeholder="Humidity"
                  />
                  <input
                    type="number"
                    value={manualSensor.moisture}
                    onChange={(e) => setManualSensor((s) => ({ ...s, moisture: e.target.value }))}
                    placeholder="Moisture"
                  />
                  <button className="outline-btn" type="button" onClick={submitManualSensor}>
                    Push Data
                  </button>
                </div>
                {adminMsg ? <p className="status-text">{adminMsg}</p> : null}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="panel-grid">
            <div className="seed-hero">
              <div>
                <span className="eyebrow">Chamber 2 vision lab</span>
                <h1>Seed Quality Analysis</h1>
                <p>Upload a seed image to estimate germination probability, quality class, confidence, and next action.</p>
              </div>
              <div className="seed-score">
                <strong>{seedResult ? `${seedResult.germination_probability}%` : '--'}</strong>
                <span>latest probability</span>
              </div>
            </div>

<div className="seed-grid">
              {/* Manual Prediction Card */}
              <div className="card">
                <div className="card-head">
                  <h3>Manual Prediction</h3>
                  <span>Enter values for instant prediction</span>
                </div>
                <div className="manual-prediction-form">
                  <div className="manual-input-row">
                    <label>
                      <span>Temperature (°C)</span>
                      <input
                        type="number"
                        value={manualPrediction.temperature}
                        onChange={(e) => setManualPrediction((prev) => ({ ...prev, temperature: e.target.value }))}
                        min="15"
                        max="45"
                      />
                    </label>
                    <label>
                      <span>Humidity (%)</span>
                      <input
                        type="number"
                        value={manualPrediction.humidity}
                        onChange={(e) => setManualPrediction((prev) => ({ ...prev, humidity: e.target.value }))}
                        min="20"
                        max="95"
                      />
                    </label>
                    <label>
                      <span>Moisture (%)</span>
                      <input
                        type="number"
                        value={manualPrediction.moisture}
                        onChange={(e) => setManualPrediction((prev) => ({ ...prev, moisture: e.target.value }))}
                        min="10"
                        max="90"
                      />
                    </label>
                  </div>
                  <button 
                    type="button" 
                    className="predict-btn"
                    onClick={handleManualPrediction}
                    disabled={manualPredictionLoading}
                  >
                    {manualPredictionLoading ? 'Calculating...' : 'Predict'}
                  </button>
                </div>
                {manualPredictionResult && (
                  <div className="manual-result">
                    <div className="result-header">
                      <span className="result-label">Quality Score</span>
                      <span className={`result-quality ${manualPredictionResult.quality_label.toLowerCase()}`}>
                        {manualPredictionResult.quality_label}
                      </span>
                    </div>
                    <div className="result-value">
                      <strong>{manualPredictionResult.germination_probability}%</strong>
                      <span>germination probability</span>
                    </div>
                    <div className={`result-change ${manualPredictionResult.germination_change >= 0 ? 'positive' : 'negative'}`}>
                      <span>Predicted Change:</span>
                      <strong>{manualPredictionResult.germination_change >= 0 ? '+' : ''}{manualPredictionResult.germination_change}%</strong>
                    </div>
                    <p className="result-reason">{manualPredictionResult.change_reason}</p>
                    <div className="result-values">
                      <span>Temp: {manualPredictionResult.temperature}°C</span>
                      <span>Humidity: {manualPredictionResult.humidity}%</span>
                      <span>Moisture: {manualPredictionResult.moisture}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="card upload-card">
                <div className="card-head">
                  <h3>Upload Seed Image</h3>
                  <span>Germination probability and quality class</span>
                </div>
                <label className="upload-box">
                  <input type="file" accept="image/*" onChange={handleSeedUpload} />
                  <span>{seedBusy ? 'Analyzing image...' : 'Click to select image'}</span>
                </label>
                {seedErr ? <p className="error-text">{seedErr}</p> : null}
{/* Image Preview */}
                {seedResult?.image_url && (
                  <div className="image-preview">
                    <img src={getImageUrl(seedResult.image_url)} alt="Uploaded seed" />
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <h3>Latest Prediction</h3>
                </div>
                {seedResult ? (
                  <div className="prediction-box">
                    <h2>{seedResult.germination_probability}%</h2>
                    <p>Quality: {seedResult.quality_label}</p>
                    <p>Confidence: {(seedResult.confidence * 100).toFixed(1)}%</p>
                    <p>Raw Class: {seedResult.raw_class}</p>
                    <p>{seedResult.recommendation}</p>
                    {/* Germination Change Prediction */}
                    {seedResult.germination_change !== null && seedResult.germination_change !== undefined && (
                      <div className={`germination-change ${seedResult.germination_change >= 0 ? 'positive' : 'negative'}`}>
                        <span className="change-label">Predicted Change:</span>
                        <strong>{seedResult.germination_change >= 0 ? '+' : ''}{seedResult.germination_change}%</strong>
                        <p className="change-reason">{seedResult.change_reason}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Upload an image to run prediction.</p>
                )}
              </div>
            </div>

<div className="card">
              <div className="card-head">
                <h3>Prediction History</h3>
                <span>{seedHistory.length} records</span>
                {seedHistory.length > 0 && (
                  <button type="button" className="clear-btn" onClick={handleClearHistory}>
                    Clear All
                  </button>
                )}
              </div>
              <div className="history-table">
                <div className="row head">
                  <span>Image</span>
                  <span>Probability</span>
                  <span>Label</span>
                  <span>Time</span>
                  <span>Action</span>
                </div>
                {seedHistory.map((r) => (
                  <div className="row" key={`${r.id}-${r.created_at}`}>
                    <span>{r.image_name}</span>
                    <span>{r.germination_probability}%</span>
                    <span>{r.quality_label}</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    <span>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => handleDeleteRecord(r.id)}
                        disabled={deletingRecordId === r.id}
                      >
                        {deletingRecordId === r.id ? '...' : 'Delete'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {user.role === 'admin' ? (
              <div className="card">
                <div className="card-head">
                  <h3>Admin Action: Create User</h3>
                  <span>RBAC-protected endpoint /api/auth/register</span>
                </div>
                <form className="admin-form-grid" onSubmit={createUser}>
                  <input
                    value={newUser.username}
                    onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
                    placeholder="New username"
                    required
                  />
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                    placeholder="Password"
                    required
                  />
                  <button className="outline-btn" type="submit">
                    Create User
                  </button>
                </form>
                {userMsg ? <p className="status-text">{userMsg}</p> : null}

                <div className="history-table" style={{ marginTop: '10px' }}>
                  <div className="row head">
                    <span>Username</span>
                    <span>Role</span>
                    <span>Created At</span>
                    <span></span>
                  </div>
                  {users.map((u) => (
                    <div className="row" key={`${u.username}-${u.created_at}`}>
                      <span>{u.username}</span>
                      <span>{u.role}</span>
                      <span>{new Date(u.created_at).toLocaleString()}</span>
                      <span></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
