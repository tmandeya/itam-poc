'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import type { Asset, AssetType, Manufacturer, AssetCategory } from '@/types/database';
import {
  Search, Plus, Upload, Download, Monitor, MapPin, Eye,
  X, Check, Tag, ChevronLeft, ChevronRight, FileSpreadsheet,
  AlertCircle, CheckCircle2, Loader2,
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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header â€” handle quoted values
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(v => !v)) continue; // skip empty rows
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    serial_number: '', hostname: '', ip_address: '', model: '', specifications: '',
    manufacturer_id: '', asset_type_id: '', category_id: '', site_id: '',
    custodian_name: '', purchase_date: '', purchase_value: '', warranty_expiration: '', notes: '',
  });

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

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

  // â”€â”€ CSV Upload Handlers â”€â”€
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setPreviewData(rows);
    };
    reader.readAsText(file);
  }

  async function handleBulkUpload() {
    if (previewData.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch('/api/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: previewData }),
      });
      const data = await res.json();
      setUploadResult(data);
      if (data.inserted > 0) loadAssets();
    } catch (err: any) {
      setUploadResult({ error: err.message });
    }
    setUploading(false);
  }

  function downloadTemplate() {
    window.open('/api/assets/bulk', '_blank');
  }

  function resetUpload() {
    setUploadFile(null);
    setPreviewData([]);
    setUploadResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: '#F0F0F0',
    border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', fontSize: 13,
  } as const;

  const thStyle = {
    padding: '12px 14px', textAlign: 'left' as const, background: '#F8F8F8',
    color: '#666', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase' as const,
    letterSpacing: 0.6, borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap' as const,
  };

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
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
        <button onClick={() => setShowUploadModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff',
          color: '#666', fontSize: 13, cursor: 'pointer',
        }}><Upload size={14} /> Bulk Upload</button>
        <button onClick={() => setShowAddModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
          borderRadius: 8, border: 'none', background: '#D4A800', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}><Plus size={15} /> Add Asset</button>
      </div>

      {/* Asset Table */}
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
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                {assets.length === 0 ? 'No assets yet. Add one manually or use Bulk Upload to import a CSV.' : 'No assets match your filters'}
              </td></tr>
            ) : paged.map(asset => (
              <tr key={asset.id} onClick={() => setSelectedAsset(asset)} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8F8F8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#B8960C', fontWeight: 600 }}>{asset.asset_tag}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Monitor size={12} color="#999" />{types.find(t => t.id === asset.asset_type_id)?.name || 'â€”'}</span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.model || 'â€”'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.serial_number || 'â€”'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} color="#B8960C" />{asset.site_id}</span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A' }}>{asset.custodian_name || 'â€”'}</td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0' }}><Badge text={asset.status} color={STATUS_COLORS[asset.status] || '#999'} /></td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0' }}><Badge text={asset.condition} color={CONDITION_COLORS[asset.condition] || '#999'} /></td>
                <td style={{ padding: '11px 14px', borderBottom: '1px solid #E0E0E0', color: '#16A34A', fontWeight: 600 }}>${Number(asset.purchase_value).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', fontSize: 12, color: '#999' }}>
          <span>Showing {((page - 1) * PER_PAGE) + 1}â€“{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 12 }}>Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 12 }}>Next</button>
          </div>
        </div>
      )}

      {/* â”€â”€ BULK UPLOAD MODAL â”€â”€ */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => { setShowUploadModal(false); resetUpload(); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E0E0E0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 18 }}>Bulk Asset Upload</h3>
              <button onClick={() => { setShowUploadModal(false); resetUpload(); }} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Step 1: Template download */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 14, background: '#F8F8F8', borderRadius: 8, alignItems: 'center' }}>
                <FileSpreadsheet size={20} color="#B8960C" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>1. Download CSV template</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Pre-formatted with all required columns and example rows</div>
                </div>
                <button onClick={downloadTemplate} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #E0E0E0',
                  background: '#fff', color: '#1A1A1A', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}><Download size={13} /> Template</button>
              </div>

              {/* Column reference */}
              <div style={{ marginBottom: 16, padding: 14, background: '#FFFFF0', border: '1px solid #F5E6A3', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#B8960C', marginBottom: 6 }}>CSV Column Reference</div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                  <strong>Required:</strong> site_id (MM, ATL, AVN, CHD, HRE, PSE, PLD, WLD)<br/>
                  <strong>Recommended:</strong> asset_type, manufacturer, model, serial_number, custodian_name, purchase_value<br/>
                  <strong>Optional:</strong> hostname, ip_address, category, purchase_date, warranty_expiration, status, condition, specifications, notes<br/>
                 <span style={{ color: '#999' }}>Supported types: Laptop, Desktop, Server, Printer, Phone, Monitor, Network Switch, UPS, Tablet, Other</span>
                </div>
              </div>

              {/* Step 2: File upload */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>2. Upload your CSV file</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileSelect}
                       style={{ display: 'none' }} />
                {!uploadFile ? (
                  <button onClick={() => fileRef.current?.click()} style={{
                    width: '100%', padding: '28px 20px', borderRadius: 10,
                    border: '2px dashed #E0E0E0', background: '#FAFAFA',
                    color: '#999', fontSize: 13, cursor: 'pointer', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}>
                    <Upload size={24} color="#CCC" />
                    Click to select CSV file
                    <span style={{ fontSize: 11 }}>or drag and drop</span>
                  </button>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#16A34A" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{uploadFile.name}</div>
                      <div style={{ fontSize: 11, color: '#16A34A' }}>{previewData.length} rows detected</div>
                    </div>
                    <button onClick={resetUpload} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #E0E0E0', background: '#fff', color: '#666', fontSize: 11, cursor: 'pointer' }}>Change</button>
                  </div>
                )}
              </div>

              {/* Preview table */}
              {previewData.length > 0 && !uploadResult && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>3. Preview (first 5 rows)</div>
                  <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          {Object.keys(previewData[0]).slice(0, 8).map(h => (
                            <th key={h} style={{ padding: '8px 10px', background: '#F8F8F8', color: '#666', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                          {Object.keys(previewData[0]).length > 8 && <th style={{ padding: '8px 10px', background: '#F8F8F8', color: '#999', fontSize: 10, borderBottom: '1px solid #E0E0E0' }}>+{Object.keys(previewData[0]).length - 8} more</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).slice(0, 8).map((v, j) => (
                              <td key={j} style={{ padding: '6px 10px', borderBottom: '1px solid #E0E0E0', color: '#1A1A1A', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || 'â€”'}</td>
                            ))}
                            {Object.keys(row).length > 8 && <td style={{ padding: '6px 10px', borderBottom: '1px solid #E0E0E0', color: '#999' }}>...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload result */}
              {uploadResult && (
                <div style={{ marginBottom: 16 }}>
                  {uploadResult.error ? (
                    <div style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        <AlertCircle size={16} /> Upload Failed
                      </div>
                      <div style={{ fontSize: 12, color: '#DC2626' }}>{uploadResult.error}</div>
                    </div>
                  ) : (
                    <div style={{ padding: 14, borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        <CheckCircle2 size={16} /> Upload Complete
                      </div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                        <span><strong>{uploadResult.inserted}</strong> imported</span>
                        <span style={{ color: '#999' }}>{uploadResult.skipped} skipped</span>
                        <span style={{ color: '#999' }}>{uploadResult.total_rows} total rows</span>
                      </div>
                      {uploadResult.row_errors?.length > 0 && (
                        <div style={{ marginTop: 10, padding: 10, background: '#FFFBEB', borderRadius: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 600, color: '#EA580C', marginBottom: 4 }}>Row Errors:</div>
                          {uploadResult.row_errors.map((e: any, i: number) => (
                            <div key={i} style={{ color: '#666' }}>Row {e.row}: {e.message}</div>
                          ))}
                        </div>
                      )}
                      {uploadResult.insert_errors?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#DC2626' }}>
                          {uploadResult.insert_errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowUploadModal(false); resetUpload(); }} style={{
                  padding: '8px 16px', borderRadius: 6, border: '1px solid #E0E0E0',
                  background: '#fff', color: '#1A1A1A', fontSize: 13, cursor: 'pointer',
                }}>{uploadResult?.inserted ? 'Close' : 'Cancel'}</button>
                {previewData.length > 0 && !uploadResult?.inserted && (
                  <button onClick={handleBulkUpload} disabled={uploading} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                    borderRadius: 6, border: 'none',
                    background: uploading ? '#B8960C' : '#D4A800',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}>
                    {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                    {uploading ? `Uploading ${previewData.length} assets...` : `Upload ${previewData.length} Assets`}
                  </button>
                )}
                {uploadResult?.inserted > 0 && (
                  <button onClick={resetUpload} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                    borderRadius: 6, border: 'none', background: '#D4A800',
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}><Upload size={14} /> Upload More</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ ADD ASSET MODAL â”€â”€ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
             onClick={() => setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, color: '#B8960C', fontSize: 18 }}>Register New Asset</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddAsset} style={{ padding: '14px 20px 18px' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 14, padding: '8px 12px', background: 'rgba(212,168,0,0.08)', borderRadius: 8, border: '1px solid rgba(212,168,0,0.2)' }}>
                <Tag size={13} color="#B8960C" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Asset Tag will be auto-generated (e.g., TAG-2026-0001)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Site *</label>
                  <select required value={form.site_id} onChange={(e) => setForm(f => ({...f, site_id: e.target.value}))} style={{ ...inputStyle, color: form.site_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select site...</option>
                    {['MM','ATL','AVN','CHD','HRE','PSE','PLD','WLD'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Serial Number</label>
                  <input value={form.serial_number} onChange={(e) => setForm(f => ({...f, serial_number: e.target.value}))} placeholder="SN-XXXXXXXX" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Hostname</label>
                  <input value={form.hostname} onChange={(e) => setForm(f => ({...f, hostname: e.target.value}))} placeholder="SITE-TYPE-001" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>IP Address</label>
                  <input value={form.ip_address} onChange={(e) => setForm(f => ({...f, ip_address: e.target.value}))} placeholder="10.0.0.1" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Manufacturer</label>
                  <select value={form.manufacturer_id} onChange={(e) => setForm(f => ({...f, manufacturer_id: e.target.value}))} style={{ ...inputStyle, color: form.manufacturer_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Model</label>
                  <input value={form.model} onChange={(e) => setForm(f => ({...f, model: e.target.value}))} placeholder="Model name" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Asset Type</label>
                  <select value={form.asset_type_id} onChange={(e) => setForm(f => ({...f, asset_type_id: e.target.value}))} style={{ ...inputStyle, color: form.asset_type_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Category</label>
                  <select value={form.category_id} onChange={(e) => setForm(f => ({...f, category_id: e.target.value}))} style={{ ...inputStyle, color: form.category_id ? '#1A1A1A' : '#999' }}>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Custodian</label>
                  <input value={form.custodian_name} onChange={(e) => setForm(f => ({...f, custodian_name: e.target.value}))} placeholder="Full name" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({...f, purchase_date: e.target.value}))} style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Purchase Value ($)</label>
                  <input type="number" step="0.01" value={form.purchase_value} onChange={(e) => setForm(f => ({...f, purchase_value: e.target.value}))} placeholder="0.00" style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Warranty Expiration</label>
                  <input type="date" value={form.warranty_expiration} onChange={(e) => setForm(f => ({...f, warranty_expiration: e.target.value}))} style={inputStyle} /></div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>Specifications</label>
                <input value={form.specifications} onChange={(e) => setForm(f => ({...f, specifications: e.target.value}))} placeholder="e.g. 16GB RAM, 512GB SSD, Intel i7" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', color: '#1A1A1A', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#D4A800', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Check size={14} /> Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
