'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Site } from '@/types/database';
import Image from 'next/image';
import {
  Home, Database, ArrowRightLeft, Wrench, Trash2, UserCog,
  BarChart3, ClipboardList, Settings, Bell, ChevronLeft, ChevronRight,
  Globe, LogOut,
} from 'lucide-react';

// ── CONTEXT ──
interface AppContextType {
  profile: Profile | null;
  sites: Site[];
  userSiteIds: string[];
  selectedSite: string;
  setSelectedSite: (s: string) => void;
}

const AppContext = createContext<AppContextType>({
  profile: null, sites: [], userSiteIds: [], selectedSite: '', setSelectedSite: () => {},
});

export const useApp = () => useContext(AppContext);

// ── NAV ITEMS ──
const navItems = [
  { id: '/dashboard', icon: Home, label: 'Dashboard' },
  { id: '/dashboard/assets', icon: Database, label: 'Asset Register' },
  { id: '/dashboard/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { id: '/dashboard/repairs', icon: Wrench, label: 'Repairs' },
  { id: '/dashboard/disposal', icon: Trash2, label: 'Disposal' },
  { id: '/dashboard/users', icon: UserCog, label: 'User Management' },
  { id: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { id: '/dashboard/audit', icon: ClipboardList, label: 'Audit Log' },
  { id: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [userSiteIds, setUserSiteIds] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (profileData) setProfile(profileData);

      const { data: sitesData } = await supabase
        .from('sites').select('*').eq('is_active', true).order('id');
      if (sitesData) setSites(sitesData);

      if (profileData?.role === 'super_admin') {
        setUserSiteIds(sitesData?.map(s => s.id) || []);
      } else {
        const { data: assignments } = await supabase
          .from('user_site_assignments').select('site_id').eq('user_id', user.id);
        setUserSiteIds(assignments?.map(a => a.site_id) || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0A0A0A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Image src="/images/logo.png" alt="Magaya Mining" width={100} height={72}
                 style={{ objectFit: 'contain', marginBottom: 16 }} priority />
          <p style={{ color: '#999', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  const pageTitle = navItems.find(n => pathname === n.id || (n.id !== '/dashboard' && pathname.startsWith(n.id)))?.label || 'Dashboard';
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <AppContext.Provider value={{ profile, sites, userSiteIds, selectedSite, setSelectedSite }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0A' }}>
        {/* ── SIDEBAR ── */}
        <aside style={{
          width: collapsed ? 64 : 240, background: '#0D0D0D',
          borderRight: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column',
          transition: 'width 0.3s', flexShrink: 0, overflow: 'hidden',
        }}>
          {/* Logo */}
          <div style={{
            padding: collapsed ? '16px 8px' : '16px 16px',
            borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
            minHeight: 68,
          }}>
            <Image
              src="/images/logo.png"
              alt="Magaya Mining"
              width={collapsed ? 36 : 44}
              height={collapsed ? 26 : 32}
              style={{ objectFit: 'contain', flexShrink: 0 }}
              priority
            />
            {!collapsed && (
              <div>
                <div style={{ color: '#FFD700', fontWeight: 700, fontSize: 14, letterSpacing: 0.5, lineHeight: 1.1 }}>
                  MAGAYA MINING
                </div>
                <div style={{ color: '#666', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  IT Asset Management
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(item => {
              const active = pathname === item.id || (item.id !== '/dashboard' && pathname.startsWith(item.id));
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: collapsed ? '10px 16px' : '10px 14px',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(255,215,0,0.15)' : 'transparent',
                    color: active ? '#FFD700' : '#999',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    transition: 'all 0.2s', textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              padding: 16, background: 'transparent', border: 'none',
              borderTop: '1px solid #2A2A2A', color: '#666',
              cursor: 'pointer', display: 'flex', justifyContent: 'center',
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </aside>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <header style={{
            height: 56, borderBottom: '1px solid #2A2A2A', padding: '0 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#0D0D0D', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{pageTitle}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={13} color="#666" />
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{
                    padding: '6px 10px', background: '#1E1E1E', border: '1px solid #2A2A2A',
                    borderRadius: 6, color: selectedSite ? '#fff' : '#666', fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Sites</option>
                  {sites.filter(s => userSiteIds.includes(s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Bell size={18} color="#999" style={{ cursor: 'pointer' }} />
              <div style={{ width: 1, height: 24, background: '#2A2A2A' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFD700, #B8960C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#000',
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{profile?.full_name}</div>
                  <div style={{ fontSize: 10, color: '#FFD700', textTransform: 'capitalize' }}>
                    {profile?.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#666', padding: 4,
                }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {children}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
