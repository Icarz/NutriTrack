import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';

function Logo() {
  return (
    <svg viewBox="0 0 620 180" xmlns="http://www.w3.org/2000/svg" aria-label="NutriTrack" style={{ width: '100%', maxWidth: 200, height: 'auto', display: 'block', margin: '0 auto' }}>
      <path
        d="M 30 120 L 150 120 L 168 96 L 188 140 L 208 108 L 224 120 L 590 120"
        fill="none"
        stroke="#2E8B5F"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <text
        x="30"
        y="100"
        fontFamily="Manrope, sans-serif"
        fontWeight="800"
        fontSize="84"
        letterSpacing="-3"
        fill="#0F2A22"
      >
        NutriTrack
      </text>
      <g transform="translate(258, 26)">
        <path d="M 0 16 C 0 6, 8 0, 16 0 C 16 10, 10 18, 0 16 Z" fill="#2E8B5F" />
        <path d="M 2 14 L 13 4" stroke="#0F2A22" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'NutriTrack';
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#ffffff',
          border: '1px solid var(--color-rule)',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 1px 2px rgba(15, 42, 34, 0.04)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Logo />
        </div>

        <p style={{ fontSize: 14, color: 'var(--color-stone)', textAlign: 'center', marginBottom: 24 }}>
          {t('auth.subtitle')}
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 6 }}>
          {t('auth.email')}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            border: '1px solid var(--color-rule)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 14,
            fontFamily: "'Inter', system-ui, sans-serif",
            background: '#ffffff',
            color: 'var(--color-ink)',
          }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 6 }}>
          {t('auth.password')}
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            border: '1px solid var(--color-rule)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 20,
            fontSize: 14,
            fontFamily: "'Inter', system-ui, sans-serif",
            background: '#ffffff',
            color: 'var(--color-ink)',
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: 'var(--color-accent)',
            color: '#ffffff',
            borderRadius: 8,
            padding: '11px 16px',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "'Inter', system-ui, sans-serif",
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; }}
        >
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>

        {error && (
          <p style={{ marginTop: 14, fontSize: 13, color: '#B43A2E', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
