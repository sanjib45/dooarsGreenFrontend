import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { authAPI } from '../api/authApi';

const navItems = [
  { to: '/dashboard', icon: 'dashboard',    label: 'Dashboard' },
  { to: '/merchant', icon: 'inventory_2',  label: 'Merchant' },
  { to: '/labor',     icon: 'groups',       label: 'Labor' },
  { to: '/factory',     icon: 'potted_plant', label: 'Factory' },
  { to: '/payments',  icon: 'payments',     label: 'Payments' },
];

export default function Sidebar({ collapsed = false, onToggle, isMobile = false, profile = null }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleConfirmLogout = async () => {
    try {
      await authAPI.logout(); // clears httpOnly cookie + DB refresh token hash
    } catch {
      // ignore — we're logging out regardless
    }
    // Clear all auth keys (supports both old and new key names for safety)
    ['accessToken', 'token', 'isAuthenticated', 'user'].forEach(
      k => localStorage.removeItem(k)
    );
    setShowLogoutConfirm(false);
    navigate('/login', { replace: true });
  };

  return (
    <aside className="h-full flex flex-col border-r border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-3xl overflow-hidden">

      {/* ── Navigation ── */}
      <nav className="flex flex-col gap-1 flex-1 px-2 py-4 overflow-hidden">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => isMobile && onToggle()}
            title={collapsed ? label : ''}
            className={({ isActive }) =>
              `flex items-center rounded-2xl px-3 py-3 transition-all cursor-pointer group ${
                isActive
                  ? 'bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
          >
            {/* Icon */}
            <span className="material-symbols-outlined text-[22px] shrink-0">{icon}</span>

            {/* Label — slides in/out */}
            <span
              className={`ml-4 text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'
              }`}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* ── Profile Footer Section ── */}
      <div className="border-t border-outline-variant/10 p-4 bg-surface-container-lowest">
        {collapsed ? (
          <div className="flex flex-col items-center gap-4">
            {/* Collapsed: Avatar */}
            <div 
              title={profile ? `${profile.name} (${profile.role})` : 'Profile'}
              className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shadow-sm shrink-0 cursor-default"
            >
              {profile ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {/* Collapsed: Logout Icon */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              className="p-2 text-error hover:bg-error/10 rounded-xl transition-all active:scale-90 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {/* Avatar & Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shadow-sm shrink-0">
                {profile ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-on-surface truncate leading-tight">
                  {profile ? profile.name : 'Loading...'}
                </span>
                <span className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
                  {profile ? profile.role : 'User'}
                </span>
              </div>
            </div>
            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              className="p-2 text-error hover:bg-error/10 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout from your account?"
        confirmText="Logout"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
}
