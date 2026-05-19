import { useState } from 'react';
import Navbar from '../components/Navbar';
import FloorPlanViewer from '../components/FloorPlanViewer';
import DesignGallery from '../components/DesignGallery';
import DesignSpecPDF from '../components/DesignSpecPDF';
import CodeComplianceCheck from '../components/CodeComplianceCheck';

const TABS = [
  { id: 'floor-plan', label: 'Floor Plan Viewer', icon: '📐' },
  { id: 'gallery', label: 'Design Gallery', icon: '🖼️' },
  { id: 'pdf', label: 'Design Spec PDF', icon: '📄' },
  { id: 'compliance', label: 'Code Compliance', icon: '✅' },
];

export default function CustomViewsPage() {
  const [active, setActive] = useState('floor-plan');

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Design Views</h1>
          <p className="text-sm text-slate-400 mt-1">
            Custom architectural design tooling — floor plans, style variants, spec exports, and code compliance.
          </p>
        </header>

        {/* Sidebar-style tab nav */}
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-20 self-start">
            <nav
              className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2 backdrop-blur space-y-1"
              data-testid="design-views-sidebar"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    active === t.id
                      ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'
                  }`}
                  data-testid={`tab-${t.id}`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section data-testid="design-views-content">
            {active === 'floor-plan' && <FloorPlanViewer />}
            {active === 'gallery' && <DesignGallery />}
            {active === 'pdf' && <DesignSpecPDF />}
            {active === 'compliance' && <CodeComplianceCheck />}
          </section>
        </div>
      </div>
    </div>
  );
}
