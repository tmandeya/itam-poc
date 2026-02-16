'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { Plus, X, Check, Shield, Building2, Eye, EyeOff, Loader2, Mail, User } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#B8960C', site_admin: '#2563EB', it_staff: '#16A34A',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}12`, color, border: `1px solid ${color}30`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

export default function UsersPage() {
  const { profile, sites } = useApp();
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState('');
  const [editSites, setEditSites] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '', email: '', password: '', employee_id: '', role: 'it_staff', site_ids: [] as string[],
  });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const [{ data: profilesData }, { data: assignData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_site_assignments').select('*'),
    ]);
    if (profilesData) setUsers(profilesData);
    if (assignData) setAssignments(assignData);
    setLoading(false);
  }

  function getUserSites(userId: string) {
    return assignments.filter(a => a.user_id === userId).map(a => a.site_id);
  }

  function openEdit(user: any) {
    setEditUser(user);
    setEditRole(user.role);
    setEditSites(getUserSites(user.id));
  }

  async function handleSaveUser() {
    if (!editUser) return;
    await supabase.from('profiles').update({ role: editRole }).eq('id', editUser.id);
    await supabase.from('user_site_assignments').delete().eq('user_id', editUser.id);
    if (editSites.length > 0) {
      await supabase.from('user_site_assignments').insert(
        editSites.map(siteId => ({ user_id: editUser.id, site_id: siteId, assigned_by: profile?.id }))
      );
    }
    setEditUser(null);
    loadUsers();
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to create user'); setAddLoading(false); return; }
      setShowAddModal(false);
      setAddForm({ full_name: '', email: '', password: '', employee_id: '', role: 'it_staff', site_ids: [] });
      loadUsers();
    } catch (err: any) {
      setAddError(err.message || 'Network error');
    }
    setAddLoading(false);
  }

  function toggleSite(siteId: string) {
    setEditSites(prev => prev.includes(siteId) ? prev.filter(s => s !== siteId) : [...prev, siteId]);
  }

  function toggleAddSite(siteId: string) {
    setAddForm(f => ({
      ...f,
      site_ids: f.site_ids.includes(siteId) ? f.site_ids.filter(s => s !== siteId) : [...f.site_ids, siteId],
    }));
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  const inputStyle = {
    width: '100%', padding: '8px 10px', background: '#F0F0F0',
    border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', fontSize: 13,
  } as const;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#666', fontSize: 13 }}>{users.length} users registered</p>
        {isSuperAdmin && (
          <button onClick={() => setShowAddModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} /> Add User
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Name', 'Email', 'Employee ID', 'Role', 'Assigned Sites', 'Status', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: 'left', background: '#F8F8F8',
                  color: '#666', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase',
                  letterSpacing: 0.6, borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</td></tr>
            ) : users.map(user => {
              const userSites = getUserSites(user.id);
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #E0E0E0' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8F8F8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `${ROLE_COLORS[user.role]}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: ROLE_COLORS[user.role],
                      }}>
                        {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      {user.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#666' }}>{user.email}</td>
                  <td style={{ padding: '11px 14px', color: '#1A1A1A' }}>{user.employee_id || '—'}</td>
                  <td style={{ padding: '11px 14px' }}><Badge text={user.role} color={ROLE_COLORS[user.role]} /></td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {userSites.length === 0 ? (
                        <span style={{ color: '#999', fontSize: 11 }}>None assigned</span>
                      ) : userSites.map(s => (
                        <span key={s} style={{
                          padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: 'rgba(212,168,0,0.1)', color: '#B8960C', border: '1px solid rgba(212,168,0,0.2)',
                        }}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge text={user.is_active ? 'active' : 'inactive'} color={user.is_active ? '#16A34A' : '#DC2626'} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {isSuperAdmin && (
                      <button onClick={() => openEdit(user)} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: 'rgba(212,168,0,0.1)', color: '#B8960C', fontSize: 11,
                        cursor: 'pointer', fontWeight: 600,
                      }}>Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── ADD USER MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 18 }}>Add New User</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddUser} style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {addError && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12 }}>{addError}</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Full Name *</label>
                  <input required value={addForm.full_name} onChange={e => setAddForm(f => ({...f, full_name: e.target.value}))} placeholder="John Doe" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Employee ID</label>
                  <input value={addForm.employee_id} onChange={e => setAddForm(f => ({...f, employee_id: e.target.value}))} placeholder="EMP-001" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Email *</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))} placeholder="user@magayamining.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Temp Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input required type={showPassword ? 'text' : 'password'} minLength={6} value={addForm.password} onChange={e => setAddForm(f => ({...f, password: e.target.value}))} placeholder="Min 6 chars" style={{ ...inputStyle, paddingRight: 32 }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Role *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['super_admin', 'site_admin', 'it_staff'] as const).map(role => (
                    <button key={role} type="button" onClick={() => setAddForm(f => ({...f, role}))} style={{
                      flex: 1, padding: '7px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${addForm.role === role ? ROLE_COLORS[role] : '#E0E0E0'}`,
                      background: addForm.role === role ? `${ROLE_COLORS[role]}10` : '#fff',
                      color: addForm.role === role ? ROLE_COLORS[role] : '#999',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}>{role.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Assign Sites</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                  {sites.map(site => (
                    <button key={site.id} type="button" onClick={() => toggleAddSite(site.id)} style={{
                      padding: '6px 4px', borderRadius: 6, fontSize: 11,
                      border: `1px solid ${addForm.site_ids.includes(site.id) ? '#D4A800' : '#E0E0E0'}`,
                      background: addForm.site_ids.includes(site.id) ? 'rgba(212,168,0,0.08)' : '#fff',
                      color: addForm.site_ids.includes(site.id) ? '#B8960C' : '#666',
                      cursor: 'pointer', textAlign: 'center', fontWeight: addForm.site_ids.includes(site.id) ? 600 : 400,
                    }}>{site.id}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={addLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  borderRadius: 6, border: 'none', background: addLoading ? '#B8960C' : '#D4A800',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: addLoading ? 'not-allowed' : 'pointer',
                }}>
                  {addLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  {addLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setEditUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 18 }}>Edit User</h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '14px 20px 18px' }}>
              <div style={{ marginBottom: 12, padding: 10, background: '#F8F8F8', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{editUser.full_name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{editUser.email}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Role</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['super_admin', 'site_admin', 'it_staff'].map(role => (
                    <button key={role} onClick={() => setEditRole(role)} style={{
                      flex: 1, padding: '7px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${editRole === role ? ROLE_COLORS[role] : '#E0E0E0'}`,
                      background: editRole === role ? `${ROLE_COLORS[role]}10` : '#fff',
                      color: editRole === role ? ROLE_COLORS[role] : '#999',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}>{role.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Assigned Sites</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                  {sites.map(site => (
                    <button key={site.id} onClick={() => toggleSite(site.id)} style={{
                      padding: '6px 4px', borderRadius: 6, fontSize: 11,
                      border: `1px solid ${editSites.includes(site.id) ? '#D4A800' : '#E0E0E0'}`,
                      background: editSites.includes(site.id) ? 'rgba(212,168,0,0.08)' : '#fff',
                      color: editSites.includes(site.id) ? '#B8960C' : '#666',
                      cursor: 'pointer', textAlign: 'center', fontWeight: editSites.includes(site.id) ? 600 : 400,
                    }}>{site.id}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditUser(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveUser} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Check size={14} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
