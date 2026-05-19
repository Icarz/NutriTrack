import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout, getMe } from '../api/auth';

const linkBase = 'block px-4 py-2 rounded hover:bg-gray-100';
const linkActive = 'bg-gray-200 font-semibold';

export default function Sidebar() {
  const navigate = useNavigate();
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

  const cls = ({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`;

  return (
    <aside className="w-56 min-h-screen border-r border-gray-200 p-4 flex flex-col gap-2">
      <h2 className="text-lg font-bold mb-4">NutriTrack</h2>
      <NavLink to="/dashboard" className={cls} end>
        Dashboard
      </NavLink>
      <NavLink to="/clients/new" className={cls}>
        New Client
      </NavLink>
      <button onClick={handleLogout} className="text-left px-4 py-2 rounded hover:bg-gray-100">
        Logout
      </button>
      <div className="mt-auto pt-4 border-t border-gray-100">
        {me?.name && (
          <div className="px-4 py-2 text-xs text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{me.name}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
