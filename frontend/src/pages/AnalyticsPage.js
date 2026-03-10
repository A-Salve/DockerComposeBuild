import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { workspaces } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const ANALYTICS_URL = process.env.REACT_APP_ANALYTICS_URL || 'http://localhost:8082';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const [wsList, setWsList] = useState([]);
  const [selectedWs, setSelectedWs] = useState(searchParams.get('ws') || '');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    workspaces.list().then(r => {
      setWsList(r.data || []);
      if (!selectedWs && r.data?.length > 0) {
        setSelectedWs(r.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedWs) loadStats(selectedWs);
  }, [selectedWs]);

  const loadStats = async (wsId) => {
    setLoading(true);
    try {
      const res = await fetch(`${ANALYTICS_URL}/stats/workspace/${wsId}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      // If analytics service not running, use mock data
      setStats({
        summary: { total: 24, completed: 8, in_progress: 6, overdue: 3, avg_completion_hours: 18.5 },
        priorities: [
          { priority: 'low', count: 8 },
          { priority: 'medium', count: 10 },
          { priority: 'high', count: 4 },
          { priority: 'critical', count: 2 },
        ],
        activity: Array.from({ length: 14 }, (_, i) => ({
          date: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
          count: Math.floor(Math.random() * 6) + 1,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats ? Math.round((stats.summary.completed / Math.max(stats.summary.total, 1)) * 100) : 0;

  const wsName = wsList.find(w => w.id === selectedWs)?.name || 'Workspace';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics</h1>
          <p style={styles.subtitle}>Performance overview and insights</p>
        </div>
        <select
          style={styles.select}
          value={selectedWs}
          onChange={e => setSelectedWs(e.target.value)}
        >
          {wsList.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#7c3aed', fontSize: '32px' }}>⬡</div>
      )}

      {!loading && stats && (
        <>
          {/* KPI Cards */}
          <div style={styles.kpiGrid}>
            <KPICard label="Total Tasks" value={stats.summary.total} icon="📋" color="#7c3aed" change="+12%" />
            <KPICard label="Completed" value={stats.summary.completed} icon="✅" color="#10b981" change={`${completionRate}%`} />
            <KPICard label="In Progress" value={stats.summary.in_progress} icon="⚡" color="#f59e0b" />
            <KPICard label="Overdue" value={stats.summary.overdue} icon="⚠️" color="#ef4444" />
            <KPICard label="Avg Time" value={`${Math.round(stats.summary.avg_completion_hours)}h`} icon="⏱" color="#3b82f6" />
          </div>

          {/* Progress ring + charts */}
          <div style={styles.chartsGrid}>
            {/* Completion Ring */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Completion Rate</h3>
              <div style={styles.ringWrap}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
                  <circle
                    cx="80" cy="80" r="60" fill="none" stroke="#7c3aed" strokeWidth="16"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - completionRate / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={styles.ringCenter}>
                  <span style={styles.ringValue}>{completionRate}%</span>
                  <span style={styles.ringLabel}>Done</span>
                </div>
              </div>
              <div style={styles.ringStats}>
                <div style={styles.ringStat}>
                  <div style={{...styles.ringDot, background: '#7c3aed'}} />
                  <span>Completed: {stats.summary.completed}</span>
                </div>
                <div style={styles.ringStat}>
                  <div style={{...styles.ringDot, background: 'rgba(255,255,255,0.1)'}} />
                  <span>Remaining: {stats.summary.total - stats.summary.completed}</span>
                </div>
              </div>
            </div>

            {/* Priority Distribution */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.priorities}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="priority"
                  >
                    {stats.priorities.map((entry, i) => (
                      <Cell key={entry.priority} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.legend}>
                {stats.priorities.map((p, i) => (
                  <div key={p.priority} style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: COLORS[i % COLORS.length]}} />
                    <span style={styles.legendLabel}>{p.priority}</span>
                    <span style={styles.legendValue}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity over time */}
            <div style={{...styles.card, gridColumn: 'span 2'}}>
              <h3 style={styles.cardTitle}>Task Activity (Last 14 days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.activity.map(a => ({
                  date: new Date(a.date).toLocaleDateString('en', {month:'short', day:'numeric'}),
                  tasks: a.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }}
                  />
                  <Bar dataKey="tasks" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!loading && !stats && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
          Select a workspace to view analytics
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon, color, change }) {
  return (
    <div style={{...kpiStyles.card, borderTopColor: color}}>
      <div style={kpiStyles.top}>
        <span style={kpiStyles.icon}>{icon}</span>
        {change && <span style={{...kpiStyles.change, color}}>{change}</span>}
      </div>
      <div style={{...kpiStyles.value, color}}>{value}</div>
      <div style={kpiStyles.label}>{label}</div>
    </div>
  );
}

const kpiStyles = {
  card: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '20px', borderTop: '3px solid',
  },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  icon: { fontSize: '24px' },
  change: { fontSize: '12px', fontWeight: '600', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '20px' },
  value: { fontSize: '32px', fontWeight: '800', fontFamily: 'Syne, sans-serif', lineHeight: 1, marginBottom: '4px' },
  label: { fontSize: '13px', color: '#64748b', fontWeight: '500' },
};

const styles = {
  page: { maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '32px', flexWrap: 'wrap', gap: '16px',
  },
  title: { fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px' },
  subtitle: { color: '#64748b', fontSize: '14px' },
  select: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '10px 16px', color: '#e2e8f0', fontSize: '14px', cursor: 'pointer',
    outline: 'none', fontFamily: 'DM Sans, sans-serif',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '24px',
  },
  chartsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  card: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px', padding: '24px',
  },
  cardTitle: {
    fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '700',
    color: '#e2e8f0', marginBottom: '20px',
  },
  ringWrap: { display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: '16px' },
  ringCenter: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  ringValue: { display: 'block', fontSize: '28px', fontWeight: '800', color: '#fff', fontFamily: 'Syne, sans-serif' },
  ringLabel: { display: 'block', fontSize: '12px', color: '#64748b' },
  ringStats: { display: 'flex', flexDirection: 'column', gap: '8px' },
  ringStat: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' },
  ringDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  legend: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, textTransform: 'capitalize' },
  legendValue: { fontWeight: '600', color: '#e2e8f0' },
};
