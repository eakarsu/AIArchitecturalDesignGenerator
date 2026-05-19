import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, ChevronRight, UserCircle, History, GitCompare, Search } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

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
  'landscape-designs': 'Landscape Design',
  'construction-timelines': 'Timelines',
  'parking-designs': 'Parking Design',
  'acoustic-analyses': 'Acoustic Analysis',
  'fire-safety-analyses': 'Fire Safety',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const parts = location.pathname.split('/').filter(Boolean);

  const crumbs = [];
  if (parts[0] === 'dashboard') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
  } else if (parts[0] === 'profile') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    crumbs.push({ label: 'Profile', path: null });
  } else if (parts[0] === 'ai-extras') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    crumbs.push({ label: 'AI Extras', path: null });
  } else if (parts[0] === 'ai-history') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    crumbs.push({ label: 'AI History', path: null });
  } else if (parts[0] === 'compare') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    crumbs.push({ label: 'Design Compare', path: null });
  } else if (parts[0] === 'features') {
    crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    if (parts[1]) {
      crumbs.push({
        label: FEATURE_LABELS[parts[1]] || parts[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        path: `/features/${parts[1]}`,
      });
    }
    if (parts[2]) {
      crumbs.push({ label: 'Item Detail', path: null });
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await api.get('/search', { params: { q: searchQuery.trim() } }).then((r) => r.data);
      setSearchResults(res);
    } catch (err) {
      toast.error('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <>
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
                      <button onClick={() => navigate(crumb.path)} className="hover:text-slate-200">
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

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Global Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Global Search"
            >
              <Search size={18} />
            </button>

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
              onClick={() => navigate('/ai-extras')}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-purple-200 hover:bg-purple-600/20 hover:text-white"
              title="AI Extras"
            >
              ✨ AI Extras
            </button>
            <button
              onClick={() => navigate('/custom-views')}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-cyan-200 hover:bg-cyan-600/20 hover:text-white"
              title="Design Views"
              data-testid="nav-design-views"
            >
              📐 Design Views
            </button>
            <button
              onClick={() => navigate('/ai-backlog')}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-600/20 hover:text-white"
              title="AI Backlog"
            >
              🧰 Backlog
            </button>
            <button
              onClick={() => navigate('/ai-history')}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="AI History"
            >
              <History size={18} />
            </button>
            <button
              onClick={() => navigate('/compare')}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Compare Designs"
            >
              <GitCompare size={18} />
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

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 pt-20 px-4"
          onClick={closeSearch}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700/50 bg-slate-800 shadow-2xl animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-3 p-4">
              <Search size={20} className="text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all features..."
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-lg"
              />
              {searching && <span className="spinner shrink-0" />}
              <button
                type="button"
                onClick={closeSearch}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Esc
              </button>
            </form>

            {searchResults && (
              <div className="border-t border-slate-700/50 max-h-96 overflow-y-auto">
                {searchResults.total === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No results found for "{searchResults.query}".</p>
                ) : (
                  <div className="p-2">
                    <p className="px-2 pb-2 text-xs text-slate-500">
                      {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for "{searchResults.query}"
                    </p>
                    {Object.values(searchResults.results).map((group) => (
                      <div key={group.feature_key} className="mb-3">
                        <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-400">
                          {group.feature_name} ({group.count})
                        </p>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              navigate(`/features/${group.feature_key}/${item.id}`);
                              closeSearch();
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-700/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 truncate">{item.description}</p>
                              )}
                            </div>
                            <span className={`text-xs rounded-full px-2 py-0.5 ${
                              item.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              item.status === 'in-progress' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-slate-600/50 text-slate-400'
                            }`}>
                              {item.status || 'draft'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
