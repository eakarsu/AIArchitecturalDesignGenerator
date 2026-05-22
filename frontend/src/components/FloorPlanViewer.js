import { useEffect, useState } from 'react';
import api from '../services/api';

export default function FloorPlanViewer() {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/custom-views/floor-plans')
      .then((r) => {
        if (!mounted) return;
        const list = r.data.plans || [];
        setPlans(list);
        if (list.length) setSelectedId(list[0].id);
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const plan = plans.find((p) => p.id === selectedId);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-100">Floor Plan Viewer</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Plan:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            data-testid="floor-plan-select"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading plans...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {plan && (
        <div>
          <div className="mb-3 flex gap-4 text-xs text-slate-400">
            <span>
              <span className="text-slate-500">Style:</span>{' '}
              <span className="text-slate-200">{plan.style}</span>
            </span>
            <span>
              <span className="text-slate-500">Size:</span>{' '}
              <span className="text-slate-200">{plan.sq_ft} sq ft</span>
            </span>
            <span>
              <span className="text-slate-500">Rooms:</span>{' '}
              <span className="text-slate-200">{plan.rooms.length}</span>
            </span>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 overflow-auto">
            <svg
              viewBox="0 0 420 380"
              width="100%"
              height="380"
              style={{ background: '#0f172a', borderRadius: 6 }}
              data-testid="floor-plan-svg"
            >
              {/* Rooms */}
              {plan.rooms.map((r) => (
                <g key={r.id}>
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={r.x + r.w / 2}
                    y={r.y + r.h / 2}
                    fill="#cbd5e1"
                    fontSize="10"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {r.label}
                  </text>
                </g>
              ))}
              {/* Walls */}
              {plan.walls.map((w, i) => (
                <line
                  key={`w${i}`}
                  x1={w.x1}
                  y1={w.y1}
                  x2={w.x2}
                  y2={w.y2}
                  stroke="#f1f5f9"
                  strokeWidth="3"
                  strokeLinecap="square"
                />
              ))}
              {/* Doors as arcs */}
              {plan.doors.map((d, i) => (
                <g key={`d${i}`}>
                  {d.dir === 'h' ? (
                    <path
                      d={`M ${d.x} ${d.y} a 18 18 0 0 1 18 -18`}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      fill="none"
                    />
                  ) : (
                    <path
                      d={`M ${d.x} ${d.y} a 18 18 0 0 1 18 18`}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-3 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-slate-700 border border-slate-500" />
              <span className="text-slate-400">Room</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-1 bg-slate-100" />
              <span className="text-slate-400">Wall</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-amber-400 rounded-full" />
              <span className="text-slate-400">Door</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
