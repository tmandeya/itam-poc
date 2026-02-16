'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './layout';
import {
  Package, DollarSign, TrendingDown, Wrench, AlertTriangle,
  Building2, Activity, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import type { DashboardStats, Site } from '@/types/database';

function KPICard({ icon: Icon, label, value, subtext, color = '#D4A800' }: {
  icon: React.ElementType; label: string; value: string | number;
  subtext?: string; color?: string;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12,
      padding: '20px 24px', flex: 1, minWidth: 200, position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: `${color}10`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ color: '#666', fontSize: 12, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.5 }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { selectedSite, sites } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [siteData, setSiteData] = useState<{ name: string; assets: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { loadDashboard(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSite]);

  async function loadDashboard() {
    setLoading(true);
    let query = supabase.from('assets').select('status, purchase_value, purchase_date, warranty_expiration, site_id');
    if (selectedSite) query = query.eq('site_id', selectedSite);
    const { data: assets } = await query;

    if (assets) {
      const total = assets.length;
      const active = assets.filter(a => a.status === 'active').length;
      const inRepair = assets.filter(a => a.status === 'in_repair').length;
      const inTransit = assets.filter(a => a.status === 'in_transit').length;
      const disposed = assets.filter(a => a.status === 'disposed').length;
      const inStore = assets.filter(a => a.status === 'in_store').length;
      const totalPurchase = assets.reduce((s, a) => s + Number(a.purchase_value || 0), 0);
      const now = new Date(); const in90 = new Date(); in90.setDate(in90.getDate() + 90);
      const warrantySoon = assets.filter(a => {
        if (!a.warranty_expiration) return false;
        const exp = new Date(a.warranty_expiration);
        return exp > now && exp < in90;
      }).length;

      setStats({ total_assets: total, active_assets: active, in_repair_assets: inRepair,
        in_transit_assets: inTransit, disposed_assets: disposed, in_store_assets: inStore,
        total_purchase_value: totalPurchase, total_current_value: totalPurchase * 0.65,
        warranty_expiring_soon: warrantySoon });

      const siteGroups: Record<string, number> = {};
      assets.forEach(a => { siteGroups[a.site_id] = (siteGroups[a.site_id] || 0) + 1; });
      setSiteData(Object.entries(siteGroups).map(([name, assets]) => ({ name, assets })));

      setStatusData([
        { name: 'Active', value: active }, { name: 'In-Store', value: inStore },
        { name: 'In-Repair', value: inRepair }, { name: 'In-Transit', value: inTransit },
        { name: 'Disposed', value: disposed },
      ].filter(s => s.value > 0));
    }

    const { data: auditData } = await supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(5);
    if (auditData) setRecentActivity(auditData);
    setLoading(false);
  }

  const pieColors = ['#16A34A', '#2563EB', '#EA580C', '#7C3AED', '#DC2626'];

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#B8960C', margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color, margin: 2, fontSize: 11 }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !stats) {
    return <div style={{ color: '#999', textAlign: 'center', padding: 60 }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KPICard icon={Package} label="Total Assets" value={stats?.total_assets?.toLocaleString() || '0'} subtext={`Across ${selectedSite ? '1' : sites.length} site${selectedSite ? '' : 's'}`} />
        <KPICard icon={DollarSign} label="Purchase Value" value={`$${((stats?.total_purchase_value || 0) / 1000).toFixed(0)}k`} subtext="Total acquisition cost" color="#16A34A" />
        <KPICard icon={TrendingDown} label="Current Value" value={`$${((stats?.total_current_value || 0) / 1000).toFixed(0)}k`} subtext="After depreciation" color="#EA580C" />
        <KPICard icon={Wrench} label="In Repair" value={stats?.in_repair_assets || 0} color="#DC2626" />
        <KPICard icon={AlertTriangle} label="Warranty Expiring" value={stats?.warranty_expiring_soon || 0} subtext="Within 90 days" color="#EA580C" />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 400, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: '0 0 16px', color: '#1A1A1A', fontSize: 15, fontWeight: 600 }}>Assets by Site</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={siteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip content={renderTooltip} />
              <Bar dataKey="assets" fill="#D4A800" radius={[4, 4, 0, 0]} name="Assets" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, minWidth: 280, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: '0 0 16px', color: '#1A1A1A', fontSize: 15, fontWeight: 600 }}>Status Breakdown</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {statusData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip content={renderTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {statusData.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: pieColors[i] }} />{s.name}: {s.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 350, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: '0 0 16px', color: '#1A1A1A', fontSize: 15, fontWeight: 600 }}>Site Overview</h4>
          {sites.map(site => {
            const count = siteData.find(s => s.name === site.id)?.assets || 0;
            return (
              <div key={site.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E0E0E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(212,168,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={13} color="#B8960C" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{site.id}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>{site.city}, {site.country}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#B8960C' }}>{count}</div>
                  <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase' }}>Assets</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 350, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: '0 0 16px', color: '#1A1A1A', fontSize: 15, fontWeight: 600 }}>Recent Activity</h4>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 40 }}>No activity yet. Add your first asset to get started!</p>
          ) : (
            recentActivity.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid #E0E0E0' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(212,168,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} color="#B8960C" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#1A1A1A', textTransform: 'capitalize' }}>{log.action} — {log.table_name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>Record #{log.record_id}</div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{new Date(log.changed_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
