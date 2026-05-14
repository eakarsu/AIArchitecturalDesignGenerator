import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';
import { Clock, ChevronLeft, ChevronRight, ArrowLeft, Sparkles, Filter, X } from 'lucide-react';
import api from '../services/api';

export default function AIHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [featureFilter, setFeatureFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const limit = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (featureFilter) params.feature_key = featureFilter;
      const res = await api.get('/ai-history', { params }).then((r) => r.data);
      setHistory(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load AI history:', err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, featureFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [featureFilter]);

  const FEATURE_OPTIONS = [
    'building-designs', 'compliance-checks', 'energy-models', 'material-estimations',
    'floor-plans', 'structural-analyses', 'cost-estimations', 'site-analyses',
    'sustainability-assessments', 'lighting-designs', 'hvac-designs', 'interior-designs',
    'landscape-designs', 'construction-timelines', 'parking-designs', 'acoustic-analyses',
    'fire-safety-analyses',
  ];

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100 sm:text-3xl">
                <Sparkles size={28} className="text-purple-400" />
                AI Results History
              </h1>
              <p className="mt-1 text-slate-400">
                All AI-generated analyses across features ({total} total)
              </p>
            </div>
          </div>
        </div>

        {/* Feature filter */}
        <div className="mb-6 flex items-center gap-3 animate-slide-up">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={featureFilter}
            onChange={(e) => setFeatureFilter(e.target.value)}
            className="form-select w-64"
          >
            <option value="">All Features</option>
            {FEATURE_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          {featureFilter && (
            <button
              onClick={() => setFeatureFilter('')}
              className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* History list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 py-20">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-slate-300">No AI results yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Generate AI analyses on your design items to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-slide-up">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-700/50 bg-slate-800/60 overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-700/30"
                >
                  <Sparkles size={18} className="text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 truncate">
                      {entry.item_name || 'Unnamed'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {(entry.feature_key || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      {entry.item_id ? ` · Item #${entry.item_id}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={12} />
                      {formatDate(entry.created_at)}
                    </div>
                    <p className="mt-1 text-xs text-purple-400">
                      {expandedId === entry.id ? 'Collapse' : 'View Result'}
                    </p>
                  </div>
                </button>

                {/* Expanded AI result */}
                {expandedId === entry.id && (
                  <div className="border-t border-slate-700/50 p-5">
                    {entry.item_id && entry.feature_key && (
                      <button
                        onClick={() => navigate(`/features/${entry.feature_key}/${entry.item_id}`)}
                        className="mb-4 flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <ArrowLeft size={14} />
                        View Original Item
                      </button>
                    )}
                    <AIResultDisplay result={entry.result_data} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-700/50 pt-4">
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages} ({total} results)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-600 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-600 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
