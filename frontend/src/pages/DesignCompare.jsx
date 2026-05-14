import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';
import { ArrowLeft, GitCompare, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DesignCompare() {
  const navigate = useNavigate();
  const [designIdA, setDesignIdA] = useState('');
  const [designIdB, setDesignIdB] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!designIdA || !designIdB) {
      toast.error('Both design IDs are required.');
      return;
    }
    if (designIdA === designIdB) {
      toast.error('Please enter two different design IDs.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api
        .post('/ai/compare-designs', {
          design_id_a: parseInt(designIdA),
          design_id_b: parseInt(designIdB),
        })
        .then((r) => r.data);
      setResult(res);
    } catch (err) {
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Comparison failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const WinnerBadge = ({ winner, side }) => {
    if (!winner || winner === 'tie') return null;
    if (winner.toUpperCase() !== side) return null;
    return (
      <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300">
        Recommended
      </span>
    );
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
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100 sm:text-3xl">
            <GitCompare size={28} className="text-blue-400" />
            Design Comparison
          </h1>
          <p className="mt-1 text-slate-400">
            Compare two building designs side-by-side with AI analysis
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleCompare} className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 animate-slide-up">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Design A — ID</label>
              <input
                type="number"
                value={designIdA}
                onChange={(e) => setDesignIdA(e.target.value)}
                placeholder="e.g. 1"
                min="1"
                required
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Design B — ID</label>
              <input
                type="number"
                value={designIdB}
                onChange={(e) => setDesignIdB(e.target.value)}
                placeholder="e.g. 2"
                min="1"
                required
                className="form-input"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !designIdA || !designIdB}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 font-medium text-white hover:from-blue-500 hover:to-purple-500 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Comparing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Compare with AI
                </>
              )}
            </button>
            <p className="text-sm text-slate-500">
              Find building design IDs on the Building Designs feature page.
            </p>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="animate-fade-in space-y-6">
            {/* Design names */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">A</span>
                  <WinnerBadge winner={result.comparison?.overall_recommendation?.winner} side="A" />
                </div>
                <p className="font-semibold text-slate-100">{result.design_a?.name || `Design ${designIdA}`}</p>
                <p className="text-xs text-slate-400">ID: {result.design_a?.id || designIdA}</p>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">B</span>
                  <WinnerBadge winner={result.comparison?.overall_recommendation?.winner} side="B" />
                </div>
                <p className="font-semibold text-slate-100">{result.design_b?.name || `Design ${designIdB}`}</p>
                <p className="text-xs text-slate-400">ID: {result.design_b?.id || designIdB}</p>
              </div>
            </div>

            {/* Overall recommendation */}
            {result.comparison?.overall_recommendation && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-100">
                  <Sparkles size={18} className="text-purple-400" />
                  AI Recommendation
                </h2>
                <p className="text-slate-300">{result.comparison.overall_recommendation.reasoning}</p>
                {result.comparison.overall_recommendation.best_use_case && (
                  <p className="mt-2 text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Best use case: </span>
                    {result.comparison.overall_recommendation.best_use_case}
                  </p>
                )}
                {result.comparison.similarity_score !== undefined && (
                  <p className="mt-2 text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Similarity score: </span>
                    {result.comparison.similarity_score}/100
                  </p>
                )}
              </div>
            )}

            {/* Side-by-side strengths/weaknesses */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Design A */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">A</span>
                  {result.design_a?.name || `Design ${designIdA}`}
                </h3>
                {result.comparison?.design_a_strengths?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase text-green-400 mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {result.comparison.design_a_strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.comparison?.design_a_weaknesses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-red-400 mb-2">Weaknesses</p>
                    <ul className="space-y-1">
                      {result.comparison.design_a_weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Design B */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <span className="rounded bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">B</span>
                  {result.design_b?.name || `Design ${designIdB}`}
                </h3>
                {result.comparison?.design_b_strengths?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase text-green-400 mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {result.comparison.design_b_strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.comparison?.design_b_weaknesses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-red-400 mb-2">Weaknesses</p>
                    <ul className="space-y-1">
                      {result.comparison.design_b_weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Full AI comparison detail */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Full Comparison Detail</h2>
              <AIResultDisplay result={result.comparison} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
