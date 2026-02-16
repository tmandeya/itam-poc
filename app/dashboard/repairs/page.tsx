'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { Wrench, Plus, X, Check, AlertTriangle, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FB923C', in_progress: '#60A5FA', completed: '#4ADE80',
  overdue: '#F87171', cancelled: '#666',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {text.replace(/_/g, ' ')}
    </span>
  );
}

export default function RepairsPage() {
  const { profile, selectedSite } = useApp();
  const supabase = createClient();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [form, setForm] = useState({
    asset_id: '', vendor_name: '', vendor_contact: '', issue_description: '',
    repair_cost: '', expected_return_date: '',
  });

  useEffect(() => { loadRepairs(); loadAssets(); }, [selectedSite]);

  async function loadRepairs() {
    setLoading(true);
    const { data } = await supabase.from('repairs').select('*, assets(asset_tag, model, site_id)').order('created_at', { ascending: false });
    if (data) {
      let filtered = data;
      if (selectedSite) filtered = data.filter((r: any) => r.assets?.site_id === selectedSite);
      setRepairs(filtered);
    }
    setLoading(false);
  }

  async function loadAssets() {
    let query = supabase.from('assets').select('id, asset_tag, model, site_id');
    if (selectedSite) query = query.eq('site_id', selectedSite);
    const { data } = await query;
    if (data) setAssets(data);
  }

  async function handleCreateRepair(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('repairs').insert({
      asset_id: parseInt(form.asset_id),
      vendor_name: form.vendor_name,
      vendor_contact: form.vendor_contact || null,
      issue_description: form.issue_description,
      repair_cost: form.repair_cost ? parseFloat(form.repair_cost) : 0,
      expected_return_date: form.expected_return_date || null,
      logged_by: profile?.id,
    });

    if (error) { alert('Error: ' + error.message); return; }

    await supabase.from('assets').update({ status: 'in_repair' }).eq('id', parseInt(form.asset_id));

    setShowModal(false);
    setForm({ asset_id: '', vendor_name: '', vendor_contact: '', issue_description: '', repair_cost: '', expected_return_date: '' });
    loadRepairs();
    loadAssets();
  }

  async function handleComplete(repair: any) {
    await supabase.from('repairs').update({
      status: 'completed', actual_return_date: new Date().toISOString().split('T')[0],
    }).eq('id', repair.id);
    await supabase.from('assets').update({ status: 'active' }).eq('id', repair.asset_id);
    loadRepairs();
  }

  const activeRepairs = repairs.filter(r => ['pending', 'in_progress', 'overdue'].includes(r.status));
  const completedRepairs = repairs.filter(r => r.status === 'completed');
  const displayRepairs = tab === 'active' ? activeRepairs : completedRepairs;

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#1E1E1E',
    border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff',
    fontSize: 13, fontFamily: "'Neuton', serif",
  } as const;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['active', 'completed'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
              background: tab === t ? 'rgba(255,215,0,0.15)' : 'transparent',
              color: tab === t ? '#FFD700' : '#999', cursor: 'pointer', textTransform: 'capitalize',
            }}>{t} ({t === 'active' ? activeRepairs.length : completedRepairs.length})</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 8, border: 'none', background: '#FFD700', color: '#000',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={15} /> Log Repair
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #2A2A2A', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Ref', 'Asset', 'Vendor', 'Issue', 'Cost', 'Sent', 'Expected', 'Status', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: 'left', background: '#111',
                  color: '#999', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase',
                  letterSpacing: 0.6, borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</td></tr>
            ) : displayRepairs.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#666' }}>No {tab} repairs</td></tr>
            ) : displayRepairs.map(r => {
              const isOverdue = r.expected_return_date && new Date(r.expected_return_date) < new Date() && r.status !== 'completed';
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #2A2A2A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', color: '#FFD700', fontWeight: 600 }}>{r.repair_ref}</td>
                  <td style={{ padding: '11px 14px', color: '#F0F0F0' }}>{r.assets?.asset_tag || '—'}<br/><span style={{ fontSize: 10, color: '#666' }}>{r.assets?.model}</span></td>
                  <td style={{ padding: '11px 14px', color: '#F0F0F0' }}>{r.vendor_name}</td>
                  <td style={{ padding: '11px 14px', color: '#F0F0F0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.issue_description}</td>
                  <td style={{ padding: '11px 14px', color: '#4ADE80', fontWeight: 600 }}>${Number(r.repair_cost).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px', color: '#F0F0F0' }}>{r.sent_date}</td>
                  <td style={{ padding: '11px 14px', color: isOverdue ? '#F87171' : '#F0F0F0' }}>
                    {r.expected_return_date || '—'}
                    {isOverdue && <AlertTriangle size={12} color="#F87171" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge text={isOverdue ? 'overdue' : r.status} color={isOverdue ? '#F87171' : STATUS_COLORS[r.status]} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {r.status !== 'completed' && (
                      <button onClick={() => handleComplete(r)} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#4ADE8020', color: '#4ADE80', fontSize: 11,
                        cursor: 'pointer', fontWeight: 600,
                      }}>Complete</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Repair Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, width: '100%', maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #2A2A2A' }}>
              <h3 style={{ margin: 0, color: '#FFD700', fontSize: 20 }}>Log Repair</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateRepair} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Asset *</label>
                <select required value={form.asset_id} onChange={e => setForm(f => ({...f, asset_id: e.target.value}))} style={{ ...inputStyle, color: form.asset_id ? '#fff' : '#666' }}>
                  <option value="">Select asset...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.model}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Vendor Name *</label>
                  <input required value={form.vendor_name} onChange={e => setForm(f => ({...f, vendor_name: e.target.value}))} placeholder="Vendor name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Vendor Contact</label>
                  <input value={form.vendor_contact} onChange={e => setForm(f => ({...f, vendor_contact: e.target.value}))} placeholder="Email or phone" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Issue Description *</label>
                <textarea required value={form.issue_description} onChange={e => setForm(f => ({...f, issue_description: e.target.value}))} placeholder="Describe the issue..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Repair Cost ($)</label>
                  <input type="number" step="0.01" value={form.repair_cost} onChange={e => setForm(f => ({...f, repair_cost: e.target.value}))} placeholder="0.00" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Expected Return</label>
                  <input type="date" value={form.expected_return_date} onChange={e => setForm(f => ({...f, expected_return_date: e.target.value}))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2A2A2A', background: 'transparent', color: '#F0F0F0', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FFD700', color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Wrench size={15} /> Log Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
