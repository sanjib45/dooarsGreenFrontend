import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/merchant', icon: 'inventory_2', label: 'Merchant' },
  { to: '/labor', icon: 'groups', label: 'Labor' },
  { to: '/factory', icon: 'potted_plant', label: 'Factory' },
  { to: '/payments', icon: 'payments', label: 'Payments' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  return (
    <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/30 shadow-[0_8px_30px_rgba(27,94,32,0.08)]">
      <div className="flex justify-between items-center w-full px-6 md:px-12 py-4 max-w-[1440px] mx-auto">
        {/* Logo */}
        <div className="font-headline text-headline-md font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl">eco</span>
          DOOARS GREEN
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'text-primary border-b-2 border-primary pb-1 font-bold text-sm'
                  : 'text-on-surface-variant hover:text-primary transition-colors text-sm'
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-all active:scale-90" title="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-all active:scale-90" title="Account">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
          <button onClick={handleLogoutClick} className="p-2 text-error hover:bg-red-50 rounded-full transition-all active:scale-90" title="Logout">
            <span className="material-symbols-outlined">logout</span>
          </button>
          {/* Mobile menu */}
          <button className="lg:hidden p-2 text-on-surface-variant" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-outline-variant/20 bg-surface-container-low/95 px-6 py-4 flex flex-col gap-2">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive
                  ? 'bg-secondary-container text-on-secondary-container rounded-xl flex items-center gap-3 px-4 py-3 font-bold'
                  : 'text-on-surface-variant flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-variant/50'
              }
            >
              <span className="material-symbols-outlined text-xl">{icon}</span>
              <span className="font-semibold">{label}</span>
            </NavLink>
          ))}
        </div>
      )}
      
      {/* Logout Confirmation Modal */}
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
    </header>
  );
}
