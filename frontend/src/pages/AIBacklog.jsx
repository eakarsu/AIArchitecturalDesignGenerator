// Apply pass 5 — backlog tool surface for AIArchitecturalDesignGenerator
// Surfaces the 10 endpoints in /api/ai/* added in routes/aiBacklog.js.
import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';

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
  return (
    <pre className="mt-2 max-h-96 overflow-auto rounded bg-slate-900/70 p-3 text-xs text-slate-200">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AIBacklog() {
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
    <>
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
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={psQuery} onChange={(e) => setPsQuery(e.target.value)} placeholder="query" />
            <input className="w-32 mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={psTopN} onChange={(e) => setPsTopN(parseInt(e.target.value || '5', 10))} placeholder="top_n" />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/precedent-search', { query: psQuery, top_n: psTopN }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">
              {loading ? '…' : 'Search'}
            </button>
          </Section>
        )}
        {tool === 'design-to-bim' && (
          <Section title="Design -> BIM JSON descriptor">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-24" value={bimSummary} onChange={(e) => setBimSummary(e.target.value)} placeholder="design summary" />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/design-to-bim', { design_summary: bimSummary }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Generate BIM'}</button>
          </Section>
        )}
        {tool === 'render-spec' && (
          <Section title="Render spec">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-20" value={rsSummary} onChange={(e) => setRsSummary(e.target.value)} />
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={rsView} onChange={(e) => setRsView(e.target.value)} placeholder="view" />
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={rsMood} onChange={(e) => setRsMood(e.target.value)} placeholder="lighting mood" />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/render-spec', { design_summary: rsSummary, view: rsView, lighting_mood: rsMood }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Generate'}</button>
          </Section>
        )}
        {tool === 'structural-advisor' && (
          <Section title="Structural advisor">
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saType} onChange={(e) => setSaType(e.target.value)} placeholder="project_type" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={saSpan} onChange={(e) => setSaSpan(parseFloat(e.target.value))} placeholder="span_m" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={saFloors} onChange={(e) => setSaFloors(parseInt(e.target.value, 10))} placeholder="num_floors" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saSeismic} onChange={(e) => setSaSeismic(e.target.value)} placeholder="seismic_zone" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={saSoil} onChange={(e) => setSaSoil(e.target.value)} placeholder="soil_type" />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/structural-advisor', { project_type: saType, span_m: saSpan, num_floors: saFloors, seismic_zone: saSeismic, soil_type: saSoil }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Advise'}</button>
          </Section>
        )}
        {tool === 'energy-model' && (
          <Section title="Energy model (you supply climate inputs)">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emSqft} onChange={(e) => setEmSqft(parseFloat(e.target.value))} placeholder="sq_footage" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emFloors} onChange={(e) => setEmFloors(parseInt(e.target.value, 10))} placeholder="num_floors" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emR} onChange={(e) => setEmR(parseFloat(e.target.value))} placeholder="envelope_r_value" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={emHvac} onChange={(e) => setEmHvac(e.target.value)} placeholder="hvac_type" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emHdd} onChange={(e) => setEmHdd(parseInt(e.target.value, 10))} placeholder="HDD" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emCdd} onChange={(e) => setEmCdd(parseInt(e.target.value, 10))} placeholder="CDD" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emLat} onChange={(e) => setEmLat(parseFloat(e.target.value))} placeholder="latitude" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" type="number" value={emSun} onChange={(e) => setEmSun(parseFloat(e.target.value))} placeholder="sun_hours_per_day" />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/energy-model', { sq_footage: emSqft, num_floors: emFloors, envelope_r_value: emR, hvac_type: emHvac, hdd: emHdd, cdd: emCdd, latitude_deg: emLat, sun_hours_per_day: emSun }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Model'}</button>
          </Section>
        )}
        {tool === 'plugin-export' && (
          <Section title="Plugin export (JSON descriptor only)">
            <select className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={peTarget} onChange={(e) => setPeTarget(e.target.value)}>
              <option value="revit">Revit</option><option value="autocad">AutoCAD</option><option value="sketchup">SketchUp</option>
            </select>
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={peDesignId} onChange={(e) => setPeDesignId(e.target.value)} placeholder="design_id (optional)" />
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/plugin-export', { target: peTarget, design_id: peDesignId ? parseInt(peDesignId, 10) : undefined }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Export'}</button>
          </Section>
        )}
        {tool === 'cad-conversion' && (
          <Section title="CAD conversion">
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-20" value={ccDesc} onChange={(e) => setCcDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={ccUnits} onChange={(e) => setCcUnits(e.target.value)} placeholder="units" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={ccFmt} onChange={(e) => setCcFmt(e.target.value)} placeholder="target_format" />
            </div>
            <button disabled={loading} onClick={() => wrap(() => api.post('/ai/cad-conversion', { sketch_description: ccDesc, target_units: ccUnits, target_format: ccFmt }).then((r) => r.data))} className="rounded bg-purple-600 px-4 py-2 text-sm text-white">{loading ? '…' : 'Convert'}</button>
          </Section>
        )}
        {tool === 'versions' && (
          <Section title="Design versions (snapshot/list/restore)">
            <div className="flex gap-2 mb-2">
              <input className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={vDesignId} onChange={(e) => setVDesignId(e.target.value)} placeholder="design_id" />
              <input className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={vLabel} onChange={(e) => setVLabel(e.target.value)} placeholder="label" />
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
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={cmtDesignId} onChange={(e) => setCmtDesignId(e.target.value)} placeholder="design_id" />
            <textarea className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 h-16" value={cmtBody} onChange={(e) => setCmtBody(e.target.value)} placeholder="comment body" />
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
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="name" />
              <input className="rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matCat} onChange={(e) => setMatCat(e.target.value)} placeholder="category" />
            </div>
            <input className="w-full mb-2 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100" value={matData} onChange={(e) => setMatData(e.target.value)} placeholder='data JSON e.g. {"r_value":13}' />
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
    </>
  );
}
