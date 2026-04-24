import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFeatures, getItems, getAnalytics, getActivity } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Clock, FileText, CheckCircle, AlertCircle, Activity } from 'lucide-react';

const FEATURE_META = {
  'building-designs':           { icon: '🏗️', color: 'from-blue-500/20 to-blue-600/10',   accent: 'border-blue-500/30' },
  'compliance-checks':          { icon: '✅', color: 'from-green-500/20 to-green-600/10',  accent: 'border-green-500/30' },
  'energy-models':              { icon: '⚡', color: 'from-yellow-500/20 to-yellow-600/10', accent: 'border-yellow-500/30' },
  'material-estimations':       { icon: '🧱', color: 'from-orange-500/20 to-orange-600/10', accent: 'border-orange-500/30' },
  'floor-plans':                { icon: '📐', color: 'from-indigo-500/20 to-indigo-600/10', accent: 'border-indigo-500/30' },
  'structural-analyses':        { icon: '🏛️', color: 'from-red-500/20 to-red-600/10',     accent: 'border-red-500/30' },
  'cost-estimations':           { icon: '💰', color: 'from-emerald-500/20 to-emerald-600/10', accent: 'border-emerald-500/30' },
  'site-analyses':              { icon: '🗺️', color: 'from-teal-500/20 to-teal-600/10',   accent: 'border-teal-500/30' },
  'sustainability-assessments': { icon: '🌿', color: 'from-lime-500/20 to-lime-600/10',   accent: 'border-lime-500/30' },
  'lighting-designs':           { icon: '💡', color: 'from-amber-500/20 to-amber-600/10', accent: 'border-amber-500/30' },
  'hvac-designs':               { icon: '🌡️', color: 'from-cyan-500/20 to-cyan-600/10',   accent: 'border-cyan-500/30' },
  'interior-designs':           { icon: '🎨', color: 'from-pink-500/20 to-pink-600/10',   accent: 'border-pink-500/30' },
  'landscape-designs':          { icon: '🌳', color: 'from-green-600/20 to-green-700/10', accent: 'border-green-600/30' },
  'construction-timelines':     { icon: '📅', color: 'from-violet-500/20 to-violet-600/10', accent: 'border-violet-500/30' },
  'parking-designs':            { icon: '🅿️', color: 'from-slate-500/20 to-slate-600/10', accent: 'border-slate-400/30' },
  'acoustic-analyses':          { icon: '🔊', color: 'from-purple-500/20 to-purple-600/10', accent: 'border-purple-500/30' },
  'fire-safety-analyses':       { icon: '🔥', color: 'from-rose-500/20 to-rose-600/10',  accent: 'border-rose-500/30' },
};

const ACTION_ICONS = {
  created: '➕',
  updated: '✏️',
  deleted: '🗑️',
};

