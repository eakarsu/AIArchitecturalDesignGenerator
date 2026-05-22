import { useEffect, useState } from 'react';

export default function PermitSetReadiness() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/permit-set-readiness')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <h1 className="text-3xl font-bold mb-2">Permit Set Readiness</h1>
      <p className="text-slate-300 mb-6">Check architectural drawing sets for jurisdiction, code, and sheet completeness.</p>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {data && Object.entries(data.summary).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-slate-800 p-4">
            <div className="text-xs uppercase text-slate-400">{key.replaceAll('_', ' ')}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-slate-800">
        {(data?.sets || []).map((set) => (
          <div key={set.project} className="border-b border-slate-700 p-4">
            <strong>{set.project}</strong>
            <div>{set.jurisdiction} - {set.readiness}% ready - {set.status}</div>
            <div className="text-sm text-slate-400">{set.blockers.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
