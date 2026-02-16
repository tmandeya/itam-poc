'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import {
  ArrowRightLeft, Plus, X, Check, Clock, Truck, CheckCircle2,
  XCircle, MapPin, ChevronRight,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending_approval: '#EA580C', approved: '#2563EB', in_transit: '#7C3AED',
  completed: '#16A34A', rejected: '#DC2626', cancelled: '#999',
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  pending_approval: Clock, approved: Check, in_transit: Truck,
  completed: CheckCircle2, rejected: XCircle, cancelled: XCircle,
};

export default function TransfersPage() {
  const { profile, sites, selectedSite } = useApp();
  const supabase = createClient();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asset_id: '', to_site_id: '', reason: '' });

  useEffect(() => { loadTransfers(); loadAssets(); }, [selectedSite]);

  async function loadTransfers() {
    setLoading(true);
    let query = supabase.from('transfers').select('*').order('created_at', { ascending: false });
    if (selectedSite) query = query.or(`from_site_id.eq.${selectedSite},to_site_id.eq.${selectedSite}`);
    const { data } = await query;
    if (data) setTransfers(data);
    setLoading(false);
  }

  async function loadAssets() {
    let query = supabase.from('assets').select('id, asset_tag, model, site_id').eq('status', 'active');
    if (selectedSite) query = query.eq('site_id', selectedSite);
    const { data } = await query;
    if (data) setAssets(data);
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    const asset = assets.find(a => a.id === parseInt(form.asset_id));
    if (!asset) return;
    const { error } = await supabase.from('transfers').insert({
      asset_id: parseInt(form.asset_id), from_site_id: asset.site_id,
      to_site_id: form.to_site_id, reason: form.reason || null, initiated_by: profile?.id,
    });
    if (error) { alert('Error: ' + error.message); return; }
    await supabase.from('assets').update({ status: 'in_transit' }).eq('id', parseInt(form.asset_id));
    setShowModal(false); setForm({ asset_id: '', to_site_id: '', reason: '' });
    loadTransfers(); loadAssets();
  }

  async function handleUpdateStatus(id: number, newStatus: string, assetId: number, toSiteId: string) {
    const updates: Record<string, any> = { status: newStatus };
    if (newStatus === 'approved') { updates.approved_by = profile?.id; updates.approved_at = new Date().toISOString(); }
    if (newStatus === 'in_transit') updates.shipped_at = new Date().toISOString();
    if (newStatus === 'completed') {
      updates.received_by = profile?.id; updates.received_at = new Date().toISOString();
      await supabase.from('assets').update({ status: 'active', site_id: toSiteId }).eq('id', assetId);
    }
    if (newStatus === 'rejected') await supabase.from('assets').update({ status: 'active' }).eq('id', assetId);
    await supabase.from('transfers').update(updates).eq('id', id);
    loadTransfers();
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: '#F0F0F0', border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A', fontSize: 13 } as const;
  const groups = ['pending_approval', 'approved', 'in_transit', 'completed', 'rejected'];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#999', fontSize: 13 }}>{transfers.length} transfers total</p>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}><Plus size={15} /> Initiate Transfer</button>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {groups.map(status => {
          const items = transfers.filter(t => t.status === status);
          const Icon = STATUS_ICONS[status] || Clock;
          return (
            <div key={status} style={{ flex: 1, minWidth: 260, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={15} color={STATUS_COLORS[status]} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
                </div>
                <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[status]}15`, color: STATUS_COLORS[status] }}>{items.length}</span>
              </div>
              <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                {loading ? <p style={{ color: '#999', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading...</p>
                : items.length === 0 ? <p style={{ color: '#999', fontSize: 11, textAlign: 'center', padding: 20 }}>No transfers</p>
                : items.map(t => (
                  <div key={t.id} style={{ background: '#F8F8F8', border: '1px solid #E0E0E0', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#B8960C', fontSize: 12, fontWeight: 600 }}>{t.transfer_ref}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, fontSize: 12, color: '#1A1A1A' }}>
                      <MapPin size={11} color="#EA580C" /> {t.from_site_id}
                      <ChevronRight size={11} color="#999" />
                      <MapPin size={11} color="#16A34A" /> {t.to_site_id}
                    </div>
                    {t.reason && <p style={{ fontSize: 11, color: '#999', margin: '4px 0' }}>{t.reason}</p>}
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>{new Date(t.created_at).toLocaleDateString()}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {status === 'pending_approval' && <>
                        <button onClick={() => handleUpdateStatus(t.id, 'approved', t.asset_id, t.to_site_id)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', background: '#16A34A15', color: '#16A34A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleUpdateStatus(t.id, 'rejected', t.asset_id, t.to_site_id)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', background: '#DC262615', color: '#DC2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                      </>}
                      {status === 'approved' && <button onClick={() => handleUpdateStatus(t.id, 'in_transit', t.asset_id, t.to_site_id)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', background: '#7C3AED15', color: '#7C3AED', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Mark Shipped</button>}
                      {status === 'in_transit' && <button onClick={() => handleUpdateStatus(t.id, 'completed', t.asset_id, t.to_site_id)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', background: '#16A34A15', color: '#16A34A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Confirm Receipt</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 20 }}>Initiate Transfer</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTransfer} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Asset *</label>
                <select required value={form.asset_id} onChange={e => setForm(f => ({...f, asset_id: e.target.value}))} style={{ ...inputStyle, color: form.asset_id ? '#1A1A1A' : '#999' }}>
                  <option value="">Select asset...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.model} ({a.site_id})</option>)}
                </select></div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Destination Site *</label>
                <select required value={form.to_site_id} onChange={e => setForm(f => ({...f, to_site_id: e.target.value}))} style={{ ...inputStyle, color: form.to_site_id ? '#1A1A1A' : '#999' }}>
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
                </select></div>
              <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="Reason for transfer..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <ArrowRightLeft size={15} /> Create Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
