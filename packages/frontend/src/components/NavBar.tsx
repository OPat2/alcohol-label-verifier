import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, Layers, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to: string, label: string, Icon: React.ElementType) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-blue-700 text-white'
            : 'text-blue-100 hover:bg-blue-700 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <Link to="/" className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-300" />
            <div>
              <div className="text-lg font-bold leading-none">TTB Label Verifier</div>
              <div className="text-xs text-blue-300">AI-Powered Compliance Assistant</div>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            {navLink('/', 'Dashboard', Layers)}
            {navLink('/verify', 'Single Label', Upload)}
            {navLink('/batch', 'Batch Upload', Layers)}
          </div>

          {/* User / Logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200">{user?.name || user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-700 rounded-lg transition"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
