import { useEffect, useState } from 'react';
import api from '../services/api';

export default function DesignGallery() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/custom-views/design-gallery')
      .then((r) => mounted && setVariants(r.data.variants || []))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Design Variation Gallery</h2>
        <span className="text-xs text-slate-500">{variants.length} variants</span>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading variants...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        data-testid="design-gallery-grid"
      >
        {variants.map((v) => (
          <div
            key={v.id}
            className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 hover:border-emerald-500/40 transition-colors"
            data-testid="design-variant-card"
          >
            <div
              className="h-32 w-full relative"
              style={{
                background: `linear-gradient(135deg, ${v.thumbnail} 0%, ${v.accent} 100%)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-3xl text-white/80">
                🏛
              </div>
              <div className="absolute bottom-1 right-2 text-[10px] text-white/70 font-mono">
                {v.id}
              </div>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold text-slate-100 mb-1">{v.style}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{v.sq_ft} sq ft</span>
                <span className="text-emerald-400 font-semibold">{fmt(v.cost_estimate_usd)}</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">{v.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
