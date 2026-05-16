import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';

const linkBase = 'block px-4 py-2 rounded hover:bg-gray-100';
const linkActive = 'bg-gray-200 font-semibold';

export default function Sidebar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside className="w-56 min-h-screen border-r border-gray-200 p-4 flex flex-col gap-2">
      <h2 className="text-lg font-bold mb-4">NutriTrack</h2>
      <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}>
        Dashboard
      </NavLink>
      <NavLink to="/clients/new" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}>
        New Client
      </NavLink>
      <button onClick={handleLogout} className="mt-auto text-left px-4 py-2 rounded hover:bg-gray-100">
        Logout
      </button>
    </aside>
  );
}
