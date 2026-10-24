import { useState } from 'react';

const CLUSTERS_CONFIG = [
  {
    id: 'QUADRATIC_TLE',
    label: 'Over SLA: O(N^2) (>400ms)',
    color: 'rose',
    bg: 'bg-rose-950/30',
    border: 'border-rose-900/60',
    hover: 'hover:bg-rose-950/50 hover:border-rose-600',
    ring: 'ring-4 ring-rose-500 border-rose-500 shadow-lg shadow-rose-950/60',
    textColor: 'text-rose-400',
    badgeBg: 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
  },
  {
    id: 'COMPILE_ERROR',
    label: 'Build Failure (Rejection Risk)',
    color: 'amber',
    bg: 'bg-amber-950/30',
    border: 'border-amber-900/60',
    hover: 'hover:bg-amber-950/50 hover:border-amber-600',
    ring: 'ring-4 ring-amber-500 border-amber-500 shadow-lg shadow-amber-950/60',
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
  },
  {
    id: 'WRONG_ANSWER',
    label: 'Output Mismatch (Rejection Risk)',
    color: 'orange',
    bg: 'bg-orange-950/30',
    border: 'border-orange-900/60',
    hover: 'hover:bg-orange-950/50 hover:border-orange-600',
    ring: 'ring-4 ring-orange-500 border-orange-500 shadow-lg shadow-orange-950/60',
    textColor: 'text-orange-400',
    badgeBg: 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
  },
  {
    id: 'OPTIMAL_ON',
    label: 'Pre-Flight Passed',
    color: 'emerald',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-900/60',
    hover: 'hover:bg-emerald-950/50 hover:border-emerald-600',
    ring: 'ring-4 ring-emerald-500 border-emerald-500 shadow-lg shadow-emerald-950/60',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
  }
];

const HINT_PRESETS = {
  QUADRATIC_TLE: [
    {
      label: 'Broadcast Sliding Window Hint',
      hintMessage:
        'Your nested loop is over the 400 ms SLA. Use a sliding window: keep a running windowSum and advance left while windowSum > K.'
    },
    {
      label: 'Shrink Window From Left',
      hintMessage:
        'Avoid resetting the inner loop on every outer iteration; subtract arr[left] and increment left inside a while (windowSum > K) loop.'
    },
    {
      label: 'Avoid Full Pairwise Scan',
      hintMessage:
        'A nested loop scans all pairwise subarrays. Since all array elements are positive, the window sum is monotonic.'
    }
  ],
  COMPILE_ERROR: [
    {
      label: 'Fix Compiler Error',
      hintMessage:
        'Build failed. Read the first compiler error line and fix it before submitting.'
    },
    {
      label: 'Verify Variable Declarations',
      hintMessage:
        'Ensure windowSum is declared as long long outside the loop and all variables are in scope before return.'
    },
    {
      label: 'Check Semicolons & Syntax',
      hintMessage:
        'Check matching braces and semicolons before the return statement.'
    }
  ],
  WRONG_ANSWER: [
    {
      label: 'Check Window Boundaries',
      hintMessage:
        'Output differs from the reference. Check the boundary when shrinking the window and the length formula right - left + 1.'
    },
    {
      label: 'Check Window Shrink Condition',
      hintMessage:
        'Check your boundary condition: shrink the window while (windowSum > K && left <= right) before updating best = max(best, right - left + 1).'
    },
    {
      label: 'Use 64-Bit Sum (long long)',
      hintMessage:
        'Accumulate windowSum in a 64-bit long long variable so large subarray sums do not overflow 32-bit int.'
    }
  ]
};

export default function ClusterBar({
  clusters,
  totalOnline,
  selectedCluster,
  onSelectCluster,
  onSendHint
}) {
  const [customHint, setCustomHint] = useState('');

  const isNonOptimalSelected = selectedCluster && selectedCluster !== 'OPTIMAL_ON';
  const selectedConfig = CLUSTERS_CONFIG.find((c) => c.id === selectedCluster);
  const selectedCount = selectedCluster ? (clusters?.[selectedCluster]?.count ?? 0) : 0;
  const selectedLabel = selectedCluster
    ? (clusters?.[selectedCluster]?.label ?? selectedConfig?.label ?? selectedCluster)
    : '';

  const emitHint = (hintMessage) => {
    if (!onSendHint || !hintMessage) return;
    onSendHint({
      targetClusterId: selectedCluster,
      targetStudentId: null,
      hintMessage
    });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customHint.trim()) return;
    emitHint(customHint.trim());
    setCustomHint('');
  };

  return (
    <div className="space-y-4">
      {/* 4 large clickable cluster cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CLUSTERS_CONFIG.map((cfg) => {
          const count = clusters?.[cfg.id]?.count ?? 0;
          const pct = totalOnline > 0 ? Math.round((count / totalOnline) * 100) : 0;
          const isSelected = selectedCluster === cfg.id;
          const dollarText =
            cfg.id === 'OPTIMAL_ON'
              ? `+$${(count * 18.5).toFixed(2)} passing`
              : `$${(count * 18.5).toFixed(2)} at risk`;

          return (
            <button
              key={cfg.id}
              type="button"
              onClick={() => onSelectCluster(isSelected ? null : cfg.id)}
              className={`text-left rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[145px] ${
                cfg.bg
              } ${isSelected ? cfg.ring : `${cfg.border} ${cfg.hover}`}`}
            >
              <div className="flex items-start justify-between w-full">
                <span className={`text-4xl md:text-5xl font-black tracking-tight ${cfg.textColor}`}>
                  {count}
                </span>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-full ${cfg.badgeBg}`}>
                    {pct}%
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      cfg.id === 'OPTIMAL_ON'
                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/60'
                        : 'bg-rose-950/90 text-rose-300 border border-rose-800/60'
                    }`}
                  >
                    {dollarText}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-base md:text-lg font-bold text-slate-100 leading-snug">
                  {clusters?.[cfg.id]?.label ?? cfg.label}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  {cfg.id.replace('_', ' ')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint Bar when a non-optimal cluster is selected */}
      {isNonOptimalSelected && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-5 md:p-6 shadow-2xl space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
              Broadcast terminal hint to {selectedCount} students: {selectedLabel}
            </div>
            <button
              type="button"
              onClick={() => onSelectCluster(null)}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 self-start sm:self-auto cursor-pointer"
            >
              ✕ Close Hint Bar
            </button>
          </div>

          {/* 3 Preset buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(HINT_PRESETS[selectedCluster] || []).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => emitHint(preset.hintMessage)}
                className="text-left rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 p-4 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    Preset {idx + 1}
                  </div>
                  <div className="text-sm md:text-base font-bold text-slate-200 group-hover:text-white leading-tight">
                    {preset.label}
                  </div>
                </div>
                <div className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                  "{preset.hintMessage}"
                </div>
              </button>
            ))}
          </div>

          {/* Custom hint input */}
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Type custom terminal hint..."
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!customHint.trim()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 text-base transition-all cursor-pointer shrink-0"
            >
              Send Hint
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
