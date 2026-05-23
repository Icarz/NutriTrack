import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout, getMe } from '../api/auth';

function Logo() {
  return (
    <svg viewBox="0 0 620 180" xmlns="http://www.w3.org/2000/svg" aria-label="NutriTrack" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block' }}>
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

export default function Sidebar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);

  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '10px 14px',
    borderRadius: 8,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 500,
    fontSize: 14,
    textDecoration: 'none',
    color: isActive ? 'var(--color-accent)' : 'var(--color-ink)',
    background: isActive ? 'var(--color-accent-tint)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
    paddingLeft: 12,
    transition: 'background .15s, color .15s',
  });

  const langBtn = (active) => ({
    flex: 1,
    padding: '6px 0',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    border: '1px solid var(--color-rule)',
    background: active ? 'var(--color-accent)' : '#ffffff',
    color: active ? '#ffffff' : 'var(--color-ink)',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
  });

  return (
    <aside
      style={{
        width: 224,
        minHeight: '100vh',
        padding: 20,
        background: 'var(--color-paper-warm)',
        borderRight: '1px solid var(--color-rule)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ padding: '4px 4px 18px' }}>
        <Logo />
      </div>

      <NavLink
        to="/dashboard"
        end
        style={navLinkStyle}
        onMouseEnter={(e) => { if (e.currentTarget.getAttribute('aria-current') !== 'page') e.currentTarget.style.background = 'var(--color-accent-tint)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = e.currentTarget.getAttribute('aria-current') === 'page' ? 'var(--color-accent-tint)' : 'transparent'; }}
      >
        {t('nav.dashboard')}
      </NavLink>
      <NavLink
        to="/clients/new"
        style={navLinkStyle}
        onMouseEnter={(e) => { if (e.currentTarget.getAttribute('aria-current') !== 'page') e.currentTarget.style.background = 'var(--color-accent-tint)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = e.currentTarget.getAttribute('aria-current') === 'page' ? 'var(--color-accent-tint)' : 'transparent'; }}
      >
        {t('nav.newClient')}
      </NavLink>

      <button
        onClick={handleLogout}
        style={{
          textAlign: 'left',
          padding: '10px 14px',
          paddingLeft: 12,
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          borderLeft: '3px solid transparent',
          cursor: 'pointer',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
          fontSize: 14,
          color: 'var(--color-ink)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-tint)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {t('nav.signOut')}
      </button>

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-rule)' }}>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('en')}
            style={langBtn(currentLang === 'en')}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('fr')}
            style={langBtn(currentLang === 'fr')}
          >
            FR
          </button>
        </div>
        {me?.name && (
          <div style={{ padding: '4px 4px', fontSize: 12, color: 'var(--color-stone)' }}>
            {t('common.signedInAs')}{' '}
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{me.name}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
