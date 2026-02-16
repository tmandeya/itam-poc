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

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'it_staff' },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setError('');
      setMode('login');
      setLoading(false);
      alert('Account created! You can now sign in. An admin will assign your role and sites.');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 38px', background: '#1E1E1E',
    border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff', fontSize: 14,
    fontFamily: 'var(--font-main)',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0A0A0A', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#141414',
        border: '1px solid #2A2A2A', borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Header with Magaya Mining Logo */}
        <div style={{
          padding: '36px 32px 28px', textAlign: 'center',
          borderBottom: '1px solid #2A2A2A',
        }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/images/logo.png"
              alt="Magaya Mining"
              width={140}
              height={100}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            IT Asset Management System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ padding: 32 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#F0F0F0' }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              color: '#F87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Full Name
              </label>
              <input
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                required placeholder="Your full name"
                style={{
                  width: '100%', padding: '10px 12px', background: '#1E1E1E',
                  border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff', fontSize: 14,
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#666" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@magayamining.com"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#666" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                required placeholder="Your password" minLength={6}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#666',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: loading ? '#B8960C' : '#FFD700', color: '#000',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{
                background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
