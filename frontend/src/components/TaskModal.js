import { useState, useEffect } from 'react';
import { tasks as tasksApi, workspaces } from '../api/client';
import { useParams } from 'react-router-dom';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

export default function TaskModal({ task, boardId, onClose, onDelete, onUpdate }) {
  const [detail, setDetail] = useState(task);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');

  useEffect(() => {
    tasksApi.get(task.id).then(r => setDetail(r.data)).catch(() => {});
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [task.id]);

  const handleSave = async () => {
    try {
      await tasksApi.update(task.id, { title, description });
      setEditing(false);
      tasksApi.get(task.id).then(r => setDetail(r.data));
    } catch (e) {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await tasksApi.addComment(task.id, { content: comment });
      setComment('');
      const res = await tasksApi.get(task.id);
      setDetail(res.data);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const handlePriorityChange = async (priority) => {
    await tasksApi.update(task.id, { priority });
    setDetail(d => ({...d, priority}));
  };

  const dueDate = detail.due_date ? new Date(detail.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose}>×</button>

        <div style={styles.layout}>
          {/* Left: Main content */}
          <div style={styles.main}>
            <div style={styles.taskMeta}>
              <span style={{
                ...styles.priorityTag,
                background: PRIORITY_COLORS[detail.priority] + '20',
                color: PRIORITY_COLORS[detail.priority],
              }}>
                {detail.priority?.toUpperCase()}
              </span>
              {dueDate && (
                <span style={{...styles.dueTag, color: isOverdue ? '#ef4444' : '#64748b'}}>
                  📅 Due {dueDate.toLocaleDateString('en', {month:'long', day:'numeric', year:'numeric'})}
                  {isOverdue && ' (Overdue)'}
                </span>
              )}
            </div>

            {editing ? (
              <div style={styles.editSection}>
                <input
                  style={styles.titleInput}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
                <textarea
                  style={styles.descInput}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add description..."
                />
                <div style={styles.editActions}>
                  <button style={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
                  <button style={styles.saveBtn} onClick={handleSave}>Save</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditing(true)} style={styles.viewSection}>
                <h2 style={styles.taskTitle}>{detail.title}</h2>
                <p style={styles.taskDesc}>
                  {detail.description || <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Click to add description...</span>}
                </p>
              </div>
            )}

            {/* Labels */}
            {detail.labels && detail.labels.length > 0 && (
              <div style={styles.labelsSection}>
                <div style={styles.sectionLabel}>Labels</div>
                <div style={styles.labels}>
                  {detail.labels.map(l => (
                    <span key={l} style={styles.label}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={styles.commentsSection}>
              <div style={styles.sectionLabel}>
                Comments ({detail.comments?.length || 0})
              </div>
              <form onSubmit={handleComment} style={styles.commentForm}>
                <textarea
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                />
                <button type="submit" style={styles.commentBtn} disabled={loading}>
                  {loading ? '...' : 'Post'}
                </button>
              </form>
              <div style={styles.commentList}>
                {(detail.comments || []).map(c => (
                  <div key={c.id} style={styles.comment}>
                    <div style={styles.commentAvatar}>
                      {c.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={styles.commentBody}>
                      <div style={styles.commentHeader}>
                        <span style={styles.commentAuthor}>{c.user?.name || 'Unknown'}</span>
                        <span style={styles.commentTime}>
                          {new Date(c.created_at).toLocaleDateString('en', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p style={styles.commentText}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sideSection}>
              <div style={styles.sideSectionLabel}>Priority</div>
              <div style={styles.priorityList}>
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    style={{
                      ...styles.priorityOption,
                      background: detail.priority === p ? PRIORITY_COLORS[p] + '20' : 'transparent',
                      color: detail.priority === p ? PRIORITY_COLORS[p] : '#64748b',
                      borderColor: detail.priority === p ? PRIORITY_COLORS[p] + '40' : 'rgba(255,255,255,0.06)',
                    }}
                    onClick={() => handlePriorityChange(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {detail.assignee && (
              <div style={styles.sideSection}>
                <div style={styles.sideSectionLabel}>Assignee</div>
                <div style={styles.assigneeInfo}>
                  <div style={styles.assigneeAvatar}>
                    {detail.assignee.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={styles.assigneeName}>{detail.assignee.name}</span>
                </div>
              </div>
            )}

            {detail.estimated_hours && (
              <div style={styles.sideSection}>
                <div style={styles.sideSectionLabel}>Estimate</div>
                <div style={styles.estimate}>⏱ {detail.estimated_hours} hours</div>
              </div>
            )}

            <div style={styles.sideSection}>
              <div style={styles.sideSectionLabel}>Created</div>
              <div style={styles.metaVal}>
                {new Date(detail.created_at).toLocaleDateString('en', {month:'long', day:'numeric', year:'numeric'})}
              </div>
            </div>

            <button style={styles.deleteBtn} onClick={() => onDelete(task.id)}>
              🗑 Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px',
  },
  modal: {
    background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px', width: '100%', maxWidth: '800px',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
  },
  closeBtn: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', width: '28px', height: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', lineHeight: 1, zIndex: 1,
  },
  layout: { display: 'flex', overflow: 'hidden', flex: 1, minHeight: 0 },
  main: { flex: 1, padding: '28px', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)' },
  sidebar: { width: '220px', padding: '28px 20px', overflowY: 'auto', flexShrink: 0 },
  taskMeta: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  priorityTag: { fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' },
  dueTag: { fontSize: '12px', fontWeight: '500' },
  editSection: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' },
  titleInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.4)',
    borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0',
    fontSize: '20px', fontWeight: '700', outline: 'none', fontFamily: 'Syne, sans-serif',
  },
  descInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0',
    fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5',
  },
  editActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  viewSection: { cursor: 'pointer', marginBottom: '24px' },
  taskTitle: { fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '10px', lineHeight: '1.3' },
  taskDesc: { fontSize: '14px', color: '#94a3b8', lineHeight: '1.7', whiteSpace: 'pre-wrap' },
  labelsSection: { marginBottom: '24px' },
  sectionLabel: { fontSize: '11px', fontWeight: '700', color: '#374151', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' },
  labels: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  label: { fontSize: '12px', color: '#7c3aed', background: 'rgba(124,58,237,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' },
  commentsSection: { marginTop: '8px' },
  commentForm: { display: 'flex', gap: '8px', marginBottom: '16px' },
  commentInput: {
    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
    fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif',
  },
  commentBtn: {
    background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
    color: '#a78bfa', borderRadius: '8px', padding: '0 16px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif',
    alignSelf: 'flex-end', paddingBottom: '10px', paddingTop: '10px',
  },
  commentList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  comment: { display: 'flex', gap: '10px' },
  commentAvatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
  },
  commentBody: { flex: 1 },
  commentHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  commentAuthor: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0' },
  commentTime: { fontSize: '11px', color: '#374151' },
  commentText: { fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  sideSection: { marginBottom: '24px' },
  sideSectionLabel: { fontSize: '10px', fontWeight: '700', color: '#374151', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' },
  priorityList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  priorityOption: {
    padding: '6px 12px', borderRadius: '6px', border: '1px solid',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
    textAlign: 'left', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
  },
  assigneeInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  assigneeAvatar: {
    width: '24px', height: '24px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: '700', color: '#fff',
  },
  assigneeName: { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  estimate: { fontSize: '14px', color: '#94a3b8' },
  metaVal: { fontSize: '13px', color: '#64748b' },
  deleteBtn: {
    width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#f87171', borderRadius: '8px', padding: '10px',
    cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    transition: 'all 0.15s', marginTop: '8px',
  },
  cancelBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
    fontWeight: '600', fontFamily: 'DM Sans, sans-serif',
  },
};
