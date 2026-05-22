import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SAMPLE = JSON.stringify(
  {
    occupancy_type: 'R-3',
    total_sq_ft: 1800,
    ceiling_height_ft: 8,
    exit_count: 1,
    stair_width_in: 36,
    receptacle_spacing_ft: 10,
    gfci_kitchen: true,
    afci_protection: true,
    smoke_alarms: true,
    fire_rating_hr: 1,
    insulation_r_value: 30,
  },
  null,
  2
);

export default function CodeComplianceCheck() {
  const [params, setParams] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    let parsed;
    try {
      parsed = JSON.parse(params);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
      setLoading(false);
      return;
    }
    try {
      const r = await api.post('/custom-views/code-compliance', { design_params: parsed });
      setResult(r.data.result);
      toast.success('Compliance scan complete.');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Building Code Compliance Checker</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Design parameters (JSON) — checked against IBC 2021 / NEC 2023
          </label>
          <textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            rows={12}
            className="w-full font-mono text-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
            data-testid="compliance-params-input"
          />
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-4 py-2 transition-colors"
          data-testid="compliance-scan-btn"
        >
          {loading ? 'Scanning...' : 'Scan Against Code'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {result && (
          <div className="space-y-3" data-testid="compliance-result">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">Summary</span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    result.summary.overall === 'COMPLIANT'
                      ? 'bg-green-500/20 text-green-300'
                      : result.summary.overall === 'MINOR ISSUES'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {result.summary.overall}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-400">
                <span>
                  <span className="text-slate-500">Passed:</span>{' '}
                  <span className="text-green-300">{result.summary.passed}</span>
                </span>
                <span>
                  <span className="text-slate-500">Failed:</span>{' '}
                  <span className="text-red-300">{result.summary.failed}</span>
                </span>
                <span>
                  <span className="text-slate-500">Score:</span>{' '}
                  <span className="text-slate-200">{result.summary.score_pct}%</span>
                </span>
              </div>
            </div>

            <ul className="space-y-2">
              {result.items.map((item, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-2.5 text-xs flex items-start gap-2 ${
                    item.pass
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <span className="shrink-0">{item.pass ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <div className="font-mono text-[10px] text-slate-500">
                      {item.code} §{item.section}
                    </div>
                    <div className="text-slate-200">{item.rule}</div>
                    <div className="text-slate-500 mt-0.5">Observed: {item.value}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
