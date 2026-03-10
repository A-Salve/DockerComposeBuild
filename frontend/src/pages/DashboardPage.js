import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { workspaces, boards } from '../api/client';

const BOARD_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#4f46e5', '#0f766e', '#b45309',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wsList, setWsList] = useState([]);
  const [boardsMap, setBoardsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#7c3aed');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const wsRes = await workspaces.list();
      setWsList(wsRes.data || []);

      const boardsData = {};
      for (const ws of wsRes.data || []) {
        const br = await boards.list(ws.id);
        boardsData[ws.id] = br.data || [];
      }
      setBoardsMap(boardsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const res = await workspaces.create({ name: newWsName });
      setWsList(w => [...w, res.data]);
      setBoardsMap(m => ({...m, [res.data.id]: []}));
      setNewWsName('');
      setShowNewWs(false);
    } catch (e) {
      console.error(e);
    }
  };

  const createBoard = async (wsId) => {
    if (!newBoardName.trim()) return;
    try {
      const res = await boards.create(wsId, { name: newBoardName, color: newBoardColor });
      setBoardsMap(m => ({...m, [wsId]: [...(m[wsId] || []), res.data]}));
      setNewBoardName('');
      setShowNewBoard(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <LoadingScreen />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <h1 style={styles.heroTitle}>{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={styles.heroSub}>You have {Object.values(boardsMap).flat().length} boards across {wsList.length} workspaces</p>
        </div>
        <div style={styles.heroStats}>
          <StatCard label="Workspaces" value={wsList.length} color="#7c3aed" />
          <StatCard label="Boards" value={Object.values(boardsMap).flat().length} color="#2563eb" />
          <StatCard label="Active" value={Object.values(boardsMap).flat().length} color="#059669" />
        </div>
      </div>

      {wsList.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⬡</div>
          <h2 style={styles.emptyTitle}>Welcome to TaskFlow</h2>
          <p style={styles.emptySub}>Create your first workspace to get started</p>
          <button style={styles.emptyBtn} onClick={() => setShowNewWs(true)}>
            Create Workspace
          </button>
        </div>
      )}

      {wsList.map(ws => (
        <div key={ws.id} style={styles.wsSection}>
          <div style={styles.wsSectionHeader}>
            <div style={styles.wsTitle}>
              <div style={{
                ...styles.wsIcon,
                background: `hsl(${ws.name.charCodeAt(0) * 137}deg, 60%, 35%)`,
              }}>
                {ws.name[0].toUpperCase()}
              </div>
              <span style={styles.wsTitleText}>{ws.name}</span>
              <span style={styles.wsBoardCount}>{(boardsMap[ws.id] || []).length} boards</span>
            </div>
            <div style={styles.wsActions}>
              <button style={styles.actionBtn} onClick={() => navigate(`/analytics?ws=${ws.id}`)}>
                Analytics
              </button>
              <button style={styles.actionBtnPrimary} onClick={() => { setShowNewBoard(ws.id); setNewBoardName(''); }}>
                + Board
              </button>
            </div>
          </div>

          <div style={styles.boardGrid}>
            {(boardsMap[ws.id] || []).map(board => (
              <BoardCard key={board.id} board={board} onClick={() => navigate(`/board/${board.id}`)} />
            ))}

            {showNewBoard === ws.id && (
              <div style={styles.newBoardCard}>
                <input
                  style={styles.newBoardInput}
                  placeholder="Board name..."
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createBoard(ws.id)}
                  autoFocus
                />
                <div style={styles.colorPicker}>
                  {BOARD_COLORS.slice(0, 6).map(c => (
                    <div
                      key={c} style={{
                        ...styles.colorDot,
                        background: c,
                        outline: newBoardColor === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                      onClick={() => setNewBoardColor(c)}
                    />
                  ))}
                </div>
                <div style={styles.newBoardActions}>
                  <button style={styles.cancelBtn} onClick={() => setShowNewBoard(null)}>Cancel</button>
                  <button style={styles.createBtn} onClick={() => createBoard(ws.id)}>Create</button>
                </div>
              </div>
            )}

            <button style={styles.addBoardBtn} onClick={() => { setShowNewBoard(ws.id); setNewBoardName(''); }}>
              <span style={styles.addBoardIcon}>+</span>
              <span style={styles.addBoardText}>New Board</span>
            </button>
          </div>
        </div>
      ))}

      <div style={styles.newWsSection}>
        {!showNewWs ? (
          <button style={styles.newWsBtn} onClick={() => setShowNewWs(true)}>
            + New Workspace
          </button>
        ) : (
          <div style={styles.newWsForm}>
            <input
              style={styles.newWsInput}
              placeholder="Workspace name..."
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createWorkspace()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.cancelBtn} onClick={() => setShowNewWs(false)}>Cancel</button>
              <button style={styles.createBtn} onClick={createWorkspace}>Create</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{...statStyles.card, borderColor: color + '30'}}>
      <div style={{...statStyles.value, color}}>{value}</div>
      <div style={statStyles.label}>{label}</div>
    </div>
  );
}

const statStyles = {
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid',
    borderRadius: '12px', padding: '16px 24px', textAlign: 'center',
    minWidth: '100px',
  },
  value: { fontSize: '28px', fontWeight: '800', fontFamily: 'Syne, sans-serif', lineHeight: 1 },
  label: { fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' },
};

function BoardCard({ board, onClick }) {
  return (
    <div style={{...styles.boardCard}} onClick={onClick}>
      <div style={{...styles.boardCardTop, background: board.color || '#7c3aed'}} />
      <div style={styles.boardCardBody}>
        <div style={styles.boardCardName}>{board.name}</div>
        {board.description && <div style={styles.boardCardDesc}>{board.description}</div>}
        <div style={styles.boardCardMeta}>
          <span style={styles.boardCardDate}>
            {new Date(board.created_at).toLocaleDateString()}
          </span>
          <span style={{...styles.boardCardBadge, background: (board.color || '#7c3aed') + '20', color: board.color || '#7c3aed'}}>
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: '#7c3aed', fontSize: '32px', animation: 'spin 1s linear infinite' }}>⬡</div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '1400px', margin: '0 auto' },
  hero: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '40px', flexWrap: 'wrap', gap: '20px',
  },
  heroTitle: { fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '6px' },
  heroSub: { color: '#64748b', fontSize: '15px' },
  heroStats: { display: 'flex', gap: '12px' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '80px 20px', textAlign: 'center',
  },
  emptyIcon: { fontSize: '64px', color: '#7c3aed', marginBottom: '20px' },
  emptyTitle: { fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '12px' },
  emptySub: { color: '#64748b', fontSize: '16px', marginBottom: '32px' },
  emptyBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '14px 28px', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'Syne, sans-serif',
  },
  wsSection: { marginBottom: '48px' },
  wsSectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '16px',
  },
  wsTitle: { display: 'flex', alignItems: 'center', gap: '10px' },
  wsIcon: {
    width: '28px', height: '28px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', color: '#fff',
  },
  wsTitleText: { fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', color: '#e2e8f0' },
  wsBoardCount: { fontSize: '12px', color: '#4b5563', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px' },
  wsActions: { display: 'flex', gap: '8px' },
  actionBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', borderRadius: '8px', padding: '8px 16px',
    fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  },
  actionBtnPrimary: {
    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
    color: '#a78bfa', borderRadius: '8px', padding: '8px 16px',
    fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: '600',
  },
  boardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  boardCard: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  },
  boardCardTop: { height: '6px' },
  boardCardBody: { padding: '16px' },
  boardCardName: { fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' },
  boardCardDesc: { fontSize: '12px', color: '#64748b', marginBottom: '12px', lineHeight: '1.4' },
  boardCardMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  boardCardDate: { fontSize: '11px', color: '#374151' },
  boardCardBadge: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' },
  addBoardBtn: {
    background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '14px', padding: '24px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', transition: 'border-color 0.2s',
    minHeight: '120px',
  },
  addBoardIcon: { fontSize: '24px', color: '#374151' },
  addBoardText: { fontSize: '13px', color: '#374151', fontFamily: 'DM Sans, sans-serif' },
  newBoardCard: {
    background: '#111118', border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  newBoardInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
    fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif',
  },
  colorPicker: { display: 'flex', gap: '8px' },
  colorDot: { width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer' },
  newBoardActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  cancelBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
    fontFamily: 'DM Sans, sans-serif',
  },
  newWsSection: { marginTop: '32px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  newWsBtn: {
    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)',
    color: '#4b5563', borderRadius: '10px', padding: '12px 24px',
    fontSize: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
  },
  newWsForm: {
    display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
  },
  newWsInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '10px 16px', color: '#e2e8f0',
    fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', width: '280px',
  },
};
