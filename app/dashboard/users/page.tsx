'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { UserCog, Plus, X, Check, Shield, Building2 } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#FFD700', site_admin: '#2563EB', it_staff: '#16A34A',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}40`,
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

    // Remove old assignments
    await supabase.from('user_site_assignments').delete().eq('user_id', editUser.id);

    // Add new assignments
    if (editSites.length > 0) {
      await supabase.from('user_site_assignments').insert(
        editSites.map(siteId => ({ user_id: editUser.id, site_id: siteId, assigned_by: profile?.id }))
      );
    }

    setEditUser(null);
    loadUsers();
  }

  function toggleSite(siteId: string) {
    setEditSites(prev => prev.includes(siteId) ? prev.filter(s => s !== siteId) : [...prev, siteId]);
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#999', fontSize: 13 }}>{users.length} users registered</p>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Name', 'Email', 'Employee ID', 'Role', 'Assigned Sites', 'Status', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: 'left', background: '#111',
                  color: '#999', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase',
                  letterSpacing: 0.6, borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
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
                        background: `${ROLE_COLORS[user.role]}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: ROLE_COLORS[user.role],
                      }}>
                        {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      {user.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#999' }}>{user.email}</td>
                  <td style={{ padding: '11px 14px', color: '#1A1A1A' }}>{user.employee_id || '—'}</td>
                  <td style={{ padding: '11px 14px' }}><Badge text={user.role} color={ROLE_COLORS[user.role]} /></td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {userSites.length === 0 ? (
                        <span style={{ color: '#999', fontSize: 11 }}>None assigned</span>
                      ) : userSites.map(s => (
                        <span key={s} style={{
                          padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: 'rgba(255,215,0,0.1)', color: '#B8960C', border: '1px solid rgba(255,215,0,0.2)',
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
                        background: 'rgba(255,215,0,0.15)', color: '#B8960C', fontSize: 11,
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

      {/* Edit User Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setEditUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1Afff', border: '1px solid #E0E0E0', borderRadius: 16, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 20 }}>Edit User</h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16, padding: 12, background: '#F8F8F8', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{editUser.full_name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{editUser.email}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
                  <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Role
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['super_admin', 'site_admin', 'it_staff'].map(role => (
                    <button key={role} onClick={() => setEditRole(role)} style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${editRole === role ? ROLE_COLORS[role] : '#E0E0E0'}`,
                      background: editRole === role ? `${ROLE_COLORS[role]}15` : 'transparent',
                      color: editRole === role ? ROLE_COLORS[role] : '#999',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}>{role.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
                  <Building2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Assigned Sites
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {sites.map(site => (
                    <button key={site.id} onClick={() => toggleSite(site.id)} style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12,
                      border: `1px solid ${editSites.includes(site.id) ? '#FFD700' : '#E0E0E0'}`,
                      background: editSites.includes(site.id) ? 'rgba(255,215,0,0.1)' : 'transparent',
                      color: editSites.includes(site.id) ? '#FFD700' : '#999',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${editSites.includes(site.id) ? '#FFD700' : '#E0E0E0'}`,
                        background: editSites.includes(site.id) ? '#FFD700' : 'transparent',
                      }}>
                        {editSites.includes(site.id) && <Check size={10} color="#000" />}
                      </span>
                      <span><strong>{site.id}</strong> — {site.city}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditUser(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: 'transparent', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveUser} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Check size={15} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
