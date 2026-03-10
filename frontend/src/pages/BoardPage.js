import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boards, tasks } from '../api/client';
import TaskModal from '../components/TaskModal';

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const PRIORITY_LABELS = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  const loadBoard = async () => {
    try {
      const res = await boards.get(boardId);
      setBoard(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (columnId) => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await tasks.create(columnId, {
        title: newTaskTitle,
        priority: 'medium',
        labels: [],
      });
      setNewTaskTitle('');
      setNewTaskCol(null);
      loadBoard();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasks.delete(taskId);
      setSelectedTask(null);
      loadBoard();
    } catch (e) {}
  };

  const handleDragStart = (e, task, fromColId) => {
    setDragState({ task, fromColId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, toColId) => {
    e.preventDefault();
    if (!dragState || dragState.fromColId === toColId) {
      setDragState(null);
      return;
    }
    try {
      await tasks.move(dragState.task.id, { column_id: toColId, position: 0 });
      loadBoard();
    } catch (e) {}
    setDragState(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#7c3aed', fontSize: '48px' }}>⬡</div>
    </div>
  );

  if (!board) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
      Board not found. <button onClick={() => navigate('/')} style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button>
    </div>
  );

  const totalTasks = (board.columns || []).reduce((sum, c) => sum + (c.tasks || []).length, 0);
  const doneTasks = (board.columns || []).find(c => c.name.toLowerCase().includes('done'))?.tasks?.length || 0;

  return (
    <div style={styles.page}>
      {/* Board Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{...styles.boardDot, background: board.color}} />
          <div>
            <h1 style={styles.boardTitle}>{board.name}</h1>
            {board.description && <p style={styles.boardDesc}>{board.description}</p>}
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.progressWrap}>
            <span style={styles.progressLabel}>{doneTasks}/{totalTasks} done</span>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: totalTasks > 0 ? `${Math.round((doneTasks/totalTasks)*100)}%` : '0%',
                background: board.color,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={styles.kanban}>
        {(board.columns || []).map(col => (
          <div
            key={col.id}
            style={styles.column}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div style={styles.colHeader}>
              <div style={styles.colHeaderLeft}>
                <div style={{...styles.colDot, background: col.color || '#94a3b8'}} />
                <span style={styles.colName}>{col.name}</span>
                <span style={styles.colCount}>{(col.tasks || []).length}</span>
              </div>
              <button
                style={styles.addTaskBtn}
                onClick={() => { setNewTaskCol(col.id); setNewTaskTitle(''); }}
              >+</button>
            </div>

            {/* Tasks */}
            <div style={styles.taskList}>
              {(col.tasks || []).map(task => (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskCard,
                    opacity: dragState?.task?.id === task.id ? 0.5 : 1,
                  }}
                  draggable
                  onDragStart={e => handleDragStart(e, task, col.id)}
                  onClick={() => setSelectedTask(task)}
                >
                  {/* Priority indicator */}
                  <div style={styles.taskTop}>
                    <span style={{
                      ...styles.priorityBadge,
                      background: PRIORITY_COLORS[task.priority] + '20',
                      color: PRIORITY_COLORS[task.priority],
                    }}>
                      {PRIORITY_LABELS[task.priority]} {task.priority}
                    </span>
                    {task.due_date && (
                      <span style={{
                        ...styles.dueBadge,
                        color: new Date(task.due_date) < new Date() ? '#ef4444' : '#64748b',
                      }}>
                        📅 {new Date(task.due_date).toLocaleDateString('en', {month:'short', day:'numeric'})}
                      </span>
                    )}
                  </div>

                  <h3 style={styles.taskTitle}>{task.title}</h3>

                  {task.description && (
                    <p style={styles.taskDesc}>{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</p>
                  )}

                  {task.labels && task.labels.length > 0 && (
                    <div style={styles.labels}>
                      {task.labels.slice(0, 3).map(l => (
                        <span key={l} style={styles.label}>{l}</span>
                      ))}
                    </div>
                  )}

                  <div style={styles.taskFooter}>
                    {task.assignee ? (
                      <div style={styles.assigneeAvatar} title={task.assignee.name}>
                        {task.assignee.name?.[0]?.toUpperCase()}
                      </div>
                    ) : (
                      <div style={styles.unassigned}>Unassigned</div>
                    )}
                    {task.estimated_hours && (
                      <span style={styles.estimate}>⏱ {task.estimated_hours}h</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Add task inline */}
              {newTaskCol === col.id && (
                <div style={styles.newTaskCard}>
                  <textarea
                    style={styles.newTaskInput}
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(col.id); }
                      if (e.key === 'Escape') setNewTaskCol(null);
                    }}
                    rows={2}
                    autoFocus
                  />
                  <div style={styles.newTaskActions}>
                    <button style={styles.cancelBtn} onClick={() => setNewTaskCol(null)}>Cancel</button>
                    <button style={styles.addBtn} onClick={() => handleAddTask(col.id)} disabled={addingTask}>
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              {newTaskCol !== col.id && (
                <button
                  style={styles.addTaskRowBtn}
                  onClick={() => { setNewTaskCol(col.id); setNewTaskTitle(''); }}
                >
                  + Add task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          boardId={boardId}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDeleteTask}
          onUpdate={() => { loadBoard(); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  boardDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  boardTitle: { fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: '#fff' },
  boardDesc: { fontSize: '14px', color: '#64748b', marginTop: '2px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  progressLabel: { fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' },
  progressBar: { width: '120px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  kanban: {
    display: 'flex', gap: '16px', overflowX: 'auto', flex: 1,
    paddingBottom: '16px', alignItems: 'flex-start',
  },
  column: {
    background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px', minWidth: '280px', maxWidth: '280px',
    display: 'flex', flexDirection: 'column', maxHeight: '100%',
  },
  colHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 14px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  colHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  colDot: { width: '8px', height: '8px', borderRadius: '50%' },
  colName: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0', fontFamily: 'Syne, sans-serif' },
  colCount: {
    fontSize: '11px', color: '#4b5563', background: 'rgba(255,255,255,0.06)',
    borderRadius: '20px', padding: '1px 7px', fontWeight: '600',
  },
  addTaskBtn: {
    background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer',
    fontSize: '20px', lineHeight: 1, padding: '2px 4px', transition: 'color 0.2s',
  },
  taskList: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 },
  taskCard: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px', padding: '12px', cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
  },
  taskTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  priorityBadge: { fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' },
  dueBadge: { fontSize: '10px', fontWeight: '500' },
  taskTitle: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0', lineHeight: '1.4', marginBottom: '6px', fontFamily: 'DM Sans, sans-serif' },
  taskDesc: { fontSize: '12px', color: '#64748b', lineHeight: '1.5', marginBottom: '8px' },
  labels: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' },
  label: {
    fontSize: '10px', fontWeight: '500', color: '#7c3aed',
    background: 'rgba(124,58,237,0.15)', padding: '2px 6px', borderRadius: '20px',
  },
  taskFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  assigneeAvatar: {
    width: '22px', height: '22px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: '700', color: '#fff',
  },
  unassigned: { fontSize: '11px', color: '#374151' },
  estimate: { fontSize: '11px', color: '#64748b' },
  newTaskCard: {
    background: '#1a1a24', border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  newTaskInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', padding: '8px 10px', color: '#e2e8f0',
    fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif',
  },
  newTaskActions: { display: 'flex', gap: '6px', justifyContent: 'flex-end' },
  cancelBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b',
    borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  addBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#fff', border: 'none', borderRadius: '6px',
    padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
    fontFamily: 'DM Sans, sans-serif',
  },
  addTaskRowBtn: {
    background: 'none', border: 'none', color: '#374151', cursor: 'pointer',
    padding: '8px', fontSize: '13px', textAlign: 'left', width: '100%',
    borderRadius: '6px', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
  },
};
