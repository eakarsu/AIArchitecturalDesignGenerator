
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
// Apply pass 5 — backlog tool surface for AIArchitecturalDesignGenerator
// Surfaces the 10 endpoints in /api/ai/* added in routes/aiBacklog.js.
import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AIReport from '../components/AIReport';

const TOOLS = [
  { id: 'precedent-search',  label: 'Precedent Search', desc: 'In-memory keyword similarity over your past designs.' },
  { id: 'design-to-bim',     label: 'Design to BIM',     desc: 'AI BIM JSON descriptor (not a real IFC).' },
  { id: 'render-spec',       label: 'Render Spec',       desc: 'Camera + lighting + materials JSON spec.' },
  { id: 'structural-advisor',label: 'Structural Advisor',desc: 'Preliminary structural guidance (NOT certified FEA).' },
  { id: 'energy-model',      label: 'Energy Model',      desc: 'You supply climate inputs (HDD/CDD/lat/sun).' },
  { id: 'plugin-export',     label: 'Plugin Export',     desc: 'Revit / AutoCAD / SketchUp JSON descriptor.' },
  { id: 'cad-conversion',    label: 'CAD Conversion',    desc: 'Sketch description -> CAD-ready spec.' },
  { id: 'versions',          label: 'Design Versions',   desc: 'Snapshot / list / restore (snapshot-only, no diff).' },
  { id: 'comments',          label: 'Comments + Lock',   desc: 'Persistent comment thread + 30-min soft-lock.' },
  { id: 'material-library',  label: 'Material Library',  desc: 'Per-user material library (CRUD).' },
];

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur mb-4">
      <h3 className="mb-3 text-base font-semibold text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function J({ data }) {
  return <AIReport response={data} title="Tool result" />;
}

