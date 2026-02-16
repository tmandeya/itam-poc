'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { Settings, Building2, Users, Package, MapPin, Plus, X, Check, Edit3 } from 'lucide-react';

export default function SettingsPage() {
  const { profile, sites: contextSites } = useApp();
  const supabase = createClient();
  const [sites, setSites] = useState<any[]>([]);
  const [siteStats, setSiteStats] = useState<Record<string, { assets: number; users: number }>>({});
  const [loading, setLoading] = useState(true);
  const [editSite, setEditSite] = useState<any>(null);
  const [form, setForm] = useState({
    id: '', name: '', city: '', country: '', address: '', timezone: '',
    contact_name: '', contact_email: '', contact_phone: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: sitesData }, { data: assetsData }, { data: assignData }] = await Promise.all([
      supabase.from('sites').select('*').order('id'),
      supabase.from('assets').select('site_id'),
      supabase.from('user_site_assignments').select('site_id'),
    ]);

    if (sitesData) setSites(sitesData);

    const stats: Record<string, { assets: number; users: number }> = {};
    (sitesData || []).forEach(s => { stats[s.id] = { assets: 0, users: 0 }; });
    (assetsData || []).forEach(a => { if (stats[a.site_id]) stats[a.site_id].assets++; });
    (assignData || []).forEach(a => { if (stats[a.site_id]) stats[a.site_id].users++; });
    setSiteStats(stats);
    setLoading(false);
  }

  function openEdit(site: any) {
    setEditSite(site);
    setForm({
      id: site.id, name: site.name, city: site.city, country: site.country,
      address: site.address || '', timezone: site.timezone || '',
      contact_name: site.contact_name || '', contact_email: site.contact_email || '',
      contact_phone: site.contact_phone || '',
    });
  }

  async function handleSave() {
    const { error } = await supabase.from('sites').update({
      name: form.name, city: form.city, country: form.country,
      address: form.address || null, timezone: form.timezone || null,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    }).eq('id', form.id);

    if (error) { alert('Error: ' + error.message); return; }
    setEditSite(null);
    loadData();
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#1E1E1E',
    border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff',
    fontSize: 13, fontFamily: "'Neuton', serif",
  } as const;

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="animate-fade-in">
      <p style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>
        Manage sites and system configuration. {!isSuperAdmin && '(Read-only — Super Admin access required for changes)'}
      </p>

      {loading ? (
        <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {sites.map(site => {
            const stats = siteStats[site.id] || { assets: 0, users: 0 };
            return (
              <div key={site.id} style={{
                background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12,
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#FFD700')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A2A')}>
                {/* Header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid #2A2A2A',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: 'rgba(255,215,0,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#FFD700',
                    }}>{site.id}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>{site.name}</div>
                      <div style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} /> {site.city}, {site.country}
                      </div>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => openEdit(site)} style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none',
                      background: 'rgba(255,215,0,0.15)', color: '#FFD700',
                      fontSize: 11, cursor: 'pointer', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Edit3 size={11} /> Edit
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div style={{ padding: '16px 20px', display: 'flex', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} color="#FFD700" />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>{stats.assets}</div>
                      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Assets</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={14} color="#60A5FA" />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>{stats.users}</div>
                      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Users</div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                {site.contact_email && (
                  <div style={{ padding: '0 20px 16px', fontSize: 11, color: '#666' }}>
                    Contact: {site.contact_email}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Site Modal */}
      {editSite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setEditSite(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, width: '100%', maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #2A2A2A' }}>
              <h3 style={{ margin: 0, color: '#FFD700', fontSize: 20 }}>Edit Site — {form.id}</h3>
              <button onClick={() => setEditSite(null)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Site Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Country (2-letter)</label>
                  <input value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} maxLength={2} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Timezone</label>
                  <input value={form.timezone} onChange={e => setForm(f => ({...f, timezone: e.target.value}))} placeholder="e.g. Africa/Harare" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Address</label>
                <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Contact Name</label>
                  <input value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Contact Email</label>
                  <input value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Contact Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm(f => ({...f, contact_phone: e.target.value}))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setEditSite(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2A2A2A', background: 'transparent', color: '#F0F0F0', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FFD700', color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
