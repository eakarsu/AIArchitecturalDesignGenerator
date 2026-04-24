import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, getFeatures, createItem, exportCSV } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import { Plus, Search, ArrowLeft, ChevronLeft, ChevronRight, Download, Filter, Star, X } from 'lucide-react';

const STATUS_CLASS = {
  draft: 'badge-draft',
  'in-progress': 'badge-in-progress',
  in_progress: 'badge-in-progress',
  completed: 'badge-completed',
};

export default function FeaturePage() {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [featureMeta, setFeatureMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({});
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const limit = 10;

  const featureLabel = featureKey
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Load feature metadata
  useEffect(() => {
    getFeatures()
      .then((res) => {
        const list = res.data || res.features || res || [];
        const found = list.find(
          (f) => (f.key || f.featureKey) === featureKey
        );
        if (found) setFeatureMeta(found);
      })
      .catch(() => {});
  }, [featureKey]);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (favoritesOnly && user) {
        params.favoritesOnly = 'true';
        params.userId = user.id;
      }
      const res = await getItems(featureKey, params);
      setItems(res.data || res.items || []);
      setTotal(res.total || res.pagination?.total || res.count || (res.data ? res.data.length : 0));
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [featureKey, page, limit, search, statusFilter, dateFrom, dateTo, favoritesOnly, user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, featureKey, statusFilter, dateFrom, dateTo, favoritesOnly]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const activeFilterCount = [statusFilter, dateFrom, dateTo, favoritesOnly].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setFavoritesOnly(false);
  };

  const handleFieldChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createItem(featureKey, { ...formData, user_id: user?.id });
      toast.success('Item created successfully');
      setShowCreate(false);
      setFormData({});
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportCSV(featureKey);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${featureKey}-export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const fields = featureMeta?.fields || [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ];

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                {featureMeta?.name || featureLabel}
              </h1>
              {featureMeta?.description && (
                <p className="mt-1 text-slate-400">{featureMeta.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-60"
                title="Export CSV"
              >
                {exporting ? <span className="spinner" /> : <Download size={16} />}
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400"
              >
                <Plus size={18} />
                New Item
              </button>
            </div>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="mb-6 animate-slide-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="form-input pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                  activeFilterCount > 0
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Filter size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                  favoritesOnly
                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
                title="Show favorites only"
              >
                <Star size={16} fill={favoritesOnly ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 animate-slide-down">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-select w-40"
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="form-input w-40"
                  />
                </div>
                <div>
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="form-input w-40"
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200"
                  >
                    <X size={14} />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 py-20 animate-fade-in">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-slate-300">
              {activeFilterCount > 0 || favoritesOnly ? 'No matching items' : 'No items yet'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {activeFilterCount > 0 || favoritesOnly
                ? 'Try adjusting your filters'
                : `Create your first ${featureLabel.toLowerCase()} to get started`}
            </p>
            {!activeFilterCount && !favoritesOnly && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Plus size={16} />
                Create Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 animate-slide-up">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {items.map((item) => (
                  <tr
                    key={item._id || item.id}
                    onClick={() =>
                      navigate(`/features/${featureKey}/${item._id || item.id}`)
                    }
                    className="cursor-pointer hover:bg-slate-700/30"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-100">
                        {item.name || item.title || 'Untitled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          STATUS_CLASS[item.status] || 'badge-draft'
                        }
                      >
                        {(item.status || 'draft').replace(/[_-]/g, ' ')}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-slate-400 sm:table-cell">
                      {formatDate(item.createdAt || item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-3">
                <span className="text-sm text-slate-400">
                  Page {page} of {totalPages} ({total} items)
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
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <Modal
            title={`Create ${featureLabel}`}
            onClose={() => setShowCreate(false)}
            wide
          >
            <form onSubmit={handleCreate}>
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {fields.map((field) => (
                  <FormField
                    key={field.name}
                    label={field.label || field.name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    name={field.name}
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={handleFieldChange}
                    options={field.options || []}
                    placeholder={field.placeholder || ''}
                    required={field.required || false}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {creating ? <span className="spinner" /> : <Plus size={16} />}
                  Create
                </button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
}
