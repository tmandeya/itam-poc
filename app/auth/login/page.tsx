'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/dashboard'); router.refresh(); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, role: 'it_staff' } },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setMode('login'); setLoading(false); alert('Account created! You can now sign in.'); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 38px', background: '#F0F0F0',
    border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A', fontSize: 14,
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F5F5', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff',
        border: '1px solid #E0E0E0', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '36px 32px 28px', textAlign: 'center', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <Image src="/images/logo.png" alt="Magaya Mining" width={140} height={100}
                   style={{ objectFit: 'contain' }} priority />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            IT Asset Management System
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ padding: 32 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#1A1A1A' }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13,
            }}>{error}</div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                     required placeholder="Your full name"
                     style={{ width: '100%', padding: '10px 12px', background: '#F0F0F0', border: '1px solid #E0E0E0', borderRadius: 8, color: '#1A1A1A', fontSize: 14 }} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     required placeholder="you@magayamining.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password}
                     onChange={(e) => setPassword(e.target.value)} required placeholder="Your password" minLength={6}
                     style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: loading ? '#B8960C' : '#D4A800', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button"
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#D4A800', cursor: 'pointer', fontSize: 13 }}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
