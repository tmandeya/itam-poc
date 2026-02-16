'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import { ClipboardList, Search, Filter, Activity, Plus, Edit3, Trash2 } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  created: '#16A34A', updated: '#2563EB', deleted: '#DC2626',
};
const ACTION_ICONS: Record<string, React.ElementType> = {
  created: Plus, updated: Edit3, deleted: Trash2,
};

export default function AuditPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(500);
    if (data) setLogs(data);
    setLoading(false);
  }

  const tables = Array.from(new Set(logs.map((l: any) => l.table_name))).sort();

  const filtered = logs.filter(l => {
    if (tableFilter && l.table_name !== tableFilter) return false;
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.record_id?.toLowerCase().includes(s) || l.table_name?.toLowerCase().includes(s) ||
             JSON.stringify(l.new_data)?.toLowerCase().includes(s);
    }
    return true;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const inputStyle = {
    padding: '9px 12px', background: '#1A1A1A',
    border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A',
    fontSize: 13, fontFamily: 'var(--font-main)',
  } as const;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={15} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                 placeholder="Search records..." style={{ ...inputStyle, width: '100%', paddingLeft: 36 }} />
        </div>
        <select value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(1); }}
                style={{ ...inputStyle, minWidth: 140, color: tableFilter ? '#1A1A1A' : '#999' }}>
          <option value="">All Tables</option>
          {tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                style={{ ...inputStyle, minWidth: 130, color: actionFilter ? '#1A1A1A' : '#999' }}>
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
        </select>
        <span style={{ color: '#999', fontSize: 12 }}>{filtered.length} entries</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Timestamp', 'Action', 'Table', 'Record ID', 'Changes'].map(h => (
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
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No audit entries found</td></tr>
            ) : paged.map(log => {
              const Icon = ACTION_ICONS[log.action] || Activity;
              const color = ACTION_COLORS[log.action] || '#999';
              let changesSummary = '';
              if (log.action === 'updated' && log.old_data && log.new_data) {
                const changes = Object.keys(log.new_data).filter(k =>
                  JSON.stringify(log.old_data[k]) !== JSON.stringify(log.new_data[k]) && k !== 'updated_at'
                );
                changesSummary = changes.map(k => `${k}: ${log.old_data[k]} → ${log.new_data[k]}`).join(', ');
              } else if (log.action === 'created' && log.new_data) {
                changesSummary = log.new_data.asset_tag || log.new_data.transfer_ref || log.new_data.repair_ref || log.new_data.email || 'New record';
              }

              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #E0E0E0' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8F8F8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', color: '#999', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(log.changed_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: `${color}18`, color, border: `1px solid ${color}40`,
                      textTransform: 'capitalize',
                    }}>
                      <Icon size={11} /> {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#B8960C', fontWeight: 600, fontSize: 12 }}>{log.table_name}</td>
                  <td style={{ padding: '11px 14px', color: '#1A1A1A' }}>#{log.record_id}</td>
                  <td style={{ padding: '11px 14px', color: '#1A1A1A', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {changesSummary || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', fontSize: 12, color: '#999' }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 10px', background: '#1A1A1A', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 12 }}>Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 10px', background: '#1A1A1A', border: '1px solid #E0E0E0', borderRadius: 6, color: '#1A1A1A', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 12 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
