import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { workspaces, notifications } from '../api/client';

const icons = {
  home: '⊞',
  board: '▦',
  analytics: '◈',
  settings: '⚙',
  notif: '◉',
  add: '+',
  logout: '→',
  chevron: '›',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [wsList, setWsList] = useState([]);
  const [notifList, setNotifList] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    workspaces.list().then(r => setWsList(r.data)).catch(() => {});
    notifications.list().then(r => setNotifList(r.data)).catch(() => {});
  }, []);

  const unread = notifList.filter(n => !n.read).length;

  const navItems = [
    { label: 'Dashboard', icon: '⊞', path: '/' },
    { label: 'Analytics', icon: '◈', path: '/analytics' },
  ];

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={{...styles.sidebar, width: sidebarCollapsed ? '64px' : '240px'}}>
        <div style={styles.sidebarHeader}>
          {!sidebarCollapsed && (
            <div style={styles.logo}>
              <span style={styles.logoIcon}>⬡</span>
              <span style={styles.logoText}>TaskFlow</span>
            </div>
          )}
          <button style={styles.collapseBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navItemActive : {}),
              }}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div style={styles.workspacesSection}>
            <div style={styles.sectionLabel}>WORKSPACES</div>
            {wsList.map(ws => (
              <button
                key={ws.id}
                style={{
                  ...styles.wsItem,
                  ...(location.pathname.includes(ws.id) ? styles.wsItemActive : {}),
                }}
                onClick={() => navigate(`/workspace/${ws.id}`)}
              >
                <div style={{
                  ...styles.wsAvatar,
                  background: `hsl(${ws.name.charCodeAt(0) * 137}deg, 60%, 35%)`,
                }}>
                  {ws.name[0].toUpperCase()}
                </div>
                <span style={styles.wsName}>{ws.name}</span>
              </button>
            ))}
            <button style={styles.addWsBtn} onClick={() => navigate('/workspace/new')}>
              <span>+</span>
              <span>New Workspace</span>
            </button>
          </div>
        )}

        <div style={styles.sidebarFooter}>
          {!sidebarCollapsed && user && (
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user.name?.[0]?.toUpperCase()}</div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user.name}</div>
                <div style={styles.userEmail}>{user.email}</div>
              </div>
            </div>
          )}
          <button style={styles.logoutBtn} onClick={logout} title="Logout">⇥</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Top bar */}
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.breadcrumb}>
              {location.pathname === '/' && <span>Dashboard</span>}
              {location.pathname === '/analytics' && <span>Analytics</span>}
            </div>
          </div>
          <div style={styles.topbarRight}>
            <div style={styles.notifWrapper}>
              <button style={styles.iconBtn} onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) notifications.markRead().then(() => setNotifList(n => n.map(x => ({...x, read: true}))));
              }}>
                <span>◉</span>
                {unread > 0 && <span style={styles.badge}>{unread}</span>}
              </button>
              {notifOpen && (
                <div style={styles.notifDropdown}>
                  <div style={styles.notifHeader}>Notifications</div>
                  {notifList.length === 0 && (
                    <div style={styles.notifEmpty}>No notifications yet</div>
                  )}
                  {notifList.slice(0, 5).map(n => (
                    <div key={n.id} style={{...styles.notifItem, opacity: n.read ? 0.6 : 1}}>
                      <div style={styles.notifTitle}>{n.title}</div>
                      <div style={styles.notifMsg}>{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {user && (
              <div style={styles.topbarUser}>
                <div style={styles.topbarAvatar}>{user.name?.[0]?.toUpperCase()}</div>
                <span style={styles.topbarUserName}>{user.name}</span>
              </div>
            )}
          </div>
        </header>

        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', height: '100vh', background: '#0a0a0f', overflow: 'hidden' },
  sidebar: {
    background: '#0d0d14',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden', flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoIcon: { fontSize: '22px', color: '#7c3aed' },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: '700', color: '#fff', fontSize: '18px' },
  collapseBtn: {
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
    fontSize: '18px', padding: '4px', lineHeight: 1,
  },
  nav: { padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px',
    background: 'none', border: 'none', color: '#64748b',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
    fontFamily: 'DM Sans, sans-serif',
  },
  navItemActive: {
    background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
  },
  navIcon: { fontSize: '16px', flexShrink: 0, width: '20px', textAlign: 'center' },
  workspacesSection: { padding: '8px', flex: 1, overflowY: 'auto' },
  sectionLabel: {
    fontSize: '10px', fontWeight: '700', color: '#374151', letterSpacing: '1px',
    padding: '8px 12px 4px',
  },
  wsItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', borderRadius: '8px',
    background: 'none', border: 'none', color: '#94a3b8',
    cursor: 'pointer', width: '100%', textAlign: 'left',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500',
    transition: 'background 0.15s',
  },
  wsItemActive: { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' },
  wsAvatar: {
    width: '24px', height: '24px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
  },
  wsName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  addWsBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', borderRadius: '8px',
    background: 'none', border: '1px dashed rgba(255,255,255,0.1)', color: '#4b5563',
    cursor: 'pointer', width: '100%', marginTop: '8px',
    fontSize: '13px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
  },
  sidebarFooter: {
    padding: '12px 8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' },
  avatar: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0,
  },
  userDetails: { overflow: 'hidden' },
  userName: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: {
    background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer',
    fontSize: '18px', padding: '6px', transition: 'color 0.2s', flexShrink: 0,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    height: '60px', background: 'rgba(10,10,15,0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', backdropFilter: 'blur(10px)', flexShrink: 0,
  },
  topbarLeft: {},
  breadcrumb: { color: '#94a3b8', fontSize: '14px', fontWeight: '500' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  notifWrapper: { position: 'relative' },
  iconBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', width: '36px', height: '36px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#94a3b8', fontSize: '16px', position: 'relative',
  },
  badge: {
    position: 'absolute', top: '-4px', right: '-4px',
    background: '#7c3aed', color: '#fff',
    borderRadius: '50%', width: '16px', height: '16px',
    fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700',
  },
  notifDropdown: {
    position: 'absolute', top: '44px', right: 0,
    background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', width: '320px', zIndex: 100,
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  notifHeader: {
    padding: '16px', fontFamily: 'Syne, sans-serif',
    fontWeight: '600', fontSize: '14px', color: '#e2e8f0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  notifEmpty: { padding: '32px 16px', color: '#4b5563', textAlign: 'center', fontSize: '14px' },
  notifItem: {
    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  notifTitle: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '2px' },
  notifMsg: { fontSize: '12px', color: '#64748b' },
  topbarUser: { display: 'flex', alignItems: 'center', gap: '8px' },
  topbarAvatar: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', color: '#fff',
  },
  topbarUserName: { fontSize: '13px', fontWeight: '500', color: '#94a3b8' },
  content: { flex: 1, overflowY: 'auto', padding: '24px' },
};
