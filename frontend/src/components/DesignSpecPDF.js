import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DesignSpecPDF() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/custom-views/design-spec-pdf')
      .then((r) => {
        if (!mounted) return;
        const list = r.data.projects || [];
        setProjects(list);
        if (list.length) setSelectedId(list[0].id);
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = async () => {
    if (!selectedId) return;
    setDownloading(true);
    try {
      const res = await api.get('/custom-views/design-spec-pdf', {
        params: { project_id: selectedId },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedId}-design-spec.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const selected = projects.find((p) => p.id === selectedId);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Design Spec PDF Export</h2>

      {loading && <p className="text-sm text-slate-400">Loading projects...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Project</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            data-testid="pdf-project-select"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.address}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400">
            <p>
              <span className="text-slate-500">Selected:</span>{' '}
              <span className="text-slate-200">{selected.name}</span>
            </p>
            <p>
              <span className="text-slate-500">Address:</span> {selected.address}
            </p>
            <p className="mt-2 text-slate-500">
              The PDF will include rooms with square footage, materials schedule, and IBC/NEC code references.
            </p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!selectedId || downloading}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-4 py-2 transition-colors"
          data-testid="pdf-download-btn"
        >
          {downloading ? 'Generating PDF...' : 'Download Design Spec PDF'}
        </button>
      </div>
    </div>
  );
}