export default function Dashboard() {
  const [features, setFeatures] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [featRes, analyticsRes, activityRes] = await Promise.allSettled([
        getFeatures(),
        getAnalytics(),
        getActivity(10),
      ]);

      if (featRes.status === 'fulfilled') {
        const featureList = featRes.value.data || featRes.value.features || featRes.value || [];
        setFeatures(featureList);

        // Fetch counts for each feature in parallel
        const keys = featureList.map((f) => f.key || f.featureKey);
        const countResults = await Promise.allSettled(
          keys.map((k) => getItems(k, { limit: 1 }))
        );
        const countMap = {};
        keys.forEach((k, i) => {
          if (countResults[i].status === 'fulfilled') {
            const r = countResults[i].value;
            countMap[k] = r.total || r.pagination?.total || r.count || (r.data ? r.data.length : 0);
          } else {
            countMap[k] = 0;
          }
        });
        setCounts(countMap);
      } else {
        const defaultFeatures = Object.keys(FEATURE_META).map((key) => ({
          key,
          name: key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `Manage ${key.replace(/-/g, ' ')}`,
        }));
        setFeatures(defaultFeatures);
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }

      if (activityRes.status === 'fulfilled') {
        setActivities(activityRes.value.activities || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const totals = analytics?.totals || {};
  const totalItems = totals.totalItems || Object.values(counts).reduce((sum, c) => sum + c, 0);

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="gradient-text text-3xl font-bold sm:text-4xl">
            AI Architectural Design Generator
          </h1>
          <p className="mt-2 text-slate-400">
            Intelligent tools for every phase of architectural design
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-slide-up">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-blue-400" />
              <p className="text-sm text-slate-400">Total Items</p>
            </div>
            <p className="text-2xl font-bold text-slate-100">{loading ? '-' : totalItems}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-yellow-400" />
              <p className="text-sm text-slate-400">Drafts</p>
            </div>
            <p className="text-2xl font-bold text-yellow-300">{loading ? '-' : (totals.totalDraft || 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-blue-400" />
              <p className="text-sm text-slate-400">In Progress</p>
            </div>
            <p className="text-2xl font-bold text-blue-300">{loading ? '-' : (totals.totalInProgress || 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-400" />
              <p className="text-sm text-slate-400">Completed</p>
            </div>
            <p className="text-2xl font-bold text-green-300">{loading ? '-' : (totals.totalCompleted || 0)}</p>
          </div>
        </div>

        {/* Recent Activity & Recent Items row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2 animate-slide-up">
          {/* Recent Activity */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Activity size={18} className="text-purple-400" />
              <h2 className="text-lg font-semibold text-slate-200">Recent Activity</h2>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet. Start creating items!</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="text-lg mt-0.5">{ACTION_ICONS[a.action] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300">
                        <span className="font-medium text-slate-100">{a.user_name || 'User'}</span>{' '}
                        {a.action}{' '}
                        {a.item_name && (
                          <button
                            onClick={() => a.action !== 'deleted' && navigate(`/features/${a.feature_key}/${a.item_id}`)}
                            className={`font-medium ${a.action !== 'deleted' ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400'}`}
                          >
                            {a.item_name}
                          </button>
                        )}
                        <span className="text-slate-500"> in {a.feature_key?.replace(/-/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Updated Items */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-200">Recently Updated</h2>
            </div>
            {!analytics?.recentItems?.length ? (
              <p className="text-sm text-slate-500">No items yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analytics.recentItems.map((item, i) => (
                  <button
                    key={`${item.feature_key}-${item.id}-${i}`}
                    onClick={() => navigate(`/features/${item.feature_key}/${item.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-slate-700/40"
                  >
                    <span className="text-lg">{FEATURE_META[item.feature_key]?.icon || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.feature_name}</p>
                    </div>
                    <span className={
                      item.status === 'completed' ? 'badge-completed' :
                      item.status === 'in-progress' ? 'badge-in-progress' : 'badge-draft'
                    }>
                      {(item.status || 'draft').replace(/[_-]/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feature cards grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((feature, idx) => {
              const key = feature.key || feature.featureKey;
              const meta = FEATURE_META[key] || {
                icon: '📌',
                color: 'from-slate-500/20 to-slate-600/10',
                accent: 'border-slate-500/30',
              };
              const statusData = analytics?.statusCounts?.[key] || {};
              const featureTotal = Object.values(statusData).reduce((s, c) => s + c, 0);

              return (
                <button
                  key={key}
                  onClick={() => navigate(`/features/${key}`)}
                  className="card-hover group text-left p-6"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} border ${meta.accent} text-2xl`}>
                    {meta.icon}
                  </div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-white">
                    {feature.name || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {feature.description || `Manage ${key.replace(/-/g, ' ')}`}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                      {counts[key] ?? featureTotal} item{(counts[key] ?? featureTotal) !== 1 ? 's' : ''}
                    </span>
                    {statusData.completed > 0 && (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-300">
                        {statusData.completed} done
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
