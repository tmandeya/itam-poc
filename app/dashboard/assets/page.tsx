'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import type { Asset, AssetType, Manufacturer, AssetCategory } from '@/types/database';
import {
  Search, Plus, Upload, Download, Monitor, MapPin, Eye, QrCode,
  X, Check, Tag, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: '#16A34A', in_store: '#2563EB', in_repair: '#EA580C',
  in_transit: '#7C3AED', disposed: '#DC2626',
};
const CONDITION_COLORS: Record<string, string> = {
  new: '#16A34A', good: '#2563EB', fair: '#EA580C', poor: '#DC2626',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}12`, color, border: `1px solid ${color}30`,
      letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {text.replace('_', '-')}
    </span>
  );
}

export default function AssetsPage() {
  const { selectedSite, profile } = useApp();
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    serial_number: '', hostname: '', ip_address: '', model: '', specifications: '',
    manufacturer_id: '', asset_type_id: '', category_id: '', site_id: '',
    custodian_name: '', purchase_date: '', purchase_value: '', warranty_expiration: '', notes: '',
  });
  const PER_PAGE = 15;

  useEffect(() => {
    loadAssets(); loadRefData();
    const channel = supabase.channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { loadAssets(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSite]);

  async function loadAssets() {
    setLoading(true);
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (selectedSite) query = query.eq('site_id', selectedSite);
    const { data } = await query;
    if (data) setAssets(data);
    setLoading(false);
  }

  async function loadRefData() {
    const [{ data: t }, { data: m }, { data: c }] = await Promise.all([
      supabase.from('asset_types').select('*').eq('is_active', true),
      supabase.from('manufacturers').select('*').eq('is_active', true),
      supabase.from('asset_categories').select('*').eq('is_active', true),
    ]);
    if (t) setTypes(t); if (m) setManufacturers(m); if (c) setCategories(c);
  }

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (typeFilter && a.asset_type_id !== parseInt(typeFilter)) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return a.asset_tag?.toLowerCase().includes(s) || a.serial_number?.toLowerCase().includes(s) ||
          a.hostname?.toLowerCase().includes(s) || a.model?.toLowerCase().includes(s) ||
          a.custodian_name?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [assets, search, typeFilter, statusFilter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('assets').insert({
      serial_number: form.serial_number || null, hostname: form.hostname || null,
      ip_address: form.ip_address || null, model: form.model || null,
      specifications: form.specifications || null,
      manufacturer_id: form.manufacturer_id ? parseInt(form.manufacturer_id) : null,
      asset_type_id: form.asset_type_id ? parseInt(form.asset_type_id) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      site_id: form.site_id, custodian_name: form.custodian_name || null,
      purchase_date: form.purchase_date || null,
      purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : 0,
      warranty_expiration: form.warranty_expiration || null, notes: form.notes || null,
    });
    if (error) { alert('Error: ' + error.message); return; }
    setShowAddModal(false);
    setForm({ serial_number: '', hostname: '', ip_address: '', model: '', specifications: '',
      manufacturer_id: '', asset_type_id: '', category_id: '', site_id: '',
      custodian_name: '', purchase_date: '', purchase_value: '', warranty_expiration: '', notes: '' });
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#F0F0F0',
    border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A', fontSize: 13,
  } as const;

  const thStyle = {
    padding: '12px 14px', textAlign: 'left' as const, background: '#F8F8F8',
    color: '#666', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase' as const,
    letterSpacing: 0.6, borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap' as const,
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={15} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                 placeholder="Search assets..." style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                style={{ ...inputStyle, width: 'auto', minWidth: 140, color: typeFilter ? '#1A1A1A' : '#999' }}>
          <option value="">All Types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ ...inputStyle, width: 'auto', minWidth: 130, color: statusFilter ? '#1A1A1A' : '#999' }}>
          <option value="">All Status</option>
          {['active','in_store','in_repair','in_transit','disposed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <span style={{ color: '#999', fontSize: 12 }}>{filtered.length} assets</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAddModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}><Plus size={15} /> Add Asset</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Asset Tag','Type','Model','Serial Number','Site','Custodian','Status','Condition','Value'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading assets...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No assets found</td></tr>
            ) : paged.map(asset => (
              <tr key={asset.id} onClick={() => setSelectedAsset(asset)} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8F8F8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#B8960C', fontWeight: 600 }}>{asset.asset_tag}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Monitor size={12} color="#999" />{types.find(t => t.id === asset.asset_type_id)?.name || '—'}</span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.model || '—'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.serial_number || '—'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} color="#B8960C" />{asset.site_id}</span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.custodian_name || '—'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0' }}><Badge text={asset.status} color={STATUS_COLORS[asset.status] || '#999'} /></td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0' }}><Badge text={asset.condition} color={CONDITION_COLORS[asset.condition] || '#999'} /></td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#16A34A', fontWeight: 600 }}>${Number(asset.purchase_value).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', fontSize: 12, color: '#999' }}>
          <span>Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 12 }}>Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 12 }}>Next</button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 20 }}>Register New Asset</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddAsset} style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 16, padding: '8px 12px', background: 'rgba(212,168,0,0.08)', borderRadius: 8, border: '1px solid rgba(212,168,0,0.2)' }}>
                <Tag size={13} color="#B8960C" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Asset Tag will be auto-generated (e.g., TAG-2025-0001)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Site *</label>
                  <select required value={form.site_id} onChange={(e) => setForm(f => ({...f, site_id: e.target.value}))} style={{ ...inputStyle, color: form.site_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select site...</option>
                    {['MM','ATL','AVN','CHD','HRE','PSE','PLD','WLD'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Serial Number</label>
                  <input value={form.serial_number} onChange={(e) => setForm(f => ({...f, serial_number: e.target.value}))} placeholder="SN-XXXXXXXX" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Hostname</label>
                  <input value={form.hostname} onChange={(e) => setForm(f => ({...f, hostname: e.target.value}))} placeholder="SITE-TYPE-001" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>IP Address</label>
                  <input value={form.ip_address} onChange={(e) => setForm(f => ({...f, ip_address: e.target.value}))} placeholder="10.0.0.1" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Manufacturer</label>
                  <select value={form.manufacturer_id} onChange={(e) => setForm(f => ({...f, manufacturer_id: e.target.value}))} style={{ ...inputStyle, color: form.manufacturer_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Model</label>
                  <input value={form.model} onChange={(e) => setForm(f => ({...f, model: e.target.value}))} placeholder="Model name" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Asset Type</label>
                  <select value={form.asset_type_id} onChange={(e) => setForm(f => ({...f, asset_type_id: e.target.value}))} style={{ ...inputStyle, color: form.asset_type_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Category</label>
                  <select value={form.category_id} onChange={(e) => setForm(f => ({...f, category_id: e.target.value}))} style={{ ...inputStyle, color: form.category_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Custodian</label>
                  <input value={form.custodian_name} onChange={(e) => setForm(f => ({...f, custodian_name: e.target.value}))} placeholder="Full name" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({...f, purchase_date: e.target.value}))} style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Purchase Value ($)</label>
                  <input type="number" step="0.01" value={form.purchase_value} onChange={(e) => setForm(f => ({...f, purchase_value: e.target.value}))} placeholder="0.00" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Warranty Expiration</label>
                  <input type="date" value={form.warranty_expiration} onChange={(e) => setForm(f => ({...f, warranty_expiration: e.target.value}))} style={inputStyle} /></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Specifications</label>
                <input value={form.specifications} onChange={(e) => setForm(f => ({...f, specifications: e.target.value}))} placeholder="e.g. 16GB RAM, 512GB SSD, Intel i7" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#1A1A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Check size={15} /> Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
