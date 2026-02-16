'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { Trash2, Plus, X, Check, AlertTriangle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending_approval: '#EA580C', approved: '#2563EB', completed: '#16A34A', rejected: '#DC2626',
};
const REASONS = ['end_of_life', 'damaged_beyond_repair', 'stolen', 'sold', 'donated', 'recycled', 'lost'];

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

export default function DisposalPage() {
  const { profile, selectedSite } = useApp();
  const supabase = createClient();
  const [disposals, setDisposals] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asset_id: '', reason: '', reason_detail: '' });

  useEffect(() => { loadDisposals(); loadAssets(); }, [selectedSite]);

  async function loadDisposals() {
    setLoading(true);
    const { data } = await supabase.from('disposals').select('*, assets(asset_tag, model, site_id, purchase_value)').order('created_at', { ascending: false });
    if (data) {
      let filtered = data;
      if (selectedSite) filtered = data.filter((d: any) => d.assets?.site_id === selectedSite);
      setDisposals(filtered);
    }
    setLoading(false);
  }

  async function loadAssets() {
    let query = supabase.from('assets').select('id, asset_tag, model, site_id').in('status', ['active', 'in_store']);
    if (selectedSite) query = query.eq('site_id', selectedSite);
    const { data } = await query;
    if (data) setAssets(data);
  }

  async function handleCreateDisposal(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('disposals').insert({
      asset_id: parseInt(form.asset_id),
      reason: form.reason,
      reason_detail: form.reason_detail || null,
      requested_by: profile?.id,
    });
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ asset_id: '', reason: '', reason_detail: '' });
    loadDisposals();
  }

  async function handleApprove(id: number, assetId: number) {
    await supabase.from('disposals').update({
      status: 'approved', approved_by: profile?.id, approved_at: new Date().toISOString(),
    }).eq('id', id);
    loadDisposals();
  }

  async function handleComplete(id: number, assetId: number) {
    await supabase.from('disposals').update({ status: 'completed' }).eq('id', id);
    await supabase.from('assets').update({ status: 'disposed' }).eq('id', assetId);
    loadDisposals();
  }

  async function handleReject(id: number) {
    await supabase.from('disposals').update({ status: 'rejected' }).eq('id', id);
    loadDisposals();
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#1A1A1A',
    border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A',
    fontSize: 13, fontFamily: 'var(--font-main)',
  } as const;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#999', fontSize: 13 }}>{disposals.length} disposal requests</p>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={15} /> Request Disposal
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Ref', 'Asset', 'Reason', 'Detail', 'Asset Value', 'Requested', 'Status', 'Actions'].map(h => (
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
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : disposals.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No disposal requests</td></tr>
            ) : disposals.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #E0E0E0' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8F8F8')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 14px', color: '#B8960C', fontWeight: 600 }}>{d.disposal_ref}</td>
                <td style={{ padding: '11px 14px', color: '#1A1A1A' }}>{d.assets?.asset_tag}<br/><span style={{ fontSize: 10, color: '#999' }}>{d.assets?.model}</span></td>
                <td style={{ padding: '11px 14px', color: '#1A1A1A', textTransform: 'capitalize' }}>{d.reason.replace(/_/g, ' ')}</td>
                <td style={{ padding: '11px 14px', color: '#1A1A1A', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason_detail || '—'}</td>
                <td style={{ padding: '11px 14px', color: '#DC2626', fontWeight: 600 }}>${Number(d.assets?.purchase_value || 0).toLocaleString()}</td>
                <td style={{ padding: '11px 14px', color: '#1A1A1A' }}>{new Date(d.requested_at).toLocaleDateString()}</td>
                <td style={{ padding: '11px 14px' }}><Badge text={d.status} color={STATUS_COLORS[d.status]} /></td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {d.status === 'pending_approval' && (
                      <>
                        <button onClick={() => handleApprove(d.id, d.asset_id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#16A34A20', color: '#16A34A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleReject(d.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#DC262620', color: '#DC2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                      </>
                    )}
                    {d.status === 'approved' && (
                      <button onClick={() => handleComplete(d.id, d.asset_id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#16A34A20', color: '#16A34A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Complete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1Afff', border: '1px solid #E0E0E0', borderRadius: 16, width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 20 }}>Request Disposal</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDisposal} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Asset *</label>
                <select required value={form.asset_id} onChange={e => setForm(f => ({...f, asset_id: e.target.value}))} style={{ ...inputStyle, color: form.asset_id ? '#1A1A1A' : '#999' }}>
                  <option value="">Select asset...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.model}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Reason *</label>
                <select required value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} style={{ ...inputStyle, color: form.reason ? '#1A1A1A' : '#999' }}>
                  <option value="">Select reason...</option>
                  {REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Details</label>
                <textarea value={form.reason_detail} onChange={e => setForm(f => ({...f, reason_detail: e.target.value}))} placeholder="Additional details..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: 'transparent', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#1A1A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Trash2 size={15} /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
