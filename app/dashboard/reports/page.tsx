'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '../layout';
import {
  BarChart3, Download, FileSpreadsheet, FileText, Package,
  DollarSign, ArrowRightLeft, Wrench, Trash2, Shield,
} from 'lucide-react';

const REPORTS = [
  { id: 'asset_register', name: 'Full Asset Register', desc: 'Complete list of all assets with current values', icon: Package, color: '#B8960C' },
  { id: 'asset_valuation', name: 'Asset Valuation Report', desc: 'Purchase values vs current depreciated values', icon: DollarSign, color: '#16A34A' },
  { id: 'transfers', name: 'Transfer History', desc: 'All asset transfers between sites', icon: ArrowRightLeft, color: '#7C3AED' },
  { id: 'repairs', name: 'Repair Report', desc: 'Repair history with costs and vendors', icon: Wrench, color: '#EA580C' },
  { id: 'disposals', name: 'Disposal Report', desc: 'All disposed assets and reasons', icon: Trash2, color: '#DC2626' },
  { id: 'warranty', name: 'Warranty Status', desc: 'Assets with warranties expiring within 90 days', icon: Shield, color: '#2563EB' },
  { id: 'site_summary', name: 'Site Summary', desc: 'Asset counts and values per site', icon: BarChart3, color: '#B8960C' },
  { id: 'audit_trail', name: 'Audit Trail Export', desc: 'Complete audit log for compliance', icon: FileText, color: '#999' },
];

export default function ReportsPage() {
  const { selectedSite } = useApp();
  const supabase = createClient();
  const [generating, setGenerating] = useState('');

  async function generateCSV(reportId: string) {
    setGenerating(reportId);
    let data: any[] = [];
    let filename = '';

    try {
      switch (reportId) {
        case 'asset_register': {
          let query = supabase.from('assets').select('*, sites(name), asset_types(name), manufacturers(name)');
          if (selectedSite) query = query.eq('site_id', selectedSite);
          const res = await query;
          data = (res.data || []).map((a: any) => ({
            'Asset Tag': a.asset_tag, 'Serial Number': a.serial_number || '', 'Hostname': a.hostname || '',
            'Model': a.model || '', 'Manufacturer': a.manufacturers?.name || '', 'Type': a.asset_types?.name || '',
            'Site': a.site_id, 'Custodian': a.custodian_name || '', 'Status': a.status, 'Condition': a.condition,
            'Purchase Date': a.purchase_date || '', 'Purchase Value': a.purchase_value,
            'Warranty Expiration': a.warranty_expiration || '',
          }));
          filename = 'asset_register';
          break;
        }
        case 'transfers': {
          const res = await supabase.from('transfers').select('*, assets(asset_tag)').order('created_at', { ascending: false });
          data = (res.data || []).map((t: any) => ({
            'Ref': t.transfer_ref, 'Asset': t.assets?.asset_tag || '', 'From': t.from_site_id,
            'To': t.to_site_id, 'Status': t.status, 'Reason': t.reason || '',
            'Initiated': t.initiated_at, 'Completed': t.received_at || '',
          }));
          filename = 'transfers';
          break;
        }
        case 'repairs': {
          const res = await supabase.from('repairs').select('*, assets(asset_tag)').order('created_at', { ascending: false });
          data = (res.data || []).map((r: any) => ({
            'Ref': r.repair_ref, 'Asset': r.assets?.asset_tag || '', 'Vendor': r.vendor_name,
            'Issue': r.issue_description, 'Cost': r.repair_cost, 'Status': r.status,
            'Sent': r.sent_date, 'Returned': r.actual_return_date || '',
          }));
          filename = 'repairs';
          break;
        }
        case 'disposals': {
          const res = await supabase.from('disposals').select('*, assets(asset_tag, purchase_value)').order('created_at', { ascending: false });
          data = (res.data || []).map((d: any) => ({
            'Ref': d.disposal_ref, 'Asset': d.assets?.asset_tag || '', 'Reason': d.reason,
            'Detail': d.reason_detail || '', 'Asset Value': d.assets?.purchase_value || 0,
            'Status': d.status, 'Requested': d.requested_at,
          }));
          filename = 'disposals';
          break;
        }
        case 'warranty': {
          const now = new Date().toISOString().split('T')[0];
          const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
          let query = supabase.from('assets').select('*')
            .gte('warranty_expiration', now).lte('warranty_expiration', in90);
          if (selectedSite) query = query.eq('site_id', selectedSite);
          const res = await query;
          data = (res.data || []).map((a: any) => ({
            'Asset Tag': a.asset_tag, 'Model': a.model || '', 'Site': a.site_id,
            'Warranty Expiration': a.warranty_expiration, 'Days Remaining': Math.ceil(
              (new Date(a.warranty_expiration).getTime() - Date.now()) / 86400000
            ),
          }));
          filename = 'warranty_expiring';
          break;
        }
        case 'site_summary': {
          const res = await supabase.from('assets').select('site_id, purchase_value, status');
          const sites: Record<string, { total: number; value: number; active: number }> = {};
          (res.data || []).forEach((a: any) => {
            if (!sites[a.site_id]) sites[a.site_id] = { total: 0, value: 0, active: 0 };
            sites[a.site_id].total++;
            sites[a.site_id].value += Number(a.purchase_value || 0);
            if (a.status === 'active') sites[a.site_id].active++;
          });
          data = Object.entries(sites).map(([site, stats]) => ({
            'Site': site, 'Total Assets': stats.total, 'Active': stats.active,
            'Total Value': stats.value.toFixed(2),
          }));
          filename = 'site_summary';
          break;
        }
        case 'audit_trail': {
          const res = await supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(1000);
          data = (res.data || []).map((l: any) => ({
            'Timestamp': l.changed_at, 'Action': l.action, 'Table': l.table_name,
            'Record ID': l.record_id, 'Changed By': l.changed_by || '',
          }));
          filename = 'audit_trail';
          break;
        }
        default: {
          data = [{ message: 'Report not implemented' }];
          filename = reportId;
        }
      }

      // Generate CSV
      if (data.length === 0) { alert('No data found for this report.'); setGenerating(''); return; }
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itam_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error generating report');
      console.error(err);
    }

    setGenerating('');
  }

  return (
    <div className="animate-fade-in">
      <p style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>
        Generate and download reports as CSV files. {selectedSite ? `Filtered to site: ${selectedSite}` : 'Showing all sites.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {REPORTS.map(report => (
          <div key={report.id} style={{
            background: '#1A1A1Afff', border: '1px solid #E0E0E0', borderRadius: 12,
            padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = report.color)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E0E0E0')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${report.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <report.icon size={20} color={report.color} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{report.name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{report.desc}</div>
              </div>
            </div>
            <button
              onClick={() => generateCSV(report.id)}
              disabled={generating === report.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #E0E0E0',
                background: generating === report.id ? '#1A1A1A' : 'transparent',
                color: generating === report.id ? '#999' : '#1A1A1A',
                fontSize: 12, fontWeight: 600, cursor: generating === report.id ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={14} />
              {generating === report.id ? 'Generating...' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
