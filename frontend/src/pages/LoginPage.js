import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.name);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bg}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.grid} />
      </div>

      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⬡</span>
          <span style={styles.logoText}>TaskFlow</span>
        </div>

        <h1 style={styles.title}>
          {isLogin ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={styles.subtitle}>
          {isLogin ? 'Sign in to your workspace' : 'Start managing projects like a pro'}
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Alex Johnson"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                required={!isLogin}
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              required
            />
          </div>

          <button style={{...styles.btn, opacity: loading ? 0.7 : 1}} type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or continue with demo</span>
        </div>

        <button
          style={styles.demoBtn}
          onClick={async () => {
            setLoading(true);
            try {
              await login('demo@taskflow.io', 'demo12345');
              navigate('/');
            } catch {
              setError('Demo account not set up yet');
            } finally {
              setLoading(false);
            }
          }}
        >
          🚀 Try Demo Account
        </button>

        <p style={styles.switch}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button style={styles.switchBtn} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bg: { position: 'absolute', inset: 0, zIndex: 0 },
  orb1: {
    position: 'absolute', width: 600, height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
    top: '-100px', left: '-100px',
    animation: 'float 8s ease-in-out infinite',
  },
  orb2: {
    position: 'absolute', width: 400, height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
    bottom: '-50px', right: '-50px',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(17, 17, 24, 0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    padding: '48px',
    width: '100%', maxWidth: '440px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 0 80px rgba(124,58,237,0.15), 0 25px 50px rgba(0,0,0,0.5)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' },
  logoIcon: { fontSize: '28px', color: '#7c3aed' },
  logoText: { fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: '#fff' },
  title: { fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  subtitle: { color: '#64748b', fontSize: '15px', marginBottom: '32px' },
  error: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#94a3b8', letterSpacing: '0.3px' },
  input: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', padding: '12px 16px',
    color: '#e2e8f0', fontSize: '15px',
    outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  btn: {
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '14px', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer', marginTop: '8px',
    fontFamily: 'Syne, sans-serif', letterSpacing: '0.3px',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 0' },
  dividerText: { color: '#374151', fontSize: '13px', whiteSpace: 'nowrap' },
  demoBtn: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', borderRadius: '10px',
    padding: '12px', fontSize: '14px', cursor: 'pointer',
    marginTop: '12px', fontFamily: 'DM Sans, sans-serif',
    transition: 'background 0.2s',
  },
  switch: { color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '24px' },
  switchBtn: {
    background: 'none', border: 'none', color: '#a78bfa',
    cursor: 'pointer', fontWeight: '600', fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
  },
};
