import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, ChevronRight, UserCircle } from 'lucide-react';

const FEATURE_LABELS = {
  'building-designs': 'Building Designs',
  'compliance-checks': 'Code Compliance',
  'energy-models': 'Energy Modeling',
  'material-estimations': 'Material Estimation',
  'floor-plans': 'Floor Plans',
  'structural-analyses': 'Structural Analysis',
  'cost-estimations': 'Cost Estimation',
  'site-analyses': 'Site Analysis',
  'sustainability-assessments': 'Sustainability',
  'lighting-designs': 'Lighting Design',
  'hvac-designs': 'HVAC Design',
  'interior-designs': 'Interior Design',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const parts = location.pathname.split('/').filter(Boolean);

  const crumbs = [];
  if (parts[0] === 'dashboard') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
  } else if (parts[0] === 'profile') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    crumbs.push({ label: 'Profile', path: null });
  } else if (parts[0] === 'features') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    if (parts[1]) {
      crumbs.push({
        label: FEATURE_LABELS[parts[1]] || parts[1],
        path: `/features/${parts[1]}`,
      });
    }
    if (parts[2]) {
      crumbs.push({ label: 'Item Detail', path: null });
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-lg font-bold"
          >
            <span className="text-2xl">🏛️</span>
            <span className="gradient-text hidden sm:inline">ArchDesign AI</span>
          </button>

          {crumbs.length > 0 && (
            <div className="hidden items-center gap-1 text-sm text-slate-400 md:flex">
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={14} className="text-slate-600" />}
                  {crumb.path ? (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="hover:text-slate-200"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-300">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: User + logout */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="hidden items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 sm:flex"
            >
              <UserCircle size={16} />
              {user.name || user.email}
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Dashboard"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
