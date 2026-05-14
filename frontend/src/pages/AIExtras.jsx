import { useEffect, useState } from 'react';
import { aiExtras } from '../services/api';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'template', label: 'Template Library', icon: '🏗️' },
  { id: 'accessibility', label: 'Accessibility Audit', icon: '♿' },
  { id: 'comments', label: 'Collaborative Markup', icon: '💬' },
  { id: 'color', label: 'Color Harmony', icon: '🎨' },
  { id: 'lighting', label: 'Lighting Simulation', icon: '💡' },
  { id: 'furniture', label: 'Furniture Arrangement', icon: '🪑' },
];

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
      {children}
    </div>
  );
}

export default function AIExtras() {
  const [tab, setTab] = useState('template');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // template
  const [templateType, setTemplateType] = useState('kitchen');
  const [dimensions, setDimensions] = useState('{ "length_ft": 14, "width_ft": 12 }');

  // accessibility
  const [designId, setDesignId] = useState('');
  const [occupancyType, setOccupancyType] = useState('B-Business');

  // comments
  const [commentDesignId, setCommentDesignId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [synth, setSynth] = useState(null);

  // color
  const [roomType, setRoomType] = useState('living-room');
  const [mood, setMood] = useState('calm-modern');

  // lighting
  const [roomDims, setRoomDims] = useState('{ "length_ft": 16, "width_ft": 12, "height_ft": 9 }');
  const [windows, setWindows] = useState('[ { "wall": "south", "width_ft": 4, "height_ft": 5 } ]');
  const [orientation, setOrientation] = useState('south');

  // furniture
  const [furnDims, setFurnDims] = useState('{ "length_ft": 16, "width_ft": 12 }');
  const [furniture, setFurniture] = useState('[ { "item": "sofa", "w_ft": 7, "d_ft": 3 }, { "item": "tv", "w_ft": 4, "d_ft": 0.5 } ]');

  useEffect(() => {
    setResult(null);
    setError(null);
    setComments([]);
    setSynth(null);
  }, [tab]);

  const run = async (fn) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fn();
      setResult(r);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const parseJson = (str, label) => {
    try {
      return JSON.parse(str);
    } catch {
      setError(`Invalid ${label} JSON`);
      return null;
    }
  };

  const renderTab = () => {
    switch (tab) {
      case 'template':
        return (
          <Card title="Architecture Template Library">
            <p className="mb-4 text-sm text-slate-400">Pre-built room/building templates with AI-suggested layouts.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                placeholder="Type: kitchen / bedroom / bathroom..."
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
              <textarea
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="Dimensions JSON"
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
              />
            </div>
            <button
              disabled={!templateType || loading}
              onClick={() => {
                const dim = parseJson(dimensions, 'dimensions');
                if (!dim) return;
                run(() => aiExtras.template({ template_type: templateType, dimensions: dim }));
              }}
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Generating...' : '🏗️ Generate Template'}
            </button>
          </Card>
        );

      case 'accessibility':
        return (
          <Card title="Accessibility Audit (ADA/WCAG)">
            <p className="mb-4 text-sm text-slate-400">Audit a design for ADA accessibility & WCAG-aligned issues.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={designId}
                onChange={(e) => setDesignId(e.target.value)}
                placeholder="Optional: design_id"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
              <input
                value={occupancyType}
                onChange={(e) => setOccupancyType(e.target.value)}
                placeholder="Occupancy type"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
            <button
              disabled={loading}
              onClick={() =>
                run(() =>
                  aiExtras.accessibilityAudit({
                    design_id: designId ? parseInt(designId) : undefined,
                    occupancy_type: occupancyType,
                  })
                )
              }
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Auditing...' : '♿ Run Audit'}
            </button>
            {/* Render score prominently if available */}
            {result?.result?.overall_score !== undefined && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-slate-400 text-sm">Accessibility Score:</span>
                <span className={`text-2xl font-bold ${
                  result.result.overall_score >= 80 ? 'text-green-400' :
                  result.result.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {result.result.overall_score}/100
                </span>
              </div>
            )}
          </Card>
        );

      case 'comments':
        return (
          <Card title="Collaborative Markup Tool">
            <p className="mb-4 text-sm text-slate-400">Add comments to a design; let AI synthesise feedback by theme.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={commentDesignId}
                onChange={(e) => setCommentDesignId(e.target.value)}
                placeholder="design_id"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Your comment..."
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                disabled={!commentDesignId || !commentText || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await aiExtras.postComment({ design_id: parseInt(commentDesignId), comment_text: commentText });
                    setCommentText('');
                    const list = await aiExtras.listComments(parseInt(commentDesignId));
                    setComments(list.comments || []);
                    toast.success('Comment added');
                  } catch (e) { setError(e.response?.data?.error || e.message); }
                  finally { setLoading(false); }
                }}
                className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {loading ? 'Saving...' : '💬 Add Comment'}
              </button>
              <button
                disabled={!commentDesignId || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const list = await aiExtras.listComments(parseInt(commentDesignId));
                    setComments(list.comments || []);
                  } catch (e) { setError(e.response?.data?.error || e.message); }
                  finally { setLoading(false); }
                }}
                className="rounded-lg border border-slate-600 px-5 py-2 text-slate-200 disabled:opacity-50"
              >
                Load Comments
              </button>
              <button
                disabled={!commentDesignId || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const r = await aiExtras.synthesizeComments(parseInt(commentDesignId));
                    setSynth(r.result);
                  } catch (e) { setError(e.response?.data?.error || e.message); }
                  finally { setLoading(false); }
                }}
                className="rounded-lg bg-purple-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {loading ? 'Synthesizing...' : '✨ AI Synthesise'}
              </button>
            </div>
            {comments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Comments ({comments.length})</p>
                {comments.map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-900 p-3 text-sm text-slate-200">
                    <div className="text-xs text-slate-400">{c.author} — {new Date(c.created_at).toLocaleString()}</div>
                    <div className="mt-1">{c.comment_text}</div>
                  </div>
                ))}
              </div>
            )}
            {synth && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-200 mb-3">AI Synthesis</p>
                <AIResultDisplay result={synth} />
              </div>
            )}
          </Card>
        );

      case 'color':
        return (
          <Card title="Interior Color Harmony">
            <p className="mb-4 text-sm text-slate-400">AI-curated palettes with hex/RGB values.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="Room type"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Mood (calm-modern, vibrant-bohemian...)"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
            <button
              disabled={!roomType || loading}
              onClick={() => run(() => aiExtras.colorHarmony({ room_type: roomType, mood }))}
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Composing...' : '🎨 Suggest Palettes'}
            </button>

            {/* Color swatches (rich rendering) */}
            {result?.result?.palettes && (
              <div className="mt-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {result.result.palettes.map((p, i) => (
                    <div key={i} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                      <p className="font-semibold text-slate-100">{p.name}</p>
                      <p className="mb-3 text-xs text-slate-400">{p.vibe}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {p.colors?.map((c, j) => (
                          <div key={j} className="flex flex-col items-center text-xs text-slate-400">
                            <div
                              style={{ backgroundColor: c.hex }}
                              className="h-12 w-12 rounded shadow"
                              title={`${c.name} ${c.hex}`}
                            />
                            <span className="mt-1">{c.hex}</span>
                            <span className="text-slate-500">{c.usage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {result.result.reasoning && (
                  <p className="mt-3 text-sm text-slate-400">{result.result.reasoning}</p>
                )}
                {result.result.do_not_use?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase text-red-400 mb-2">Avoid These Colors</p>
                    <div className="flex flex-wrap gap-2">
                      {result.result.do_not_use.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          <div style={{ backgroundColor: c.hex }} className="h-4 w-4 rounded" />
                          <span>{c.hex}</span>
                          <span className="text-slate-500">— {c.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );

      case 'lighting':
        return (
          <Card title="Lighting Simulation Engine">
            <p className="mb-4 text-sm text-slate-400">Approximate natural + artificial lighting recommendations.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <textarea
                value={roomDims}
                onChange={(e) => setRoomDims(e.target.value)}
                placeholder="Room dimensions JSON"
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
              />
              <textarea
                value={windows}
                onChange={(e) => setWindows(e.target.value)}
                placeholder="Windows JSON"
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
              />
            </div>
            <input
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              placeholder="Orientation (N/S/E/W)"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
            <button
              disabled={loading}
              onClick={() => {
                const dims = parseJson(roomDims, 'room dimensions');
                const win = parseJson(windows, 'windows');
                if (!dims || !win) return;
                run(() => aiExtras.lightingSimulation({ room_dimensions: dims, window_sizes: win, orientation }));
              }}
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Simulating...' : '💡 Run Simulation'}
            </button>
          </Card>
        );

      case 'furniture':
        return (
          <Card title="Furniture Arrangement Optimizer">
            <p className="mb-4 text-sm text-slate-400">
              List furniture; AI proposes arrangement variants for traffic flow and sight lines.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <textarea
                value={furnDims}
                onChange={(e) => setFurnDims(e.target.value)}
                placeholder="Room dimensions JSON"
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
              />
              <textarea
                value={furniture}
                onChange={(e) => setFurniture(e.target.value)}
                placeholder="Furniture array JSON"
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
              />
            </div>
            <button
              disabled={loading}
              onClick={() => {
                const dim = parseJson(furnDims, 'room dimensions');
                const items = parseJson(furniture, 'furniture');
                if (!dim || !items) return;
                run(() => aiExtras.furnitureArrangement({ room_dimensions: dim, furniture: items }));
              }}
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Arranging...' : '🪑 Optimise Arrangement'}
            </button>
          </Card>
        );

      default:
        return null;
    }
  };

  // Extract result data for AIResultDisplay (handles different response shapes)
  const displayResult = result?.result || result;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-3xl">✨</div>
            <div>
              <h1 className="text-2xl font-bold">AI Extras</h1>
              <p className="opacity-90">6 advanced AI features — template, accessibility, collaboration, color, lighting, furniture</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'border-purple-500 bg-purple-600 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {renderTab()}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {/* Use AIResultDisplay for all tabs except color (which has custom rendering) and comments (inline) */}
        {result && tab !== 'color' && tab !== 'comments' && (
          <div className="mt-6">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">AI Analysis Result</h2>
              <AIResultDisplay result={displayResult} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