export default function AIBacklog() {
  const fullAIExamples = useFullAIExamples();

  const [tool, setTool] = useState('precedent-search');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [out, setOut] = useState(null);

  // form state per-tool
  const [psQuery, setPsQuery] = useState('modern coastal villa');
  const [psTopN, setPsTopN] = useState(5);

  const [bimSummary, setBimSummary] = useState('Two-story 2400 sqft Craftsman with open-plan living, 3 bedrooms.');

  const [rsSummary, setRsSummary] = useState('Modern 1800 sqft single-story home, flat roof, large south-facing windows.');
  const [rsView, setRsView] = useState('exterior 3-quarter perspective');
  const [rsMood, setRsMood] = useState('golden hour');

  const [saType, setSaType] = useState('residential');
  const [saSpan, setSaSpan] = useState(8);
  const [saFloors, setSaFloors] = useState(2);
  const [saSeismic, setSaSeismic] = useState('D');
  const [saSoil, setSaSoil] = useState('stiff clay');

  const [emSqft, setEmSqft] = useState(2400);
  const [emFloors, setEmFloors] = useState(2);
  const [emR, setEmR] = useState(20);
  const [emHvac, setEmHvac] = useState('heat pump');
  const [emHdd, setEmHdd] = useState(4500);
  const [emCdd, setEmCdd] = useState(800);
  const [emLat, setEmLat] = useState(40);
  const [emSun, setEmSun] = useState(5);

  const [peTarget, setPeTarget] = useState('revit');
  const [peDesignId, setPeDesignId] = useState('');

  const [ccDesc, setCcDesc] = useState('Floor plan: 30x40ft single-story; living room at south-east corner; kitchen north-east.');
  const [ccUnits, setCcUnits] = useState('feet');
  const [ccFmt, setCcFmt] = useState('dwg');

  const [vDesignId, setVDesignId] = useState('');
  const [vLabel, setVLabel] = useState('checkpoint A');
  const [vList, setVList] = useState(null);

  const [cmtDesignId, setCmtDesignId] = useState('');
  const [cmtBody, setCmtBody] = useState('');
  const [cmtList, setCmtList] = useState(null);

  const [matName, setMatName] = useState('Birch plywood');
  const [matCat, setMatCat] = useState('interior');
  const [matData, setMatData] = useState('{"thickness_mm":18}');
  const [matList, setMatList] = useState(null);

  const wrap = async (fn) => {
    setLoading(true); setErr(''); setOut(null);
    try { const r = await fn(); setOut(r); }
    catch (e) {
      const msg = e.response?.data?.error || e.message;
      const miss = e.response?.data?.missing;
      setErr(miss ? `${msg} (missing: ${miss})` : msg);
    } finally { setLoading(false); }
  };

  return (
    <div data-full-ai-workspace="AIBacklog"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">AI Backlog Tools</h1>
        <p className="text-sm text-slate-400 mb-4">Apply pass 5 features. Set OPENROUTER_API_KEY for AI tools (else 503).</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setErr(''); setOut(null); }}
              className={`rounded-lg px-3 py-1.5 text-xs ${tool === t.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-4 text-xs text-slate-500">{TOOLS.find((t) => t.id === tool)?.desc}</p>

        {tool === 'precedent-search' && (
          <Section title="Precedent search (in-memory)">
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={psQuery} onChange={(e) => setPsQuery(e.target.value)} placeholder="query" data-full-ai-field={fullAIExamples.bind({ current: psQuery, change: (e) => setPsQuery(e.target.value), label: "psQuery", manual: false, json: false, sample: 'modern coastal villa' }, "p1-5350", undefined)} />
            <input className="w-32 mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={psTopN} onChange={(e) => setPsTopN(parseInt(e.target.value || '5', 10))} placeholder="top_n" data-full-ai-field={fullAIExamples.bind({ current: psTopN, change: (e) => setPsTopN(parseInt(e.target.value || '5', 10)), label: "psTopN", manual: false, json: false, sample: 5 }, "p1-5531", undefined)} />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/precedent-search', { query: psQuery, top_n: psTopN }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">
              {loading ? '…' : 'Search'}
            </button>
          </Section>
        )}
        {tool === 'design-to-bim' && (
          <Section title="Design -> BIM JSON descriptor">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-24" value={bimSummary} onChange={(e) => setBimSummary(e.target.value)} placeholder="design summary" data-full-ai-field={fullAIExamples.bind({ current: bimSummary, change: (e) => setBimSummary(e.target.value), label: "bimSummary", manual: false, json: false, sample: 'Two-story 2400 sqft Craftsman with open-plan living, 3 bedrooms.' }, "p1-6154", undefined)} />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/design-to-bim', { design_summary: bimSummary }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Generate BIM'}</button>
          </Section>
        )}
        {tool === 'render-spec' && (
          <Section title="Render spec">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-20" value={rsSummary} onChange={(e) => setRsSummary(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: rsSummary, change: (e) => setRsSummary(e.target.value), label: "rsSummary", manual: false, json: false, sample: 'Modern 1800 sqft single-story home, flat roof, large south-facing windows.' }, "p1-6721", undefined)} />
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={rsView} onChange={(e) => setRsView(e.target.value)} placeholder="view" data-full-ai-field={fullAIExamples.bind({ current: rsView, change: (e) => setRsView(e.target.value), label: "rsView", manual: false, json: false, sample: 'exterior 3-quarter perspective' }, "p1-6894", undefined)} />
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={rsMood} onChange={(e) => setRsMood(e.target.value)} placeholder="lighting mood" data-full-ai-field={fullAIExamples.bind({ current: rsMood, change: (e) => setRsMood(e.target.value), label: "rsMood", manual: false, json: false, sample: 'golden hour' }, "p1-7072", undefined)} />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/render-spec', { design_summary: rsSummary, view: rsView, lighting_mood: rsMood }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Generate'}</button>
          </Section>
        )}
        {tool === 'structural-advisor' && (
          <Section title="Structural advisor">
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saType} onChange={(e) => setSaType(e.target.value)} placeholder="project_type" data-full-ai-field={fullAIExamples.bind({ current: saType, change: (e) => setSaType(e.target.value), label: "saType", manual: false, json: false, sample: 'residential' }, "p1-7666", undefined)} />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={saSpan} onChange={(e) => setSaSpan(parseFloat(e.target.value))} placeholder="span_m" data-full-ai-field={fullAIExamples.bind({ current: saSpan, change: (e) => setSaSpan(parseFloat(e.target.value)), label: "saSpan", manual: false, json: false, sample: 8 }, "p1-7912", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={saFloors} onChange={(e) => setSaFloors(parseInt(e.target.value, 10))} placeholder="num_floors" data-full-ai-field={fullAIExamples.bind({ current: saFloors, change: (e) => setSaFloors(parseInt(e.target.value, 10)), label: "saFloors", manual: false, json: false, sample: 2 }, "p1-8108", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saSeismic} onChange={(e) => setSaSeismic(e.target.value)} placeholder="seismic_zone" data-full-ai-field={fullAIExamples.bind({ current: saSeismic, change: (e) => setSaSeismic(e.target.value), label: "saSeismic", manual: false, json: false, sample: 'D' }, "p1-8314", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saSoil} onChange={(e) => setSaSoil(e.target.value)} placeholder="soil_type" data-full-ai-field={fullAIExamples.bind({ current: saSoil, change: (e) => setSaSoil(e.target.value), label: "saSoil", manual: false, json: false, sample: 'stiff clay' }, "p1-8496", undefined)} />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/structural-advisor', { project_type: saType, span_m: saSpan, num_floors: saFloors, seismic_zone: saSeismic, soil_type: saSoil }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Advise'}</button>
          </Section>
        )}
        {tool === 'energy-model' && (
          <Section title="Energy model (you supply climate inputs)">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emSqft} onChange={(e) => setEmSqft(parseFloat(e.target.value))} placeholder="sq_footage" data-full-ai-field={fullAIExamples.bind({ current: emSqft, change: (e) => setEmSqft(parseFloat(e.target.value)), label: "emSqft", manual: false, json: false, sample: 2400 }, "p1-9214", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emFloors} onChange={(e) => setEmFloors(parseInt(e.target.value, 10))} placeholder="num_floors" data-full-ai-field={fullAIExamples.bind({ current: emFloors, change: (e) => setEmFloors(parseInt(e.target.value, 10)), label: "emFloors", manual: false, json: false, sample: 2 }, "p1-9414", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emR} onChange={(e) => setEmR(parseFloat(e.target.value))} placeholder="envelope_r_value" data-full-ai-field={fullAIExamples.bind({ current: emR, change: (e) => setEmR(parseFloat(e.target.value)), label: "emR", manual: false, json: false, sample: 20 }, "p1-9620", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={emHvac} onChange={(e) => setEmHvac(e.target.value)} placeholder="hvac_type" data-full-ai-field={fullAIExamples.bind({ current: emHvac, change: (e) => setEmHvac(e.target.value), label: "emHvac", manual: false, json: false, sample: 'heat pump' }, "p1-9820", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emHdd} onChange={(e) => setEmHdd(parseInt(e.target.value, 10))} placeholder="HDD" data-full-ai-field={fullAIExamples.bind({ current: emHdd, change: (e) => setEmHdd(parseInt(e.target.value, 10)), label: "emHdd", manual: false, json: false, sample: 4500 }, "p1-9993", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emCdd} onChange={(e) => setEmCdd(parseInt(e.target.value, 10))} placeholder="CDD" data-full-ai-field={fullAIExamples.bind({ current: emCdd, change: (e) => setEmCdd(parseInt(e.target.value, 10)), label: "emCdd", manual: false, json: false, sample: 800 }, "p1-10186", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emLat} onChange={(e) => setEmLat(parseFloat(e.target.value))} placeholder="latitude" data-full-ai-field={fullAIExamples.bind({ current: emLat, change: (e) => setEmLat(parseFloat(e.target.value)), label: "emLat", manual: false, json: false, sample: 40 }, "p1-10379", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emSun} onChange={(e) => setEmSun(parseFloat(e.target.value))} placeholder="sun_hours_per_day" data-full-ai-field={fullAIExamples.bind({ current: emSun, change: (e) => setEmSun(parseFloat(e.target.value)), label: "emSun", manual: false, json: false, sample: 5 }, "p1-10575", undefined)} />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/energy-model', { sq_footage: emSqft, num_floors: emFloors, envelope_r_value: emR, hvac_type: emHvac, hdd: emHdd, cdd: emCdd, latitude_deg: emLat, sun_hours_per_day: emSun }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Model'}</button>
          </Section>
        )}
        {tool === 'plugin-export' && (
          <Section title="Plugin export (JSON descriptor only)">
            <select className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={peTarget} onChange={(e) => setPeTarget(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: peTarget, change: (e) => setPeTarget(e.target.value), label: "peTarget", manual: false, json: false, sample: 'revit' }, "p1-11306", undefined)}>
              <option value="revit">Revit</option><option value="autocad">AutoCAD</option><option value="sketchup">SketchUp</option>
            </select>
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={peDesignId} onChange={(e) => setPeDesignId(e.target.value)} placeholder="design_id (optional)" data-full-ai-field={fullAIExamples.bind({ current: peDesignId, change: (e) => setPeDesignId(e.target.value), label: "peDesignId", manual: false, json: false, sample: '' }, "p1-11623", undefined)} />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/plugin-export', { target: peTarget, design_id: peDesignId ? parseInt(peDesignId, 10) : undefined }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Export'}</button>
          </Section>
        )}
        {tool === 'cad-conversion' && (
          <Section title="CAD conversion">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-20" value={ccDesc} onChange={(e) => setCcDesc(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: ccDesc, change: (e) => setCcDesc(e.target.value), label: "ccDesc", manual: false, json: false, sample: 'Floor plan: 30x40ft single-story; living room at south-east corner; kitchen north-east.' }, "p1-12240", undefined)} />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={ccUnits} onChange={(e) => setCcUnits(e.target.value)} placeholder="units" data-full-ai-field={fullAIExamples.bind({ current: ccUnits, change: (e) => setCcUnits(e.target.value), label: "ccUnits", manual: false, json: false, sample: 'feet' }, "p1-12467", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={ccFmt} onChange={(e) => setCcFmt(e.target.value)} placeholder="target_format" data-full-ai-field={fullAIExamples.bind({ current: ccFmt, change: (e) => setCcFmt(e.target.value), label: "ccFmt", manual: false, json: false, sample: 'dwg' }, "p1-12638", undefined)} />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/cad-conversion', { sketch_description: ccDesc, target_units: ccUnits, target_format: ccFmt }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Convert'}</button>
          </Section>
        )}
        {tool === 'versions' && (
          <Section title="Design versions (snapshot/list/restore)">
            <div className="flex gap-2 mb-2">
              <input className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={vDesignId} onChange={(e) => setVDesignId(e.target.value)} placeholder="design_id" data-full-ai-field={fullAIExamples.bind({ current: vDesignId, change: (e) => setVDesignId(e.target.value), label: "vDesignId", manual: false, json: false, sample: '' }, "p1-13307", undefined)} />
              <input className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={vLabel} onChange={(e) => setVLabel(e.target.value)} placeholder="label" data-full-ai-field={fullAIExamples.bind({ current: vLabel, change: (e) => setVLabel(e.target.value), label: "vLabel", manual: false, json: false, sample: 'checkpoint A' }, "p1-13493", undefined)} />
            </div>
            <div className="flex gap-2">
              <button disabled={loading || !vDesignId} onClick={() => wrap(() => api.post(`/ai/designs/${vDesignId}/versions`, { label: vLabel }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">Snapshot</button>
              <button disabled={loading || !vDesignId} onClick={() => wrap(async () => { const r = await api.get(`/ai/designs/${vDesignId}/versions`); setVList(r.data.versions); return r.data; })} className="rounded bg-slate-700 px-4 py-2 text-sm text-white">List</button>
            </div>
            {vList && (
              <div className="mt-3 text-xs text-slate-200">
                {vList.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-slate-700/40 py-1">
                    <span>#{v.id} — {v.label || '(no label)'} — {new Date(v.created_at).toLocaleString()}</span>
                    <button onClick={() => wrap(() => api.post(`/ai/designs/${vDesignId}/versions/${v.id}/restore`).then((r) => r.data))} className="rounded bg-orange-600 px-2 py-1 text-xs text-white">Restore</button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
        {tool === 'comments' && (
          <Section title="Comments + soft-lock (30 min)">
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={cmtDesignId} onChange={(e) => setCmtDesignId(e.target.value)} placeholder="design_id" data-full-ai-field={fullAIExamples.bind({ current: cmtDesignId, change: (e) => setCmtDesignId(e.target.value), label: "cmtDesignId", manual: false, json: false, sample: '' }, "p1-15039", undefined)} />
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-16" value={cmtBody} onChange={(e) => setCmtBody(e.target.value)} placeholder="comment body" data-full-ai-field={fullAIExamples.bind({ current: cmtBody, change: (e) => setCmtBody(e.target.value), label: "cmtBody", manual: false, json: false, sample: '' }, "p1-15232", undefined)} />
            <div className="flex gap-2">
              <button disabled={loading || !cmtDesignId} onClick={() => wrap(() => api.post(`/ai/designs/${cmtDesignId}/comments`, { body: cmtBody }).then((r) => r.data))} className="rounded bg-purple-600 px-3 py-2 text-xs text-white">Add comment</button>
              <button disabled={loading || !cmtDesignId} onClick={() => wrap(async () => { const r = await api.get(`/ai/designs/${cmtDesignId}/comments`); setCmtList(r.data.comments); return r.data; })} className="rounded bg-slate-700 px-3 py-2 text-xs text-white">List</button>
              <button disabled={loading || !cmtDesignId} onClick={() => wrap(() => api.post(`/ai/designs/${cmtDesignId}/lock/claim`).then((r) => r.data))} className="rounded bg-orange-600 px-3 py-2 text-xs text-white">Claim lock</button>
              <button disabled={loading || !cmtDesignId} onClick={() => wrap(() => api.post(`/ai/designs/${cmtDesignId}/lock/release`).then((r) => r.data))} className="rounded bg-slate-700 px-3 py-2 text-xs text-white">Release lock</button>
            </div>
            {cmtList && cmtList.length > 0 && (
              <div className="mt-3 text-xs text-slate-200">
                {cmtList.map((c) => (
                  <div key={c.id} className="border-b border-slate-700/40 py-1">
                    <span className="text-slate-400">[{new Date(c.created_at).toLocaleString()}] {c.author_name || `user ${c.user_id}`}:</span> {c.body}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
        {tool === 'material-library' && (
          <Section title="Material library">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="name" data-full-ai-field={fullAIExamples.bind({ current: matName, change: (e) => setMatName(e.target.value), label: "matName", manual: false, json: false, sample: 'Birch plywood' }, "p1-17142", undefined)} />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matCat} onChange={(e) => setMatCat(e.target.value)} placeholder="category" data-full-ai-field={fullAIExamples.bind({ current: matCat, change: (e) => setMatCat(e.target.value), label: "matCat", manual: false, json: false, sample: 'interior' }, "p1-17312", undefined)} />
            </div>
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matData} onChange={(e) => setMatData(e.target.value)} placeholder='data JSON e.g. {"r_value":13}' data-full-ai-field={fullAIExamples.bind({ current: matData, change: (e) => setMatData(e.target.value), label: "matData", manual: false, json: false, sample: '{"thickness_mm":18}' }, "p1-17501", undefined)} />
            <div className="flex gap-2">
              <button disabled={loading} onClick={() => {
                let parsed = {};
                try { parsed = JSON.parse(matData || '{}'); } catch (_) { setErr('Invalid JSON in data field'); return; }
                wrap(() => api.post('/ai/material-library', { name: matName, category: matCat, data: parsed }).then((r) => r.data));
              }} className="rounded bg-purple-600 px-3 py-2 text-xs text-white">Add</button>
              <button disabled={loading} onClick={() => wrap(async () => { const r = await api.get('/ai/material-library'); setMatList(r.data.items); return r.data; })} className="rounded bg-slate-700 px-3 py-2 text-xs text-white">List</button>
            </div>
            {matList && (
              <div className="mt-3 text-xs text-slate-200">
                {matList.map((m) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-slate-700/40 py-1">
                    <span>#{m.id} — {m.name} ({m.category || '—'})</span>
                    <button onClick={() => wrap(() => api.delete(`/ai/material-library/${m.id}`).then((r) => r.data))} className="text-red-400">delete</button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {err && <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 my-3">{err}</div>}
        {out && <Section title="Result"><J data={out} /></Section>}
      </div>
    </div>
  );
}
