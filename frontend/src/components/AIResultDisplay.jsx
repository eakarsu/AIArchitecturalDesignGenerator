const BORDER_COLORS = [
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-purple-500',
  'border-l-orange-500',
  'border-l-teal-500',
  'border-l-pink-500',
  'border-l-yellow-500',
  'border-l-indigo-500',
  'border-l-cyan-500',
  'border-l-rose-500',
];

const SECTION_ICONS = {
  summary: '📋',
  overview: '🔍',
  recommendations: '💡',
  analysis: '📊',
  specifications: '📐',
  materials: '🧱',
  cost: '💰',
  costs: '💰',
  energy: '⚡',
  sustainability: '🌿',
  compliance: '✅',
  structural: '🏗️',
  lighting: '💡',
  hvac: '🌡️',
  interior: '🎨',
  floor: '📐',
  site: '🗺️',
  design: '✏️',
  performance: '📈',
  notes: '📝',
  warnings: '⚠️',
  default: '📌',
};

function getIcon(key) {
  const k = key.toLowerCase();
  for (const [keyword, icon] of Object.entries(SECTION_ICONS)) {
    if (k.includes(keyword)) return icon;
  }
  return SECTION_ICONS.default;
}

function formatKey(key) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPercentage(val) {
  if (typeof val === 'string') return /%$/.test(val.trim());
  if (typeof val === 'number') return val >= 0 && val <= 100;
  return false;
}

function getPercentValue(val) {
  if (typeof val === 'number') return val;
  return parseFloat(val) || 0;
}

function formatNumber(val) {
  if (typeof val !== 'number') return val;
  if (Number.isInteger(val)) return val.toLocaleString();
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function RenderValue({ value, depth = 0 }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-500 italic">N/A</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-400' : 'text-red-400'}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="font-mono text-blue-300">{formatNumber(value)}</span>;
  }

  if (typeof value === 'string') {
    if (isPercentage(value)) {
      const pct = getPercentValue(value);
      return (
        <div className="flex items-center gap-3">
          <span className="font-mono text-blue-300">{value}</span>
          <div className="mini-progress flex-1 max-w-[120px]">
            <div className="mini-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      );
    }
    return <span className="text-slate-200">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-500 italic">None</span>;

    // If array of primitives
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return (
        <ul className="mt-1 space-y-1 pl-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <RenderValue value={item} depth={depth + 1} />
            </li>
          ))}
        </ul>
      );
    }

    // Array of objects
    return (
      <div className="mt-2 space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-3">
            <RenderValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className={`${depth > 0 ? 'mt-1' : 'mt-2'} space-y-2`}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex flex-col sm:flex-row sm:gap-3">
            <span className="shrink-0 text-sm font-medium text-slate-400 sm:w-40">
              {formatKey(k)}:
            </span>
            <div className="flex-1">
              <RenderValue value={v} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-200">{String(value)}</span>;
}

export default function AIResultDisplay({ result }) {
  if (!result || typeof result !== 'object') return null;

  // If result is wrapped in a data key
  const data = result.data || result;

  const entries = Object.entries(data).filter(
    ([k]) => !['id', '_id', 'createdAt', 'updatedAt', '__v'].includes(k)
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center text-slate-400">
        No analysis data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value], index) => (
        <div
          key={key}
          className={`ai-section border-l-4 ${BORDER_COLORS[index % BORDER_COLORS.length]}`}
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            <span>{getIcon(key)}</span>
            {formatKey(key)}
          </h3>
          <div className="text-sm leading-relaxed">
            <RenderValue value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}
